const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

function decodeDisplayName(request) {
  const value = request.headers.get("oai-authenticated-user-full-name");
  if (!value || request.headers.get("oai-authenticated-user-full-name-encoding") !== "percent-encoded-utf-8") return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

function authenticatedUser(request) {
  const id = request.headers.get("oai-authenticated-user-id")?.trim();
  if (!id) return null;
  const email = request.headers.get("oai-authenticated-user-email")?.trim() || "";
  return { id, email, displayName: decodeDisplayName(request) || email.split("@")[0] || "学生" };
}

function requireDatabase(env) {
  if (!env.DB?.prepare) throw new Error("D1 binding DB is unavailable");
  return env.DB;
}

function requireSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

async function readBody(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 1_000_000) throw new Error("PAYLOAD_TOO_LARGE");
  const body = await request.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("INVALID_BODY");
  return body;
}

function encodeDocument(value, kind) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`INVALID_${kind.toUpperCase()}`);
  if (kind === "template" && (!Array.isArray(value.pages) || typeof value.title !== "string")) throw new Error("INVALID_TEMPLATE");
  const jsonValue = JSON.stringify(value);
  if (jsonValue.length > 750_000) throw new Error("PAYLOAD_TOO_LARGE");
  return jsonValue;
}

function parseDocument(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function templateFromRow(row) {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    ownerName: row.owner_name || "",
    title: row.title,
    description: row.description || "",
    visibility: row.visibility,
    shareCode: row.share_code || null,
    sourceTemplateId: row.source_template_id || null,
    primary: Boolean(row.is_primary),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at || null,
    data: parseDocument(row.data_json),
  };
}

function libraryItemFromRow(row) {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    ownerName: row.owner_name || "学生创作者",
    title: row.title,
    description: row.description || "",
    shareCode: row.share_code || null,
    publishedAt: row.published_at,
  };
}

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function createShareCode() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 16);
}

