import { expect, test, type Page } from "@playwright/test";

async function openResume(page: Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByTestId("primary-template-card").click();
  await page.getByTestId("tab-competitiveness").click();
  await expect(page.getByTestId("page-competitiveness").getByRole("heading", { name: "我的简历" })).toBeVisible();
}

test("resume keeps six policy-free modules collapsed by default", async ({ page }) => {
  await openResume(page);

  const modules = [
    ["academic", "教育背景"],
    ["internship", "实习经历"],
    ["research-count", "科研与竞赛"],
    ["campus", "校园经历"],
    ["language", "语言与标化"],
    ["skills", "技能与爱好"],
  ] as const;

  for (const [id, title] of modules) {
    const section = page.getByTestId(`resume-section-${id}`);
    await expect(section).toContainText(title);
    await expect(section.locator(".resume-section-summary")).toHaveAttribute("aria-expanded", "false");
  }

  await expect(page.getByText("准备建议", { exact: true })).toHaveCount(0);
  await expect(page.getByText("政策计分", { exact: true })).toHaveCount(0);

  await page.getByTestId("resume-section-academic").locator(".resume-section-summary").click();
  const education = page.getByTestId("resume-education-details");
  await expect(education).toContainText("中国人民大学");
  await expect(education).toContainText("中法学院");
  await expect(education).toContainText("金融学");
  await expect(education).toContainText("3.81");
  await expect(education).toContainText("专业排名");
  await expect(education).not.toContainText("毕业");
  await expect(education).not.toContainText("推免");
});

test("skills edit directly and experience rows open the matching archive record", async ({ page }) => {
  await openResume(page);

  const skillsSection = page.getByTestId("resume-section-skills");
  await skillsSection.locator(".resume-section-summary").click();
  await skillsSection.getByLabel("技能").fill("Python、SQL");
  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("baoyan-demo.student.v1") || "{}"));
  expect(stored.skills).toBe("Python、SQL");

  const researchSection = page.getByTestId("resume-section-research-count");
  await researchSection.locator(".resume-section-summary").click();
  await researchSection.getByTestId("resume-experience-mcm-2027").click();

  const archiveRecord = page.getByTestId("archive-experience-mcm-2027");
  await expect(page.getByTestId("archive-page")).toBeVisible();
  await expect(archiveRecord).toHaveClass(/expanded/);
  await expect(archiveRecord.getByRole("button", { name: "编辑这条经历" })).toBeVisible();
});
