import { expect, test, type Page } from "@playwright/test";

async function openGoals(page: Page) {
  if (await page.getByTestId("student-app").isVisible().catch(() => false)) return;
  await expect(page.getByTestId("overview-page")).toBeVisible();
  await page.getByTestId("primary-template-card").click();
  await expect(page.getByTestId("student-app")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await openGoals(page);
  await page.getByTestId("entry-button").click();
});

test("GPA input preserves the decimal separator while editing", async ({ page }) => {
  const dialog = page.getByRole("dialog", { name: "录入资料" });
  await dialog.getByRole("button", { name: "成绩与基础信息" }).click();

  const gpa = dialog.getByLabel("平均学分绩点");
  await gpa.fill("3.");
  await expect(gpa).toHaveValue("3.");
  await gpa.pressSequentially("81");
  await expect(gpa).toHaveValue("3.81");

  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("baoyan-demo.student.v1") || "{}"));
  expect(stored.gpa).toBe(3.81);
});

test("internship, organization, and arts categories open direct manual entry", async ({ page }) => {
  const dialog = page.getByRole("dialog", { name: "录入资料" });

  await dialog.getByLabel("经历类型").selectOption("internship");
  await expect(dialog.getByLabel("常用经历")).toHaveCount(0);
  await expect(dialog.getByLabel("经历名称")).toBeVisible();
  await expect(dialog.getByLabel("奖项 / 结果 / 职（岗）位")).toBeVisible();

  await dialog.getByLabel("经历类型").selectOption("organization");
  await expect(dialog.getByLabel("常用经历")).toHaveCount(0);
  await expect(dialog.getByLabel("经历名称")).toBeVisible();
  await expect(dialog.getByLabel("奖项 / 结果 / 职（岗）位")).toBeVisible();
  await expect(dialog.getByLabel("我的简历板块")).toHaveValue("campus");
  await expect(dialog.getByLabel("我的简历板块")).toContainText("不归入我的简历");

  await dialog.getByLabel("经历类型").selectOption("arts");
  await expect(dialog.getByLabel("常用经历")).toHaveCount(0);
  await expect(dialog.getByLabel("经历名称")).toBeVisible();
  await expect(dialog.getByLabel("奖项 / 结果 / 职（岗）位")).toBeVisible();
});

test("preset experiences allow editable or empty competitiveness assignment", async ({ page }) => {
  const dialog = page.getByRole("dialog", { name: "录入资料" });
  const assignment = dialog.getByLabel("我的简历板块");

  await expect(assignment).toBeVisible();
  await expect(assignment).toHaveValue("research-count");
  await expect(assignment).toContainText("不归入我的简历");
  await assignment.selectOption("none");
  await dialog.getByRole("button", { name: "保存经历" }).click();
  await expect(dialog.getByRole("button", { name: "已保存" })).toBeVisible();

  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("baoyan-demo.student.v1") || "{}"));
  expect(stored.experiences.at(-1).competitivenessBranchId).toBe("none");

  await page.reload();
  await openGoals(page);
  await page.getByTestId("tab-competitiveness").click();
  await expect(page.getByTestId("resume-section-research-count")).toContainText("2项记录");
});

