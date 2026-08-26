import { expect, test, type Page, type Route } from "@playwright/test";

const profile = {
  name: "林知夏",
  major: "金融学",
  cohort: "2025级",
  gpa: 3.81,
  politicalTheoryQualified: true,
  coreRank: 7,
  graduationChecks: {},
  experiences: [],
  dataVersion: 5,
};

function template(id: string, title: string, primary = false) {
  return {
    id,
    title,
    primary,
    pages: [
      { id: "graduation", tabLabel: "毕业条件", title: "毕业条件", description: "", visible: true, branches: [], graduationModules: [], checklist: [], checklistVersion: 4 },
      { id: "qualification", tabLabel: "推免资格获取", title: "推免资格获取", description: "", visible: true, branches: [] },
      { id: "competitiveness", tabLabel: "我的简历", title: "我的简历", description: "", visible: true, branches: [] },
    ],
  };
}

function accountTemplate(id: string, title: string, primary = false) {
  return {
    id,
    ownerUserId: "student-a",
    ownerName: "林知夏",
    title,
    description: "升学准备路径",
    visibility: "private" as const,
    shareCode: null,
    sourceTemplateId: null,
    primary,
    createdAt: "2026-08-20T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
    publishedAt: null,
    data: template(id, title, primary),
  };
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function mockAuthenticatedAccount(page: Page, requests: string[]) {
  const primary = accountTemplate("tpl-primary", "25中法保研", true);
  const alternate = accountTemplate("tpl-us", "美国申请");
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    requests.push(`${request.method()} ${path}`);

    if (path === "/api/bootstrap") {
      await json(route, {
        account: { id: "student-a", email: "student@example.com", displayName: "林知夏" },
        profile,
        templates: [primary, alternate],
        library: [{ id: "tpl-library", ownerUserId: "student-b", ownerName: "模版作者", title: "英港申请", description: "申请准备路径", shareCode: "share123", publishedAt: "2026-08-20T00:00:00.000Z" }],
      });
      return;
    }
    if (path === "/api/templates/tpl-library/install") {
      await json(route, { template: accountTemplate("tpl-installed", "英港申请") }, 201);
      return;
    }
    if (path === "/api/templates" && request.method() === "POST") {
      await json(route, { template: accountTemplate("tpl-copy", "美国申请 副本") }, 201);
      return;
    }
    if (path === "/api/templates/tpl-copy/publish") {
      await json(route, { template: { id: "tpl-copy", visibility: "library", shareCode: "copyshare", publishedAt: "2026-08-20T01:00:00.000Z" } });
      return;
    }
    if (path === "/api/templates/tpl-copy/share") {
      await json(route, { template: { id: "tpl-copy", visibility: "unlisted", shareCode: "copyshare", publishedAt: "2026-08-20T01:00:00.000Z" } });
      return;
    }
    if (path === "/api/profile" || path.startsWith("/api/templates/")) {
      await json(route, { ok: true, template: accountTemplate(path.split("/")[3] || "tpl-primary", "已保存") });
      return;
    }
    await json(route, { error: "not mocked" }, 404);
  });
}

test("anonymous visitors can register or sign in before using an account", async ({ page }) => {
  await page.route("**/api/bootstrap", (route) => json(route, { error: "请先注册或登录" }, 401));
  await page.goto("/?template=shared-code");

  const gate = page.getByTestId("account-gate-anonymous");
  await expect(gate).toBeVisible();
  await expect(gate.getByRole("link", { name: "注册 / 登录" })).toHaveAttribute(
    "href",
    /\/signin-with-chatgpt\?return_to=%2F%3Ftemplate%3Dshared-code/,
  );
  await expect(gate).toContainText("首次登录会自动创建账号");
});

test("a signed-in student can switch templates and install one from the library", async ({ page }) => {
  const requests: string[] = [];
  await mockAuthenticatedAccount(page, requests);
  await page.goto("/");
  await expect(page.getByTestId("overview-page")).toBeVisible();

  await page.getByTestId("feature-center-trigger").click();
  await expect(page.getByTestId("feature-center-page")).toBeVisible();
  await page.getByTestId("feature-my-templates").click();
  await expect(page.getByTestId("template-library-page")).toBeVisible();
  await page.getByRole("button", { name: /美国申请/ }).click();
  await expect(page.getByTestId("template-switcher")).toContainText("美国申请");

  await page.getByTestId("goal-back-button").click();
  await page.getByTestId("feature-center-trigger").click();
  await page.getByTestId("feature-template-library").click();
  await expect(page.getByTestId("template-library-page")).toBeVisible();
  await page.getByRole("button", { name: "加入我的模版" }).click();
  await expect(page.getByTestId("template-switcher")).toContainText("英港申请");
  expect(requests).toContain("POST /api/templates/tpl-library/install");

  await page.getByTestId("goal-back-button").click();
  await page.getByTestId("feature-center-trigger").click();
  await page.getByTestId("feature-account").click();
  const accountDialog = page.getByRole("dialog", { name: "我的账号" });
  await expect(accountDialog).toContainText("student@example.com");
  await expect(accountDialog).toContainText("档案与模版已保存");
});

test("a signed-in student can save a personal copy and publish it", async ({ page }) => {
  const requests: string[] = [];
  await mockAuthenticatedAccount(page, requests);
  await page.goto("/");

  await page.getByTestId("feature-center-trigger").click();
  await page.getByTestId("feature-settings").click();
  await page.getByTestId("save-personal-template").click();
  await expect.poll(() => requests.includes("POST /api/templates")).toBe(true);
  await page.getByTestId("publish-template").click();
  await expect.poll(() => requests.includes("POST /api/templates/tpl-copy/publish")).toBe(true);
  await expect(page.getByRole("status")).toContainText("已发布到模版库");
});
