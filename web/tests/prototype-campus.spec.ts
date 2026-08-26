import { expect, test, type Page } from "@playwright/test";

async function resetDemo(page: Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.getByTestId("overview-page")).toBeVisible();
}

async function openSpaces(page: Page) {
  await page.getByTestId("feature-center-trigger").click();
  await page.getByTestId("feature-spaces").click();
  await expect(page.getByTestId("spaces-page")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await resetDemo(page);
});

test("the app opens on overview and keeps the goal template as a secondary page", async ({ page }) => {
  const overview = page.getByTestId("overview-page");
  await expect(overview).toContainText("今天和接下来要做什么");
  await expect(overview).toContainText("近期校园事项");
  await expect(overview).toContainText("25中法保研");
  await expect(page.getByTestId("reminder-card-reminder-room-change")).toBeVisible();

  await page.getByTestId("primary-template-card").click();
  await expect(page.getByTestId("student-app")).toBeVisible();
  await expect(page.getByTestId("page-graduation")).toBeVisible();
  await page.getByTestId("goal-back-button").click();
  await expect(overview).toBeVisible();

  await page.getByTestId("feature-center-trigger").click();
  const forwardLayer = page.getByTestId("workspace-transition-layer");
  await expect(forwardLayer).toHaveAttribute("data-direction", "forward");
  await expect(forwardLayer).toHaveCSS("animation-name", "workspace-page-enter-forward");
  await expect(page.getByTestId("feature-center-page")).toContainText("事项");
  await expect(page.getByTestId("feature-center-page")).toContainText("班级与课程");

  await page.getByRole("button", { name: "返回首页" }).click();
  const backLayer = page.getByTestId("workspace-transition-layer");
  await expect(backLayer).toHaveAttribute("data-direction", "back");
  await expect(backLayer).toHaveCSS("animation-name", "workspace-page-enter-back");
  await expect(overview).toBeVisible();
});

test("case library opens as a native feature with search, detail and interviews", async ({ page }) => {
  await page.getByTestId("feature-center-trigger").click();
  await page.getByTestId("feature-cases").click();

  const library = page.getByTestId("case-library-page");
  await expect(library).toBeVisible();
  await expect(library).toContainText("人大申请案例库");
  await expect(library.locator("iframe")).toHaveCount(0);
  await expect(page).toHaveURL(/\/$/);

  await library.getByLabel("搜索案例").fill("剑桥");
  await expect(library).toContainText("1个");
  await library.getByRole("button", { name: /剑桥大学校徽/ }).click();

  const detail = page.getByTestId("case-detail-page");
  await expect(detail).toContainText("金融经济");
  await expect(detail).toContainText("GRE 339");
  await detail.getByRole("button", { name: "返回" }).click();

  await library.getByRole("button", { name: "专访" }).click();
  await expect(page.getByTestId("case-article-list")).toContainText("乐湖专访");
  await expect(page.getByTestId("case-article-list").getByRole("link").first()).toHaveAttribute("href", /mp\.weixin\.qq\.com/);
});

test("agenda supports ranges, filters, search, overdue and cancelled history", async ({ page }) => {
  await page.getByRole("button", { name: /查看全部/ }).click();
  const agenda = page.getByTestId("agenda-page");
  await expect(agenda).toBeVisible();
  await expect(agenda).toContainText("培养方案意见征集");

  await agenda.getByRole("button", { name: "全部", exact: true }).click();
  await expect(agenda).toContainText("公司金融行业讲座");
  await expect(agenda).toContainText("已取消");

  await agenda.getByLabel("按空间筛选").selectOption("course-french-b1");
  await expect(agenda).toContainText("法语 B1 口语小测");
  await expect(agenda).not.toContainText("资本预算练习提交");

  await agenda.getByLabel("按空间筛选").selectOption("all");
  await agenda.getByLabel("搜索事项").fill("回归分析");
  await expect(agenda).toContainText("下载回归分析数据集");
  await expect(agenda.getByText("1项", { exact: true })).toBeVisible();
});

test("an important update invalidates the old confirmation and can be reconfirmed", async ({ page }) => {
  await page.getByTestId("reminder-card-reminder-room-change").click();
  const detail = page.getByTestId("reminder-detail-page");
  await expect(detail).toContainText("本次更新");
  await expect(detail).toContainText("修远楼 201");
  await expect(detail).toContainText("修远楼 203");
  await expect(page.getByTestId("reminder-action")).toHaveText(/重新确认收到/);

  await page.getByTestId("reminder-action").click();
  await expect(page.getByTestId("reminder-action")).toHaveText(/已确认/);
  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("baoyan-demo.campus.v1") || "{}"));
  const recipient = stored.recipientStates.find((item: { reminderId: string }) => item.reminderId === "reminder-room-change");
  expect(recipient.confirmedVersion).toBe(2);
});