test("common competitions prefill the confirmed score mapping", async ({ page }) => {
  const dialog = page.getByRole("dialog", { name: "录入资料" });

  await dialog.getByLabel("经历类型").selectOption("competition");
  await dialog.getByLabel("常用经历").selectOption("cumcm");
  await dialog.getByLabel("奖项 / 结果").selectOption("provincial-first");
  await expect(dialog.locator(".preset-score-preview")).toContainText("学科竞赛");
  await expect(dialog.getByLabel("科研与创新得分")).toHaveValue("2");
  await expect(dialog.getByText("经历归属", { exact: true })).toHaveCount(0);

  await dialog.getByLabel("身份 / 角色").selectOption("member");
  await expect(dialog.getByLabel("科研与创新得分")).toHaveValue("1.5");
  await dialog.getByLabel("科研与创新得分").fill("1.75");
  await expect(dialog.getByLabel("科研与创新得分")).toHaveValue("1.75");

  await dialog.getByLabel("奖项 / 结果").selectOption("provincial-second");
  await expect(dialog.getByLabel("科研与创新得分")).toHaveValue("0");

  await dialog.getByLabel("常用经历").selectOption("national-math-competition");
  await dialog.getByLabel("奖项 / 结果").selectOption("final-third");
  await expect(dialog.getByLabel("科研与创新得分")).toHaveValue("1");

  await dialog.getByLabel("奖项 / 结果").selectOption("preliminary-first");
  await expect(dialog.getByLabel("科研与创新得分")).toHaveValue("0");

  await dialog.getByLabel("常用经历").selectOption("mcm");
  await dialog.getByLabel("身份 / 角色").selectOption("member");
  await dialog.getByLabel("奖项 / 结果").selectOption("h");
  await expect(dialog.getByLabel("科研与创新得分")).toHaveValue("0.5");
  await dialog.getByLabel("奖项 / 结果").selectOption("s");
  await expect(dialog.getByLabel("科研与创新得分")).toHaveValue("0");

  await dialog.getByLabel("常用经历").selectOption("custom");
  await expect(dialog.getByLabel("奖项 / 结果 / 职（岗）位")).toBeVisible();
  await expect(dialog.getByText("经历归属", { exact: true })).toBeVisible();
  await expect(dialog.getByLabel("科研与创新得分")).toBeVisible();
});

test("academic presets combine role and conclusion before saving", async ({ page }) => {
  const dialog = page.getByRole("dialog", { name: "录入资料" });

  await dialog.getByLabel("项目名称（选填）").fill("数字金融调研");
  await dialog.getByLabel("身份 / 角色").selectOption("leader");
  await dialog.getByLabel("立项层级").selectOption("qiangguo");
  await dialog.getByLabel("结项情况").selectOption("excellent");
  await expect(dialog.getByLabel("科研与创新得分")).toHaveValue("3.5");
  await expect(dialog.locator(".preset-score-preview")).toContainText("学术研究");
  await expect(dialog.locator(".preset-score-preview")).toContainText("强国立项 · 负责人 · 优秀结项");
  await dialog.getByLabel("科研与创新得分").fill("3.2");

  await dialog.getByRole("button", { name: "保存经历" }).click();
  await expect(dialog.getByRole("button", { name: "已保存" })).toBeVisible();

  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("baoyan-demo.student.v1") || "{}"));
  const saved = stored.experiences.at(-1);
  expect(saved.name).toBe("求是学术品牌研究（大创）｜数字金融调研");
  expect(saved.result).toBe("强国立项 · 负责人 · 优秀结项");
  expect(saved.researchSection).toBe("academic");
  expect(saved.researchScore).toBe(3.2);
  expect(saved.competitivenessBranchId).toBe("research-count");

  await page.reload();
  await openGoals(page);
  await page.getByRole("button", { name: "查看完整档案" }).click();
  const archiveExperience = page.getByTestId(`archive-experience-${saved.id}`);
  await archiveExperience.locator(".archive-event-summary").click();
  await archiveExperience.getByRole("button", { name: "编辑这条经历" }).click();
  await expect(archiveExperience.getByText("政策计分", { exact: true })).toBeVisible();
  await expect(archiveExperience.getByLabel("科研与创新得分")).toHaveValue("3.2");
  await archiveExperience.getByLabel("身份 / 角色").selectOption("member");
  await expect(archiveExperience.getByLabel("科研与创新得分")).toHaveValue("3");
  await archiveExperience.getByLabel("科研与创新得分").fill("2.8");
  await expect(archiveExperience.getByLabel("我的简历板块")).toHaveValue("research-count");
  await archiveExperience.getByLabel("我的简历板块").selectOption("none");

  const updated = await page.evaluate(() => JSON.parse(window.localStorage.getItem("baoyan-demo.student.v1") || "{}"));
  const edited = updated.experiences.find((item: { id: string }) => item.id === saved.id);
  expect(edited.researchSection).toBe("academic");
  expect(edited.researchScore).toBe(2.8);
  expect(edited.competitivenessBranchId).toBe("none");
});

