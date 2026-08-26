import { expect, test } from "@playwright/test";

test("the admin app renders as a desktop login page", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(".admin-login-page")).toBeVisible();
  await expect(page.locator("body")).toHaveClass(/admin-route/);
  await expect(page.getByRole("heading", { name: "登录管理后台" })).toBeVisible();
});