async function ensureUser(db, user) {
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO users (id, email, display_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      display_name = CASE WHEN excluded.display_name != '' THEN excluded.display_name ELSE users.display_name END,
      updated_at = excluded.updated_at
  `).bind(user.id, user.email, user.displayName, now, now).run();
  return db.prepare("SELECT id, email, display_name, created_at, updated_at FROM users WHERE id = ?")
    .bind(user.id).first();
}

async function readLibrary(db) {
  const result = await db.prepare(`
    SELECT t.id, t.owner_user_id, t.title, t.description, t.share_code, t.published_at,
           u.display_name AS owner_name
    FROM templates t
    JOIN users u ON u.id = t.owner_user_id
    WHERE t.visibility = 'library'
    ORDER BY t.published_at DESC, t.updated_at DESC
    LIMIT 60
  `).all();
  return (result.results || []).map(libraryItemFromRow);
}

async function readBootstrap(db, user) {
  const account = await ensureUser(db, user);
  const profile = await db.prepare("SELECT data_json, updated_at FROM profiles WHERE user_id = ?")
    .bind(user.id).first();
  const templateRows = await db.prepare(`
    SELECT t.*, ut.is_primary, u.display_name AS owner_name
    FROM user_templates ut
    JOIN templates t ON t.id = ut.template_id
    JOIN users u ON u.id = t.owner_user_id
    WHERE ut.user_id = ?
    ORDER BY ut.is_primary DESC, ut.installed_at DESC
  `).bind(user.id).all();
  return {
    account: {
      id: account.id,
      email: account.email,
      displayName: account.display_name || account.email || "学生",
      createdAt: account.created_at,
    },
    profile: profile ? parseDocument(profile.data_json) : null,
    templates: (templateRows.results || []).map(templateFromRow),
    library: await readLibrary(db),
  };
}

async function importBootstrap(db, user, body) {
  await ensureUser(db, user);
  const now = new Date().toISOString();
  const existingProfile = await db.prepare("SELECT user_id FROM profiles WHERE user_id = ?").bind(user.id).first();
  const existingTemplate = await db.prepare("SELECT template_id FROM user_templates WHERE user_id = ? LIMIT 1").bind(user.id).first();
  const statements = [];

  if (!existingProfile && body.profile) {
    statements.push(db.prepare("INSERT INTO profiles (user_id, data_json, updated_at) VALUES (?, ?, ?)")
      .bind(user.id, encodeDocument(body.profile, "profile"), now));
  }

  if (!existingTemplate && body.template) {
    const templateId = createId("tpl");
    const templateData = { ...body.template, id: templateId, primary: true };
    statements.push(db.prepare(`
      INSERT INTO templates
        (id, owner_user_id, title, description, data_json, visibility, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'private', ?, ?)
    `).bind(
      templateId,
      user.id,
      String(templateData.title || "25中法保研"),
      String(body.description || ""),
      encodeDocument(templateData, "template"),
      now,
      now,
    ));
    statements.push(db.prepare("INSERT INTO user_templates (user_id, template_id, is_primary, installed_at) VALUES (?, ?, 1, ?)")
      .bind(user.id, templateId, now));
  }

  if (statements.length) await db.batch(statements);
  return readBootstrap(db, user);
}

async function saveProfile(db, user, body) {
  const now = new Date().toISOString();
  const profileJson = encodeDocument(body.profile, "profile");
  await db.prepare(`
    INSERT INTO profiles (user_id, data_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
  `).bind(user.id, profileJson, now).run();
  return { profile: body.profile, updatedAt: now };
}

async function createPersonalTemplate(db, user, body) {
  const now = new Date().toISOString();
  const id = createId("tpl");
  const templateData = { ...body.template, id, primary: false };
  const title = String(body.title || templateData.title || "未命名模版").trim() || "未命名模版";
  const count = await db.prepare("SELECT COUNT(*) AS count FROM user_templates WHERE user_id = ?").bind(user.id).first();
  const isPrimary = Number(count?.count || 0) === 0 ? 1 : 0;
  if (isPrimary) templateData.primary = true;

  await db.batch([
    db.prepare(`
      INSERT INTO templates
        (id, owner_user_id, title, description, data_json, visibility, source_template_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'private', ?, ?, ?)
    `).bind(
      id,
      user.id,
      title,
      String(body.description || ""),
      encodeDocument(templateData, "template"),
      body.sourceTemplateId || null,
      now,
      now,
    ),
    db.prepare("INSERT INTO user_templates (user_id, template_id, is_primary, installed_at) VALUES (?, ?, ?, ?)")
      .bind(user.id, id, isPrimary, now),
  ]);
  const row = await db.prepare("SELECT t.*, ut.is_primary, u.display_name AS owner_name FROM templates t JOIN user_templates ut ON ut.template_id = t.id JOIN users u ON u.id = t.owner_user_id WHERE t.id = ? AND ut.user_id = ?")
    .bind(id, user.id).first();
  return templateFromRow(row);
}

async function requireOwnedTemplate(db, userId, templateId) {
  return db.prepare("SELECT * FROM templates WHERE id = ? AND owner_user_id = ?")
    .bind(templateId, userId).first();
}

async function updateTemplate(db, user, templateId, body) {
  const existing = await requireOwnedTemplate(db, user.id, templateId);
  if (!existing) return null;
  const now = new Date().toISOString();
  const templateData = { ...body.template, id: templateId };
  await db.prepare(`
    UPDATE templates
    SET title = ?, description = ?, data_json = ?, updated_at = ?
    WHERE id = ? AND owner_user_id = ?
  `).bind(
    String(body.title || templateData.title || existing.title).trim() || existing.title,
    String(body.description ?? existing.description ?? ""),
    encodeDocument(templateData, "template"),
    now,
    templateId,
    user.id,
  ).run();
  const row = await db.prepare("SELECT t.*, ut.is_primary, u.display_name AS owner_name FROM templates t JOIN user_templates ut ON ut.template_id = t.id JOIN users u ON u.id = t.owner_user_id WHERE t.id = ? AND ut.user_id = ?")
    .bind(templateId, user.id).first();
  return templateFromRow(row);
}

async function publishTemplate(db, user, templateId, library) {
  const existing = await requireOwnedTemplate(db, user.id, templateId);
  if (!existing) return null;
  const now = new Date().toISOString();
  const shareCode = existing.share_code || createShareCode();
  const visibility = library ? "library" : existing.visibility === "library" ? "library" : "unlisted";
  await db.prepare(`
    UPDATE templates
    SET visibility = ?, share_code = ?, published_at = COALESCE(published_at, ?), updated_at = ?
    WHERE id = ? AND owner_user_id = ?
  `).bind(visibility, shareCode, now, now, templateId, user.id).run();
  return { id: templateId, visibility, shareCode, publishedAt: existing.published_at || now };
}

async function setPrimaryTemplate(db, user, templateId) {
  const assignment = await db.prepare("SELECT template_id FROM user_templates WHERE user_id = ? AND template_id = ?")
    .bind(user.id, templateId).first();
  if (!assignment) return false;
  await db.batch([
    db.prepare("UPDATE user_templates SET is_primary = 0 WHERE user_id = ? AND is_primary = 1").bind(user.id),
    db.prepare("UPDATE user_templates SET is_primary = 1 WHERE user_id = ? AND template_id = ?").bind(user.id, templateId),
  ]);
  return true;
}

async function installTemplate(db, user, source) {
  const data = parseDocument(source.data_json);
  if (!data) throw new Error("INVALID_TEMPLATE");
  return createPersonalTemplate(db, user, {
    template: { ...data, primary: false },
    title: source.title,
    description: source.description,
    sourceTemplateId: source.id,
  });
}

async function handleApi(request, env) {
  const db = requireDatabase(env);
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();
  const user = authenticatedUser(request);

  if (!["GET", "HEAD"].includes(method) && !requireSameOrigin(request)) {
    return json({ error: "跨站请求已拒绝" }, { status: 403 });
  }

  if (method === "GET" && path === "/api/session") {
    if (!user) return json({ authenticated: false }, { status: 401 });
    const account = await ensureUser(db, user);
    return json({ authenticated: true, account: { id: account.id, email: account.email, displayName: account.display_name || account.email } });
  }

  if (method === "GET" && path === "/api/templates/library") {
    return json({ templates: await readLibrary(db) });
  }

  const sharedMatch = path.match(/^\/api\/templates\/shared\/([a-zA-Z0-9_-]+)$/);
  if (method === "GET" && sharedMatch) {
    const row = await db.prepare(`
      SELECT t.*, u.display_name AS owner_name
      FROM templates t JOIN users u ON u.id = t.owner_user_id
      WHERE t.share_code = ? AND t.visibility IN ('unlisted', 'library')
    `).bind(sharedMatch[1]).first();
    if (!row) return json({ error: "分享的模版不存在" }, { status: 404 });
    return json({ template: templateFromRow(row) });
  }

  if (!user) return json({ error: "请先注册或登录" }, { status: 401 });
  await ensureUser(db, user);

  if (method === "GET" && path === "/api/bootstrap") {
    return json(await readBootstrap(db, user));
  }

  if (method === "POST" && path === "/api/bootstrap/import") {
    return json(await importBootstrap(db, user, await readBody(request)));
  }

  if (method === "PUT" && path === "/api/profile") {
    return json(await saveProfile(db, user, await readBody(request)));
  }

  if (method === "POST" && path === "/api/templates") {
    return json({ template: await createPersonalTemplate(db, user, await readBody(request)) }, { status: 201 });
  }

  const sharedInstallMatch = path.match(/^\/api\/templates\/shared\/([a-zA-Z0-9_-]+)\/install$/);
  if (method === "POST" && sharedInstallMatch) {
    const source = await db.prepare("SELECT * FROM templates WHERE share_code = ? AND visibility IN ('unlisted', 'library')")
      .bind(sharedInstallMatch[1]).first();
    return source
      ? json({ template: await installTemplate(db, user, source) }, { status: 201 })
      : json({ error: "分享的模版不存在" }, { status: 404 });
  }

  const templateMatch = path.match(/^\/api\/templates\/([^/]+)(?:\/(publish|share|primary|install))?$/);
  if (templateMatch) {
    const templateId = decodeURIComponent(templateMatch[1]);
    const action = templateMatch[2] || "";

    if (method === "PUT" && !action) {
      const template = await updateTemplate(db, user, templateId, await readBody(request));
      return template ? json({ template }) : json({ error: "没有权限修改这个模版" }, { status: 404 });
    }

    if (method === "POST" && action === "publish") {
      const published = await publishTemplate(db, user, templateId, true);
      return published ? json({ template: published }) : json({ error: "没有权限发布这个模版" }, { status: 404 });
    }

    if (method === "POST" && action === "share") {
      const shared = await publishTemplate(db, user, templateId, false);
      return shared ? json({ template: shared }) : json({ error: "没有权限分享这个模版" }, { status: 404 });
    }

    if (method === "POST" && action === "primary") {
      return await setPrimaryTemplate(db, user, templateId)
        ? json({ primaryTemplateId: templateId })
        : json({ error: "这个模版不在你的账号中" }, { status: 404 });
    }

    if (method === "POST" && action === "install") {
      const source = await db.prepare("SELECT * FROM templates WHERE id = ? AND visibility = 'library'").bind(templateId).first();
      return source
        ? json({ template: await installTemplate(db, user, source) }, { status: 201 })
        : json({ error: "模版不存在或尚未发布" }, { status: 404 });
    }
  }

  return json({ error: "接口不存在" }, { status: 404 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env);
      } catch (error) {
        const code = error instanceof Error ? error.message : "UNKNOWN";
        if (code === "PAYLOAD_TOO_LARGE") return json({ error: "提交内容过大" }, { status: 413 });
        if (code.startsWith("INVALID_")) return json({ error: "提交内容格式不正确" }, { status: 400 });
        console.error("API request failed", code);
        return json({ error: "服务暂时不可用，请稍后重试" }, { status: 500 });
      }
    }

    const response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");

    if (response.status !== 404 || !acceptsHtml || !["GET", "HEAD"].includes(request.method)) {
      return response;
    }

    const indexUrl = new URL(request.url);
    indexUrl.pathname = "/index.html";
    indexUrl.search = "";
    return env.ASSETS.fetch(new Request(indexUrl, request));
  },
};