test("Chinese journal papers match the 2017 directory and allow an empty class", async ({ page }) => {
  const dialog = page.getByRole("dialog", { name: "录入资料" });

  await dialog.getByLabel("常用经历").selectOption("journal-paper");
  await dialog.getByLabel("期刊名称").fill("《经济研究》");
  await expect(dialog.getByLabel("期刊类别（选填）")).toHaveValue("A");
  await expect(dialog.getByLabel("科研与创新得分")).toHaveValue("4");

  await dialog.getByLabel("作者身份").selectOption("first");
  await expect(dialog.getByLabel("科研与创新得分")).toHaveValue("3");

  await dialog.getByLabel("期刊名称").fill("尚未收录的中文期刊");
  await expect(dialog.getByLabel("期刊类别（选填）")).toHaveValue("");
  await expect(dialog.locator(".preset-score-preview")).toContainText("期刊类别未填写");
  await expect(dialog.getByLabel("科研与创新得分")).toHaveValue("0");
  await dialog.getByRole("button", { name: "保存经历" }).click();
  await expect(dialog.getByRole("button", { name: "已保存" })).toBeVisible();

  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("baoyan-demo.student.v1") || "{}"));
  const saved = stored.experiences.at(-1);
  expect(saved.journalName).toBe("尚未收录的中文期刊");
  expect(saved.resultCode).toBe("");
  expect(saved.researchScore).toBe(0);
  expect(saved.result).toContain("期刊类别未填写");
});

test("academic low-score records count at most twice", async ({ page }) => {
  await page.evaluate(() => {
    const key = "baoyan-demo.student.v1";
    const student = JSON.parse(window.localStorage.getItem(key) || "{}");
    student.experiences = [
      { id: "academic-a", name: "项目 A", year: "2025", startDate: "2025-01", endDate: "2025-06", result: "已结项", category: "academic", details: "", groupKey: "academic-a", countsForBase: false, countsForResearch: true, researchSection: "academic", researchScore: 1.5, competitivenessBranchId: "research-count" },
      { id: "academic-b", name: "项目 B", year: "2025", startDate: "2025-02", endDate: "2025-07", result: "已结项", category: "academic", details: "", groupKey: "academic-b", countsForBase: false, countsForResearch: true, researchSection: "academic", researchScore: 1.5, competitivenessBranchId: "research-count" },
      { id: "academic-c", name: "项目 C", year: "2025", startDate: "2025-03", endDate: "2025-08", result: "已结项", category: "academic", details: "", groupKey: "academic-c", countsForBase: false, countsForResearch: true, researchSection: "academic", researchScore: 1, competitivenessBranchId: "research-count" },
    ];
    window.localStorage.setItem(key, JSON.stringify(student));
  });

  await page.reload();
  await openGoals(page);
  const researchBranch = page.getByTestId("branch-research-score");
  await expect(researchBranch).toContainText("3.0 / 4.0分");
  await expect(researchBranch).toContainText("项目 C");
  await expect(researchBranch).toContainText("未计入当前得分");
  await expect(researchBranch).not.toContainText("低分值项目最多计2项");
});

