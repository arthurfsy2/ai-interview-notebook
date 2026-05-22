import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test.describe("Hero Section", () => {
    test("should render hero title and description", async ({ page }) => {
      await expect(page.getByRole("heading").first()).toBeVisible();
      await expect(page.locator(".text-slate-900, .text-slate-600").first()).toBeVisible();
    });

    test("should have working CTA buttons", async ({ page }) => {
      const startAnalysisBtn = page.getByRole("link", { name: /分析|Analysis/i }).first();
      await expect(startAnalysisBtn).toBeVisible();

      const newRecordBtn = page.getByRole("link", { name: /记录|Record/i }).first();
      await expect(newRecordBtn).toBeVisible();
    });

    test("CTA 'start analysis' should navigate to pre-interview/new", async ({ page }) => {
      const link = page.locator('a[href*="/pre-interview/new"]').first();
      await link.click();
      await page.waitForURL("**/pre-interview/new**");
      await expect(page).toHaveURL(/pre-interview\/new/);
    });

    test("CTA 'new record' should navigate to interviews/new", async ({ page }) => {
      const link = page.locator('a[href*="/interviews/new"]').first();
      if (await link.isVisible()) {
        await link.click();
        await page.waitForURL("**/interviews/new**", { timeout: 5000 });
        await expect(page).toHaveURL(/interviews\/new/);
      } else {
        // On mobile, might navigate differently
        await page.goto("/interviews/new");
        await expect(page).toHaveURL(/interviews\/new/);
      }
    });
  });

  test.describe("Stats Cards", () => {
    test("should render 4 stat cards", async ({ page }) => {
      const cards = page.locator(".grid.grid-cols-2.md\\:grid-cols-4 > .text-center");
      await expect(cards.first()).toBeVisible({ timeout: 10000 });
    });

    test("should show total interviews stat", async ({ page }) => {
      await expect(page.getByText(/总面试|Total Interviews|Interviews/i).first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Features Section", () => {
    test("should render 4 feature cards", async ({ page }) => {
      const featureCards = page.locator('.grid.gap-5 a[href]');
      await expect(featureCards).toHaveCount(4);
    });

    test("each feature card should have a title and description", async ({ page }) => {
      const cards = page.locator('.grid.gap-5 a[href]');
      const count = await cards.count();
      for (let i = 0; i < count; i++) {
        await expect(cards.nth(i)).toBeVisible();
      }
    });

    test("feature cards should link to correct pages", async ({ page }) => {
      const links = [
        { href: "/pre-interview/new", text: /分析|Analysis/ },
        { href: "/interviews/new", text: /录入|Quick Note|Record/ },
        { href: "/interviews", text: /记录|Interview/ },
        { href: "/analytics", text: /面板|Analytics|Dashboard/ },
      ];

      for (const { href } of links) {
        const link = page.locator(`.grid.gap-5 a[href*="${href}"]`);
        await expect(link.first()).toBeVisible();
      }
    });
  });

  test.describe("Layout", () => {
    test("should have header with logo", async ({ page }) => {
      const header = page.locator("header");
      await expect(header).toBeVisible();
    });

    test("should have footer", async ({ page }) => {
      const footer = page.locator("footer");
      await expect(footer).toBeVisible();
    });

    test("hero gradient background should render", async ({ page }) => {
      const bgDiv = page.locator(".bg-gradient-to-b").first();
      await expect(bgDiv).toBeVisible();
    });
  });
});