test("space roles expose different publishing and resource permissions", async ({ page }) => {
  await openSpaces(page);

  await page.getByRole("button", { name: "班级", exact: true }).click();
  await page.getByTestId("space-class-finance-25").click();
  const classSpace = page.getByTestId("space-detail-page");
  await expect(classSpace).toContainText("管理员");
  await expect(classSpace.getByTestId("space-invite-card")).toContainText("CF2501");
  await expect(classSpace.getByRole("switch", { name: "需要审核" })).toHaveCount(0);
  await expect(classSpace.getByRole("button", { name: /发布事项/ })).toBeVisible();
  await expect(classSpace.getByRole("button", { name: "资料", exact: true })).toHaveCount(0);

  await classSpace.getByRole("button", { name: "返回" }).click();
  await page.getByRole("button", { name: "课程", exact: true }).click();
  await page.getByTestId("space-course-corp-finance").click();
  const ownerSpace = page.getByTestId("space-detail-page");
  await expect(ownerSpace).toContainText("空间负责人");
  await expect(ownerSpace.getByRole("switch", { name: "需要审核" })).toBeVisible();
  await expect(ownerSpace.getByRole("button", { name: "重置加入码" })).toBeVisible();
  await ownerSpace.getByRole("button", { name: "资料", exact: true }).click();
  await expect(ownerSpace.getByRole("button", { name: "上传", exact: true })).toBeVisible();

  await ownerSpace.getByRole("button", { name: "返回" }).click();
  await page.getByTestId("space-course-micro").click();
  const memberSpace = page.getByTestId("space-detail-page");
  await expect(memberSpace).toContainText("成员");
  await expect(memberSpace.getByTestId("space-invite-card")).toContainText("MICRO25");
  await expect(memberSpace.getByRole("switch", { name: "需要审核" })).toHaveCount(0);
  await expect(memberSpace.getByRole("button", { name: /发布事项/ })).toHaveCount(0);
  await memberSpace.getByRole("button", { name: "资料", exact: true }).click();
  await expect(memberSpace.getByRole("button", { name: "上传", exact: true })).toHaveCount(0);
});

test("join codes cover invalid, duplicate, archived, and successful states", async ({ page }) => {
  await openSpaces(page);
  const code = page.getByLabel("输入加入码");
  const join = page.getByRole("button", { name: "加入", exact: true });

  await code.fill("WRONG");
  await join.click();
  await expect(page.getByRole("status")).toHaveText("加入码无效，请检查后重试");

  await code.fill("MICRO25");
  await join.click();
  await expect(page.getByRole("status")).toHaveText("你已经加入这个空间");

  await code.fill("OLD2025");
  await join.click();
  await expect(page.getByRole("status")).toHaveText("该空间已归档，无法加入");

  await code.fill("GLOBAL25");
  await join.click();
  await expect(page.getByTestId("space-detail-page")).toContainText("国际经济学");
  await expect(page.getByTestId("space-detail-page")).toContainText("成员");
});

test("creating a course generates a join code and persists the approval policy", async ({ page }) => {
  await openSpaces(page);
  await page.getByRole("button", { name: "创建课程" }).click();
  const form = page.getByTestId("create-space-form");
  await form.getByLabel("空间名称").fill("金融科技专题");
  await form.getByRole("button", { name: "需要审核" }).click();
  await form.getByRole("button", { name: "创建课程", exact: true }).click();

  const result = page.getByTestId("created-space-result");
  await expect(result).toContainText("金融科技专题");
  await expect(result).toContainText("加入需审核");
  const code = (await result.locator(".created-space-code b").textContent()) || "";
  expect(code).toMatch(/^C[A-Z0-9]{5}$/);

  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("baoyan-demo.campus.v1") || "{}"));
  expect(stored.spaces.find((space: { name: string }) => space.name === "金融科技专题").joinPolicy).toBe("approval");

  await result.getByRole("button", { name: "进入课程" }).click();
  const inviteCard = page.getByTestId("space-invite-card");
  await expect(inviteCard).toContainText(code);
  const approvalSwitch = inviteCard.getByRole("switch", { name: "需要审核" });
  await expect(approvalSwitch).toBeChecked();
  await expect(approvalSwitch).toHaveClass(/on/);
  await approvalSwitch.click();
  await expect(approvalSwitch).not.toBeChecked();
  await expect(approvalSwitch).toHaveClass(/off/);

  const changed = await page.evaluate(() => JSON.parse(window.localStorage.getItem("baoyan-demo.campus.v1") || "{}"));
  expect(changed.spaces.find((space: { name: string }) => space.name === "金融科技专题").joinPolicy).toBe("open");
});