test("language presets collect detailed scores and save to the language branch", async ({ page }) => {
  const dialog = page.getByRole("dialog", { name: "录入资料" });

  await dialog.getByLabel("经历类型").selectOption("language");
  await expect(dialog.getByLabel("常用经历")).toContainText("大学英语四级（CET-4）");
  await expect(dialog.getByLabel("常用经历")).toContainText("雅思（IELTS）");
  await expect(dialog.getByLabel("常用经历")).toContainText("法语 DELF / DALF");
  await expect(dialog.getByLabel("常用经历")).toContainText("法语 TEF");

  await dialog.getByLabel("常用经历").selectOption("delf");
  await expect(dialog.getByLabel("等级")).toContainText("C1");
  await expect(dialog.getByLabel("等级")).toContainText("C2");

  await dialog.getByLabel("常用经历").selectOption("ielts");
  await dialog.getByLabel("总分（0–9）").fill("7.5");
  await dialog.getByLabel("听力（0–9）").fill("8");
  await dialog.getByLabel("阅读（0–9）").fill("8");
  await dialog.getByLabel("写作（0–9）").fill("6.5");
  await dialog.getByLabel("口语（0–9）").fill("7");
  await dialog.getByLabel("考试时间").fill("2026-07");
  await dialog.getByLabel("补充说明（选填）").fill("学术类");

  await expect(dialog.locator(".language-score-preview")).toContainText("总分 7.5");
  await expect(dialog.locator(".language-score-preview")).toContainText("听力 8 · 阅读 8 · 写作 6.5 · 口语 7");
  await expect(dialog.getByText("政策计分", { exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: "保存经历" }).click();
  await expect(dialog.getByRole("button", { name: "已保存" })).toBeVisible();

  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("baoyan-demo.student.v1") || "{}"));
  const saved = stored.experiences.at(-1);
  expect(saved.name).toBe("雅思（IELTS）");
  expect(saved.result).toBe("总分 7.5");
  expect(saved.startMonth).toBe("2026-07");
  expect(saved.endMonth).toBe("2026-07");
  expect(saved.category).toBe("language");
  expect(saved.competitivenessBranchId).toBe("language");
  expect(saved.countsForResearch).toBe(false);
  expect(saved.researchScore).toBe(0);
  expect(saved.languageScores).toEqual({ overall: "7.5", listening: "8", reading: "8", writing: "6.5", speaking: "7" });
  expect(saved.details).toContain("听力 8 · 阅读 8 · 写作 6.5 · 口语 7");
  expect(saved.details).toContain("学术类");

  await page.reload();
  await openGoals(page);
  await page.getByRole("button", { name: "查看完整档案" }).click();
  const archiveExperience = page.getByTestId(`archive-experience-${saved.id}`);
  await archiveExperience.locator(".archive-event-summary").click();
  await expect(archiveExperience.getByText("成绩详情", { exact: true })).toBeVisible();
  await archiveExperience.getByRole("button", { name: "编辑这条经历" }).click();
  await expect(archiveExperience.getByLabel("考试时间")).toHaveValue("2026-07");
  await archiveExperience.getByLabel("总分（0–9）").fill("8");

  const updated = await page.evaluate(() => JSON.parse(window.localStorage.getItem("baoyan-demo.student.v1") || "{}"));
  const edited = updated.experiences.find((item: { id: string }) => item.id === saved.id);
  expect(edited.result).toBe("总分 8");
  expect(edited.languageScores.overall).toBe("8");
  expect(edited.details).toContain("学术类");
});

test("language presets switch official score structures by exam", async ({ page }) => {
  const dialog = page.getByRole("dialog", { name: "录入资料" });
  await dialog.getByLabel("经历类型").selectOption("language");

  await dialog.getByLabel("常用经历").selectOption("cet6");
  await expect(dialog.getByLabel("笔试总分（0–710）")).toBeVisible();
  await expect(dialog.getByLabel("写作和翻译（0–213）")).toBeVisible();
  await expect(dialog.getByLabel("口试等级（选填）")).toBeVisible();

  await dialog.getByLabel("常用经历").selectOption("toefl");
  await expect(dialog.getByLabel("综合等级（1–6）")).toBeVisible();
  await expect(dialog.getByLabel("对照总分（0–120，选填）")).toBeVisible();
  await dialog.getByLabel("成绩计分制").selectOption("legacy");
  await expect(dialog.getByLabel("总分（0–120）")).toBeVisible();
  await expect(dialog.getByLabel("阅读（0–30）")).toBeVisible();

  await dialog.getByLabel("常用经历").selectOption("gre");
  await expect(dialog.getByLabel("语文（130–170）")).toBeVisible();
  await expect(dialog.getByLabel("分析性写作（0–6）")).toBeVisible();

  await dialog.getByLabel("常用经历").selectOption("gmat");
  await expect(dialog.getByLabel("数据洞察（60–90）")).toBeVisible();
  await dialog.getByLabel("考试版本").selectOption("legacy");
  await expect(dialog.getByLabel("综合推理（1–8）")).toBeVisible();

  await dialog.getByLabel("常用经历").selectOption("delf");
  await expect(dialog.getByLabel("等级").locator("option[value='B2']")).toHaveCount(1);
  await expect(dialog.getByLabel("等级").locator("option[value='C1']")).toHaveCount(1);
  await expect(dialog.getByLabel("等级").locator("option[value='C2']")).toHaveCount(1);
  await dialog.getByLabel("常用经历").selectOption("tcf");
  await expect(dialog.getByLabel("等级").locator("option[value='C1']")).toHaveCount(1);
  await expect(dialog.getByLabel("等级").locator("option[value='C2']")).toHaveCount(1);
});
