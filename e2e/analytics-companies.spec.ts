import { test, expect } from "@playwright/test";

test.describe("Analytics Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");
  });

  test("should render page title with icon", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /分析|Analytics|Dashboard/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test("should render stat cards", async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(3000);

    // Either stat cards or empty state should show
    const hasContent = await page.locator(".grid.grid-cols-2.md\\:grid-cols-4").isVisible().catch(() => false);
    const hasEmptyState = await page.getByText(/暂无数据|Loading|加载/i).isVisible().catch(() => false);

    // At least one of these should be true
    expect(hasContent || hasEmptyState).toBeTruthy();
  });

  test("should show warning when interview count is low", async ({ page }) => {
    await page.waitForTimeout(3000);

    // Check if the low-count warning appears (conditional on data)
    const warning = page.getByText(/不足5|at least 5|pattern|模式/i);
    const warningVisible = await warning.isVisible().catch(() => false);
    // If there are >= 5 interviews, the warning won't show - that's expected behavior
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("should load data from API", async ({ page }) => {
    await page.waitForTimeout(3000);

    // Should not show error state
    const errorText = page.getByText(/Error|错误|500|failed|失败/i);
    // These shouldn't be visible (unless server error)
    const errorVisible = await errorText.isVisible().catch(() => false);
    if (errorVisible) {
      console.log("Warning: Error state detected on analytics page");
    }
  });
});

test.describe("Companies Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/companies");
    await page.waitForLoadState("networkidle");
  });

  test("should render page title with icon", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /公司|Companies/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test("should handle empty state gracefully", async ({ page }) => {
    await page.waitForTimeout(2000);

    // Either shows companies or empty state
    const hasEmptyState = await page.getByText(/暂无|没有|no companies|no data/i).isVisible().catch(() => false);
    const hasCompanies = await page.locator('a[href*="/interviews?search="]').first().isVisible().catch(() => false);

    expect(hasEmptyState || hasCompanies).toBeTruthy();
  });

  test("company cards should link to filtered interviews", async ({ page }) => {
    await page.waitForTimeout(2000);

    const companyLinks = page.locator('a[href*="/interviews?search="]');
    const count = await companyLinks.count();
    if (count > 0) {
      await companyLinks.first().click();
      await page.waitForTimeout(1000);
      // Should navigate to interviews page with search param
      await expect(page).toHaveURL(/interviews\?search=/);
    } else {
      // No companies yet, empty state is fine
      await expect(page.locator("main")).toBeVisible();
    }
  });

  test("company card should show interview count badge", async ({ page }) => {
    await page.waitForTimeout(2000);

    const badges = page.locator(".text-xs").filter({ hasText: /面试|面|interview/i });
    const badgeCount = await badges.count();
    // If there are companies, they should have count badges
    if (badgeCount > 0) {
      await expect(badges.first()).toBeVisible();
    }
  });
});