test("approval-required codes create requests and owners can approve applicants", async ({ page }) => {
  await openSpaces(page);
  await page.getByLabel("输入加入码").fill("REVIEW25");
  await page.getByRole("button", { name: "加入", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("申请已提交，等待审核");

  await page.getByTestId("space-course-corp-finance").click();
  const detail = page.getByTestId("space-detail-page");
  await detail.getByRole("button", { name: "成员", exact: true }).click();
  await expect(detail).toContainText("叶之航");
  await expect(detail).toContainText("1人待审核");
  await detail.getByRole("button", { name: "通过" }).click();
  await expect(detail).not.toContainText("1人待审核");
  await expect(detail).toContainText("36人");
});

test("the owner can manage up to three administrators and transfer ownership", async ({ page }) => {
  await openSpaces(page);
  await page.getByTestId("space-course-corp-finance").click();
  const detail = page.getByTestId("space-detail-page");
  await detail.getByRole("button", { name: "成员", exact: true }).click();

  await detail.getByRole("button", { name: "管理许言" }).click();
  await page.getByRole("button", { name: "设为管理员" }).click();
  await detail.getByRole("button", { name: "管理宋清和" }).click();
  await page.getByRole("button", { name: "设为管理员" }).click();
  await expect(detail).toContainText("3/3名管理员");

  await detail.getByRole("button", { name: "管理沈星遥" }).click();
  await page.getByRole("button", { name: "设为管理员" }).click();
  await expect(page.getByRole("status").last()).toHaveText("管理员最多设置 3 名");
  await page.keyboard.press("Escape");

  await detail.getByRole("button", { name: "管理顾南乔" }).click();
  await page.getByRole("button", { name: "转让空间负责人" }).click();
  await expect(detail.locator(".role-badge")).toHaveText("成员");
  await expect(detail.getByRole("switch", { name: "需要审核" })).toHaveCount(0);
  await expect(detail.getByRole("button", { name: "解散空间" })).toHaveCount(0);

  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("baoyan-demo.campus.v1") || "{}"));
  expect(stored.members.find((member: { spaceId: string; name: string }) => member.spaceId === "course-corp-finance" && member.name === "顾南乔").role).toBe("owner");
  expect(stored.members.find((member: { spaceId: string; name: string }) => member.spaceId === "course-corp-finance" && member.name === "林知夏").role).toBe("member");
});

test("the owner can dissolve a space into read-only history", async ({ page }) => {
  await openSpaces(page);
  await page.getByTestId("space-course-corp-finance").click();
  const detail = page.getByTestId("space-detail-page");
  await detail.getByRole("button", { name: "成员", exact: true }).click();
  await detail.getByRole("button", { name: "解散空间" }).click();
  await expect(page.getByText(/确认解散“公司金融”/)).toBeVisible();
  await page.getByRole("button", { name: "确认解散" }).click();

  await expect(detail).toContainText("空间已解散");
  await expect(detail).toContainText("内容仅供查看");
  await expect(detail.getByTestId("space-invite-card")).toHaveCount(0);
  await detail.getByRole("button", { name: "事项", exact: true }).click();
  await expect(detail.getByRole("button", { name: /发布事项/ })).toHaveCount(0);

  await detail.getByRole("button", { name: "返回" }).click();
  await expect(page.getByTestId("space-course-corp-finance")).toHaveCount(0);
  await page.getByRole("button", { name: "历史" }).click();
  await expect(page.getByTestId("space-course-corp-finance")).toContainText("已解散 · 仅供查看");
});

test("course resources support preview, versions, offline state, retry and mock upload", async ({ page }) => {
  await openSpaces(page);
  await page.getByTestId("space-course-corp-finance").click();
  const space = page.getByTestId("space-detail-page");
  await space.getByRole("button", { name: "资料", exact: true }).click();

  await expect(space).toContainText("课件");
  await expect(space).toContainText("作业与练习");
  await expect(space).toContainText("复习资料");
  await expect(space).toContainText("阅读材料");
  await expect(space).toContainText("上传失败");
  await space.getByRole("button", { name: /重试/ }).click();
  await expect(space).not.toContainText("上传失败");

  await space.getByRole("button", { name: /第 3 章 资本预算/ }).click();
  const preview = page.getByTestId("resource-preview-page");
  await expect(preview.getByLabel("选择资料版本")).toContainText("v2 · 补充例题");
  await expect(preview.getByLabel("选择资料版本")).toContainText("v1 · 初版");
  await expect(preview.getByLabel("下载资料")).toHaveAttribute("href", /course-handout\.pdf/);
  await preview.getByRole("button", { name: "离线保存" }).click();
  await expect(preview.getByRole("button", { name: "已离线" })).toBeVisible();

  await preview.getByRole("button", { name: "返回" }).click();
  await space.getByRole("button", { name: "资料", exact: true }).click();
  await space.getByRole("button", { name: "上传", exact: true }).click();
  await expect(space).toContainText("检测到同名资料", { timeout: 2_000 });
  await space.getByRole("button", { name: "另存为新资料" }).click();
  await expect(space).toContainText("资本预算补充材料");
});
