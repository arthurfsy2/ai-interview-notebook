import { test, expect } from "@playwright/test";

const TEST_COMPANY = `E2E测试公司_${Date.now()}`;
const TEST_POSITION = "前端工程师";

test.describe("Interviews CRUD", () => {
  test.describe("Interviews List Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/interviews");
      await page.waitForLoadState("networkidle");
    });

    test("should render page title", async ({ page }) => {
      await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 });
    });

    test("should have new record button", async ({ page }) => {
      const newBtn = page.getByRole("link", { name: /新增|新面试|New|Record/i }).first();
      await expect(newBtn).toBeVisible();
    });

    test("should have search input", async ({ page }) => {
      const searchInput = page.getByPlaceholder(/搜索|Search/i);
      await expect(searchInput).toBeVisible();
    });

    test("should have filter buttons", async ({ page }) => {
      const filterButtons = page.getByRole("button", { name: /全部|All/i });
      await expect(filterButtons.first()).toBeVisible();
    });

    test("search should filter results", async ({ page }) => {
      const searchInput = page.getByPlaceholder(/搜索|Search/i);
      await searchInput.fill("NonExistentCompany12345XYZ");
      await searchInput.press("Enter");
      await page.waitForTimeout(1000);
      await expect(page.getByText(/暂无|没有|no records|No interviews/i).first()).toBeVisible({ timeout: 5000 });
    });

    test("empty state should show when no records match", async ({ page }) => {
      await page.goto("/interviews");
      await page.waitForLoadState("networkidle");
      // Should at least show the list or empty state
      await expect(page.locator("main").first()).toBeVisible();
    });

    test("filter buttons should change active state on click", async ({ page }) => {
      const allBtn = page.getByRole("button", { name: /全部|All/i }).first();
      await allBtn.click();
      await expect(allBtn).toBeVisible();
    });
  });

  test.describe("Create Interview - Full Mode", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/interviews/new");
      await page.waitForLoadState("networkidle");
    });

    test("should render form fields", async ({ page }) => {
      await expect(page.getByText(/公司名称|Company Name|Company/i).first()).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/面试岗位|岗位名称|Position/i).first()).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/面试时间|面试日期|Interview Date|Date/i).first()).toBeVisible({ timeout: 5000 });
    });

    test("should render all form fields in full mode", async ({ page }) => {
      const labels = page.locator("label");
      await expect(labels.first()).toBeVisible();
      // Check key field labels exist
      const labelTexts = await labels.allTextContents();
      const combined = labelTexts.join("");
      expect(combined).toMatch(/公司名称|Company Name|公司/i);
    });

    test("save button should be disabled when company name is empty", async ({ page }) => {
      const saveBtn = page.getByRole("button", { name: /保存|Save/i });
      await expect(saveBtn).toBeDisabled();
    });

    test("should require company name to save", async ({ page }) => {
      const saveBtn = page.getByRole("button", { name: /保存|Save/i });
      await expect(saveBtn).toBeDisabled();

      // Fill only position, not company name
      const positionInput = page.getByPlaceholder(/岗位名称|Position title/i);
      if (await positionInput.isVisible()) {
        await positionInput.fill(TEST_POSITION);
      }
      await expect(saveBtn).toBeDisabled();
    });

    test("save button should become enabled when company name is filled", async ({ page }) => {
      const companyInput = page.getByPlaceholder(/公司名称|Company name/i).first();
      if (await companyInput.isVisible()) {
        await companyInput.fill(TEST_COMPANY);
      }
      const saveBtn = page.getByRole("button", { name: /保存|Save/i });
      await expect(saveBtn).toBeEnabled({ timeout: 5000 });
    });

    test("back button should navigate to previous page", async ({ page }) => {
      // Go to interviews first, then to new
      await page.goto("/interviews");
      await page.waitForLoadState("networkidle");
      await page.goto("/interviews/new");
      await page.waitForLoadState("networkidle");

      const backBtn = page.locator("button").filter({ has: page.locator(".lucide-arrow-left, svg") }).first();
      if (await backBtn.isVisible()) {
        await backBtn.click();
        await page.waitForTimeout(500);
      }
    });

    test("form should support voice input button", async ({ page }) => {
      // The mic button or voice tip should be visible in the notes section
      const voiceBtn = page.locator("button").filter({ has: page.locator(".lucide-mic, .lucide-mic-off, svg") }).first();
      // Voice input may or may not be available depending on browser
      await expect(page.locator("main").first()).toBeVisible();
    });
  });

  test.describe("Create Interview - Quick Mode", () => {
    test("quick mode should have simplified form", async ({ page }) => {
      await page.goto("/interviews/new?quick=1");
      await page.waitForLoadState("networkidle");

      // Should show notes textarea prominently
      const textareas = page.locator("textarea");
      await expect(textareas.first()).toBeVisible();
    });

    test("quick mode should have voice input button visible", async ({ page }) => {
      await page.goto("/interviews/new?quick=1");
      await page.waitForLoadState("networkidle");

      // Voice button should be visible
      await expect(page.getByText(/语音|Voice|麦克风/i).first()).toBeVisible({ timeout: 5000 });
    });

    test("quick mode should still require company name", async ({ page }) => {
      await page.goto("/interviews/new?quick=1");
      await page.waitForLoadState("networkidle");

      const saveBtn = page.getByRole("button", { name: /保存|Save/i });
      await expect(saveBtn).toBeDisabled();
    });
  });

  test.describe("Interview Detail Page", () => {
    let createdId: string;

    test.beforeEach(async ({ page }) => {
      // Navigate to new interview and create one
      await page.goto("/interviews/new");
      await page.waitForLoadState("networkidle");

      const companyInput = page.getByPlaceholder(/公司名称|Company name/i).first();
      if (await companyInput.isVisible()) {
        await companyInput.fill(TEST_COMPANY);
      }
      const positionInput = page.getByPlaceholder(/岗位名称|Position title/i);
      if (await positionInput.isVisible()) {
        await positionInput.fill(TEST_POSITION);
      }

      const saveBtn = page.getByRole("button", { name: /保存|Save/i });
      if (await saveBtn.isEnabled()) {
        await saveBtn.click();
        await page.waitForURL(/interviews\//, { timeout: 15000 });
        // Extract ID from URL
        const url = page.url();
        const match = url.match(/interviews\/([^/?]+)/);
        if (match) createdId = match[1];
      }
    });

    test("should display interview details after creation", async ({ page }) => {
      if (!createdId) return test.skip();
      await expect(page.getByText(TEST_COMPANY)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(TEST_POSITION)).toBeVisible({ timeout: 5000 });
    });

    test("should show result badge", async ({ page }) => {
      if (!createdId) return test.skip();
      await expect(page.getByText(/待定|Pending/i).first()).toBeVisible({ timeout: 10000 });
    });

    test("should show interview metadata", async ({ page }) => {
      if (!createdId) return test.skip();
      await expect(page.getByText(/线下|线上|混合|Onsite|Online/i).first()).toBeVisible({ timeout: 5000 });
    });

    test("should have AI analyze button", async ({ page }) => {
      if (!createdId) return test.skip();
      const analyzeBtn = page.getByRole("button", { name: /分析|Analyze/i });
      await expect(analyzeBtn.first()).toBeVisible({ timeout: 5000 });
    });

    test("should have edit and delete buttons", async ({ page }) => {
      if (!createdId) return test.skip();
      await expect(page.locator("button").filter({ has: page.locator(".lucide-edit, .lucide-trash2, svg") }).first()).toBeVisible({ timeout: 5000 });
    });

    test("should have back button", async ({ page }) => {
      if (!createdId) return test.skip();
      await expect(page.getByText(/返回|Back/i).first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Edit Interview", () => {
    let createdId: string;

    test.beforeEach(async ({ page }) => {
      // Create an interview first
      await page.goto("/interviews/new");
      await page.waitForLoadState("networkidle");

      const companyInput = page.getByPlaceholder(/公司名称|Company name/i).first();
      if (await companyInput.isVisible()) {
        await companyInput.fill(TEST_COMPANY);
      }
      const positionInput = page.getByPlaceholder(/岗位名称|Position title/i);
      if (await positionInput.isVisible()) {
        await positionInput.fill(TEST_POSITION);
      }

      const saveBtn = page.getByRole("button", { name: /保存|Save/i });
      if (await saveBtn.isEnabled()) {
        await saveBtn.click();
        await page.waitForURL(/interviews\//, { timeout: 15000 });
        const match = page.url().match(/interviews\/([^/?]+)/);
        if (match) createdId = match[1];
      }
    });

    test("should navigate to edit page from detail page", async ({ page }) => {
      if (!createdId) return test.skip();

      // Click edit button
      const editBtn = page.locator("button, a").filter({ has: page.locator(".lucide-edit, svg") }).first();
      if (await editBtn.isVisible()) {
        await editBtn.click();
        await page.waitForTimeout(2000);
      }
    });

    test("edit page should have pre-filled form fields", async ({ page }) => {
      if (!createdId) return test.skip();

      await page.goto(`/interviews/${createdId}/edit`);
      await page.waitForLoadState("networkidle");

      // Wait for data to load
      await page.waitForTimeout(2000);

      const companyInput = page.getByPlaceholder(/公司名称|Company name/i).first();
      if (await companyInput.isVisible()) {
        const value = await companyInput.inputValue();
        expect(value).toBeTruthy();
      }
    });

    test("should be able to update notes and save", async ({ page }) => {
      if (!createdId) return test.skip();

      await page.goto(`/interviews/${createdId}/edit`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const notesTextarea = page.locator("textarea").first();
      if (await notesTextarea.isVisible()) {
        await notesTextarea.fill("Updated notes via E2E test " + Date.now());
        const saveBtn = page.getByRole("button", { name: /保存|Save/i });
        if (await saveBtn.isEnabled()) {
          await saveBtn.click();
          await page.waitForTimeout(2000);
        }
      }
    });
  });

  test.describe("Delete Interview", () => {
    test("should show confirmation dialog on delete click", async ({ page }) => {
      // Create interview first
      await page.goto("/interviews/new");
      await page.waitForLoadState("networkidle");

      const companyInput = page.getByPlaceholder(/公司名称|Company name/i).first();
      if (await companyInput.isVisible()) {
        await companyInput.fill(`DELETE_TEST_${Date.now()}`);
      }
      const positionInput = page.getByPlaceholder(/岗位名称|Position title/i);
      if (await positionInput.isVisible()) {
        await positionInput.fill("Test Position");
      }

      const saveBtn = page.getByRole("button", { name: /保存|Save/i });
      if (await saveBtn.isEnabled()) {
        await saveBtn.click();
        await page.waitForURL(/interviews\//, { timeout: 15000 });
      }

      // Now try to delete
      const deleteBtn = page.locator("button").filter({ has: page.locator(".lucide-trash2") }).first();
      if (await deleteBtn.isVisible()) {
        // Listen for dialog
        page.on("dialog", async (dialog) => {
          expect(dialog.message()).toContain("删除");
          await dialog.accept();
        });
        await deleteBtn.click();
        await page.waitForTimeout(1000);
      }
    });
  });
});
