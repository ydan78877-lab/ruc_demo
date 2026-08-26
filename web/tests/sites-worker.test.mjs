import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { access } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import worker from "../worker/index.js";

class D1Statement {
  constructor(database, sql, parameters = []) {
    this.database = database;
    this.sql = sql;
    this.parameters = parameters;
  }

  bind(...parameters) {
    return new D1Statement(this.database, this.sql, parameters);
  }

  async run() {
    const result = this.database.prepare(this.sql).run(...this.parameters);
    return { success: true, meta: { changes: Number(result.changes) } };
  }

  async first() {
    return this.database.prepare(this.sql).get(...this.parameters) ?? null;
  }

  async all() {
    return { success: true, results: this.database.prepare(this.sql).all(...this.parameters) };
  }
}

function createD1() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  for (const migration of ["0000_multi_user_accounts.sql", "0001_one_primary_template.sql"]) {
    const sql = readFileSync(new URL(`../drizzle/${migration}`, import.meta.url), "utf8");
    for (const statement of sql.split("--> statement-breakpoint").map((item) => item.trim()).filter(Boolean)) {
      database.exec(statement);
    }
  }
  return {
    prepare(sql) {
      return new D1Statement(database, sql);
    },
    async batch(statements) {
      const results = [];
      database.exec("BEGIN");
      try {
        for (const statement of statements) results.push(await statement.run());
        database.exec("COMMIT");
        return results;
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

function authHeaders(id, email = `${id}@example.com`) {
  return {
    "content-type": "application/json",
    "oai-authenticated-user-id": id,
    "oai-authenticated-user-email": email,
  };
}

function apiRequest(path, { id, email, method = "GET", body } = {}) {
  return new Request(`https://example.test${path}`, {
    method,
    headers: id ? authHeaders(id, email) : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("serves existing static assets without a fallback", async () => {
  const calls = [];
  const response = await worker.fetch(new Request("https://example.test/assets/app.js"), {
    ASSETS: {
      fetch: async (request) => {
        calls.push(new URL(request.url).pathname);
        return new Response("asset", { status: 200 });
      },
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["/assets/app.js"]);
});

test("falls back to index.html for an unknown app route", async () => {
  const calls = [];
  const response = await worker.fetch(
    new Request("https://example.test/flow/step-two?source=share", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async (request) => {
          const url = new URL(request.url);
          calls.push(url.pathname + url.search);
          return new Response(url.pathname === "/index.html" ? "app" : "missing", {
            status: url.pathname === "/index.html" ? 200 : 404,
          });
        },
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["/flow/step-two?source=share", "/index.html"]);
});

test("does not turn missing API or write requests into the app shell", async () => {
  for (const request of [
    new Request("https://example.test/api/missing", { headers: { accept: "application/json" } }),
    new Request("https://example.test/flow", { method: "POST", headers: { accept: "text/html" } }),
  ]) {
    let calls = 0;
    const response = await worker.fetch(request, {
      DB: createD1(),
      ASSETS: {
        fetch: async () => {
          calls += 1;
          return new Response("missing", { status: 404 });
        },
      },
    });

    assert.notEqual(response.status, 200);
    assert.equal(calls, request.url.includes("/api/") ? 0 : 1);
  }
});

test("creates an isolated student account and migrates its first profile and template", async () => {
  const DB = createD1();
  const env = { DB, ASSETS: { fetch: async () => new Response("missing", { status: 404 }) } };

  const anonymous = await worker.fetch(apiRequest("/api/bootstrap"), env);
  assert.equal(anonymous.status, 401);

  const initial = await worker.fetch(apiRequest("/api/bootstrap", { id: "student-a" }), env);
  assert.equal(initial.status, 200);
  const initialData = await initial.json();
  assert.equal(initialData.account.id, "student-a");
  assert.equal(initialData.profile, null);
  assert.deepEqual(initialData.templates, []);

  const imported = await worker.fetch(apiRequest("/api/bootstrap/import", {
    id: "student-a",
    method: "POST",
    body: {
      profile: { name: "林知夏", experiences: [] },
      template: { id: "legacy", title: "25中法保研", primary: true, pages: [] },
    },
  }), env);
  assert.equal(imported.status, 200);
  const importedData = await imported.json();
  assert.equal(importedData.profile.name, "林知夏");
  assert.equal(importedData.templates.length, 1);
  assert.equal(importedData.templates[0].primary, true);
  assert.equal(importedData.templates[0].ownerUserId, "student-a");

  const other = await worker.fetch(apiRequest("/api/bootstrap", { id: "student-b" }), env);
  const otherData = await other.json();
  assert.equal(otherData.profile, null);
  assert.deepEqual(otherData.templates, []);
});

test("publishes a template to the library and installs an owned copy for another student", async () => {
  const DB = createD1();
  const env = { DB, ASSETS: { fetch: async () => new Response("missing", { status: 404 }) } };
  const template = { id: "legacy", title: "25中法保研", primary: true, pages: [] };

  const ownerImport = await worker.fetch(apiRequest("/api/bootstrap/import", {
    id: "owner",
    method: "POST",
    body: { profile: { name: "模板作者", experiences: [] }, template },
  }), env);
  const ownerData = await ownerImport.json();
  const sourceId = ownerData.templates[0].id;

  const published = await worker.fetch(apiRequest(`/api/templates/${encodeURIComponent(sourceId)}/publish`, {
    id: "owner",
    method: "POST",
    body: {},
  }), env);
  assert.equal(published.status, 200);
  const publishedData = await published.json();
  assert.equal(publishedData.template.visibility, "library");
  assert.ok(publishedData.template.shareCode);

  const library = await worker.fetch(apiRequest("/api/templates/library"), env);
  const libraryData = await library.json();
  assert.equal(libraryData.templates[0].id, sourceId);

  const installed = await worker.fetch(apiRequest(`/api/templates/${encodeURIComponent(sourceId)}/install`, {
    id: "student-b",
    method: "POST",
    body: {},
  }), env);
  assert.equal(installed.status, 201);
  const installedData = await installed.json();
  assert.notEqual(installedData.template.id, sourceId);
  assert.equal(installedData.template.ownerUserId, "student-b");
  assert.equal(installedData.template.sourceTemplateId, sourceId);

  const forbidden = await worker.fetch(apiRequest(`/api/templates/${encodeURIComponent(sourceId)}`, {
    id: "student-b",
    method: "PUT",
    body: { template: { ...template, title: "越权修改" } },
  }), env);
  assert.equal(forbidden.status, 404);
});

test("shares an unlisted template without exposing private templates", async () => {
  const DB = createD1();
  const env = { DB, ASSETS: { fetch: async () => new Response("missing", { status: 404 }) } };
  const template = { id: "legacy", title: "美国申请", primary: true, pages: [] };
  const ownerImport = await worker.fetch(apiRequest("/api/bootstrap/import", {
    id: "owner",
    method: "POST",
    body: { profile: { name: "作者", experiences: [] }, template },
  }), env);
  const ownerData = await ownerImport.json();
  const templateId = ownerData.templates[0].id;

  const privateLibrary = await worker.fetch(apiRequest("/api/templates/library"), env);
  assert.deepEqual((await privateLibrary.json()).templates, []);

  const shared = await worker.fetch(apiRequest(`/api/templates/${templateId}/share`, {
    id: "owner",
    method: "POST",
    body: {},
  }), env);
  const sharedData = await shared.json();
  assert.equal(sharedData.template.visibility, "unlisted");
  assert.ok(sharedData.template.shareCode);

  const publicRead = await worker.fetch(apiRequest(`/api/templates/shared/${sharedData.template.shareCode}`), env);
  assert.equal(publicRead.status, 200);
  assert.equal((await publicRead.json()).template.title, "美国申请");

  const installed = await worker.fetch(apiRequest(`/api/templates/shared/${sharedData.template.shareCode}/install`, {
    id: "recipient",
    method: "POST",
    body: {},
  }), env);
  assert.equal(installed.status, 201);
  const installedData = await installed.json();
  assert.equal(installedData.template.ownerUserId, "recipient");
  assert.equal(installedData.template.sourceTemplateId, templateId);

  const library = await worker.fetch(apiRequest("/api/templates/library"), env);
  assert.deepEqual((await library.json()).templates, []);
});

test("persists profile edits, template edits, and one primary template per account", async () => {
  const DB = createD1();
  const env = { DB, ASSETS: { fetch: async () => new Response("missing", { status: 404 }) } };
  const firstTemplate = { id: "legacy", title: "25中法保研", primary: true, pages: [] };
  const imported = await worker.fetch(apiRequest("/api/bootstrap/import", {
    id: "student-a",
    method: "POST",
    body: { profile: { name: "林知夏", gpa: 3.5, experiences: [] }, template: firstTemplate },
  }), env);
  const importedData = await imported.json();
  const firstId = importedData.templates[0].id;

  const profileUpdate = await worker.fetch(apiRequest("/api/profile", {
    id: "student-a",
    method: "PUT",
    body: { profile: { name: "林知夏", gpa: 3.81, experiences: [] } },
  }), env);
  assert.equal(profileUpdate.status, 200);

  const created = await worker.fetch(apiRequest("/api/templates", {
    id: "student-a",
    method: "POST",
    body: { template: { id: "copy", title: "美国申请", primary: false, pages: [] } },
  }), env);
  const createdData = await created.json();
  const secondId = createdData.template.id;
  const updated = await worker.fetch(apiRequest(`/api/templates/${secondId}`, {
    id: "student-a",
    method: "PUT",
    body: { template: { id: secondId, title: "美国申请 2028", primary: false, pages: [] } },
  }), env);
  assert.equal((await updated.json()).template.title, "美国申请 2028");

  const primary = await worker.fetch(apiRequest(`/api/templates/${secondId}/primary`, {
    id: "student-a",
    method: "POST",
    body: {},
  }), env);
  assert.equal(primary.status, 200);

  const bootstrap = await worker.fetch(apiRequest("/api/bootstrap", { id: "student-a" }), env);
  const data = await bootstrap.json();
  assert.equal(data.profile.gpa, 3.81);
  assert.equal(data.templates.find((item) => item.id === secondId).primary, true);
  assert.equal(data.templates.find((item) => item.id === firstId).primary, false);
  assert.equal(data.templates.filter((item) => item.primary).length, 1);
});

test("requires authentication and same-origin writes", async () => {
  const DB = createD1();
  const env = { DB, ASSETS: { fetch: async () => new Response("missing", { status: 404 }) } };
  const anonymous = await worker.fetch(apiRequest("/api/profile", {
    method: "PUT",
    body: { profile: { name: "匿名" } },
  }), env);
  assert.equal(anonymous.status, 401);

  const crossOrigin = await worker.fetch(new Request("https://example.test/api/profile", {
    method: "PUT",
    headers: { ...authHeaders("student-a"), origin: "https://attacker.test" },
    body: JSON.stringify({ profile: { name: "越权" } }),
  }), env);
  assert.equal(crossOrigin.status, 403);
});

test("emits the files required by Sites packaging", async () => {
  await access(new URL("../dist/client/index.html", import.meta.url));
  await access(new URL("../dist/server/index.js", import.meta.url));
  await access(new URL("../dist/.openai/hosting.json", import.meta.url));
  await access(new URL("../drizzle/0000_multi_user_accounts.sql", import.meta.url));
  await access(new URL("../drizzle/0001_one_primary_template.sql", import.meta.url));
});
