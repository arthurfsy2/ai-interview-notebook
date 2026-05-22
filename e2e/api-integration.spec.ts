import { test, expect } from "@playwright/test";

/**
 * API 集成测试 — 验证核心 API 端点的正确性
 * 不依赖浏览器 UI，直接通过 fetch 调用 API
 */

const BASE = "http://localhost:3003";

test.describe("API Integration Tests", () => {
  let createdInterviewId: string;

  test.describe("Interviews API", () => {
    test("POST /api/interviews - create interview", async ({ request }) => {
      const res = await request.post(`${BASE}/api/interviews`, {
        data: {
          companyName: `API_TEST_${Date.now()}`,
          position: "测试岗位",
          interviewDate: new Date().toISOString(),
          interviewMode: "线上",
          result: "待定",
          experienceRating: 4,
          rounds: 2,
          salaryRange: "20-30K",
          notes: "这是E2E测试的面试备注。面试官很专业，问了关于系统架构和性能优化的问题。整体感觉不错，公司技术氛围好。",
        },
      });
      expect(res.status()).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBeTruthy();
      createdInterviewId = body.data.id;
    });

    test("GET /api/interviews - list interviews", async ({ request }) => {
      const res = await request.get(`${BASE}/api/interviews`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    test("GET /api/interviews - filter by result", async ({ request }) => {
      const res = await request.get(`${BASE}/api/interviews?result=待定`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      for (const item of body.data) {
        expect(item.result).toBe("待定");
      }
    });

    test("GET /api/interviews - search by company", async ({ request }) => {
      const res = await request.get(`${BASE}/api/interviews?search=API_TEST`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    test("GET /api/interviews/[id] - get single interview", async ({ request }) => {
      // Use the ID from create test
      if (!createdInterviewId) {
        // Create one first
        const createRes = await request.post(`${BASE}/api/interviews`, {
          data: {
            companyName: `GET_TEST_${Date.now()}`,
            position: "测试",
            interviewDate: new Date().toISOString(),
            notes: "测试备注内容足够长用于分析测试",
          },
        });
        const createBody = await createRes.json();
        createdInterviewId = createBody.data.id;
      }

      const res = await request.get(`${BASE}/api/interviews/${createdInterviewId}`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.companyName).toBeTruthy();
    });

    test("PUT /api/interviews/[id] - update interview", async ({ request }) => {
      if (!createdInterviewId) return test.skip();

      const res = await request.put(`${BASE}/api/interviews/${createdInterviewId}`, {
        data: {
          companyName: "UPDATED_COMPANY",
          position: "更新后的岗位",
          result: "通过",
          notes: "更新后的备注，面试很顺利，面试官很友好。",
        },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    test("DELETE /api/interviews/[id] - delete interview", async ({ request }) => {
      if (!createdInterviewId) return test.skip();

      const res = await request.delete(`${BASE}/api/interviews/${createdInterviewId}`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      // Verify it's gone
      const checkRes = await request.get(`${BASE}/api/interviews/${createdInterviewId}`);
      expect(checkRes.status()).toBe(404);
    });
  });

  test.describe("AI Analyze API", () => {
    test("POST /api/interviews/[id]/analyze - should return structured response", async ({ request }) => {
      // Create interview with sufficient notes for analysis
      const createRes = await request.post(`${BASE}/api/interviews`, {
        data: {
          companyName: `AI_ANALYZE_TEST_${Date.now()}`,
          position: "高级前端工程师",
          interviewDate: new Date().toISOString(),
          interviewMode: "线下",
          notes: "面试共计3轮，最后一轮是技术总监面。主要问了React性能优化、微前端架构、TypeScript高级类型。面试官很专业，公司技术氛围好，薪资范围在预期内。",
        },
      });
      const createBody = await createRes.json();
      const interviewId = createBody.data.id;

      // Call analyze
      const analyzeRes = await request.post(`${BASE}/api/interviews/${interviewId}/analyze`);
      expect(analyzeRes.status()).toBe(200);
      const analyzeBody = await analyzeRes.json();
      expect(analyzeBody.success).toBe(true);
      expect(analyzeBody.data).toBeTruthy();
      expect(analyzeBody.data.aiTags).toBeTruthy();
      expect(analyzeBody.data.aiInsights).toBeTruthy();

      // Check if analysis succeeded or returned error
      if (analyzeBody.data._error) {
        console.log(`[AI Analyze] Analysis returned error: ${analyzeBody.data._error}`);
        // Even with error, the structure should be valid
        expect(analyzeBody.data.aiInsights.summary).toBeTruthy();
      } else {
        // Successful analysis should have meaningful data
        expect(analyzeBody.data.aiTags).toBeTruthy();
      }

      // Cleanup
      await request.delete(`${BASE}/api/interviews/${interviewId}`);
    });

    test("POST /api/interviews/[id]/analyze - short notes should be rejected", async ({ request }) => {
      const createRes = await request.post(`${BASE}/api/interviews`, {
        data: {
          companyName: "SHORT_NOTES_TEST",
          position: "测试",
          interviewDate: new Date().toISOString(),
          notes: "短",
        },
      });
      const createBody = await createRes.json();

      const analyzeRes = await request.post(`${BASE}/api/interviews/${createBody.data.id}/analyze`);
      expect(analyzeRes.status()).toBe(400);
      const analyzeBody = await analyzeRes.json();
      expect(analyzeBody.error).toContain("太少");

      await request.delete(`${BASE}/api/interviews/${createBody.data.id}`);
    });

    test("POST /api/interviews/[id]/analyze - non-existent interview returns 404", async ({ request }) => {
      const res = await request.post(`${BASE}/api/interviews/non-existent-id/analyze`);
      expect(res.status()).toBe(404);
    });
  });

  test.describe("Settings API", () => {
    test("GET /api/settings/ai - should return configs", async ({ request }) => {
      const res = await request.get(`${BASE}/api/settings/ai`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body).toHaveProperty("configs");
      expect(body).toHaveProperty("activeId");
    });

    test("POST /api/settings/ai/test - test connection endpoint", async ({ request }) => {
      // Test with a deliberately invalid key to check error handling
      const res = await request.post(`${BASE}/api/settings/ai/test`, {
        data: {
          apiKey: "invalid-test-key",
          baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
          model: "qwen-turbo",
          provider: "dashscope",
        },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      // Should return a structured response with debug info
      expect(body).toHaveProperty("success");
      expect(body).toHaveProperty("debug");
      expect(body.debug).toHaveProperty("requestUrl");
      expect(body.debug).toHaveProperty("requestModel");
      expect(body.debug).toHaveProperty("apiKeyMasked");
    });
  });

  test.describe("Stats API", () => {
    test("GET /api/stats - should return dashboard stats", async ({ request }) => {
      const res = await request.get(`${BASE}/api/stats`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty("totalInterviews");
      expect(typeof body.data.totalInterviews).toBe("number");
    });
  });

  test.describe("Profile API", () => {
    test("GET /api/profile - should return profile", async ({ request }) => {
      const res = await request.get(`${BASE}/api/profile`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    test("POST /api/profile - should save profile", async ({ request }) => {
      const res = await request.post(`${BASE}/api/profile`, {
        data: {
          resumeText: "E2E测试简历内容",
          currentTitle: "测试工程师",
          yearsOfExperience: 5,
          targetTitle: "高级工程师",
          targetIndustry: ["互联网", "AI"],
          currentSalary: { monthlyPreTax: 25000, workSchedule: "双休", monthsPerYear: 12 },
          location: "北京",
        },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      // Read back to verify persistence
      const getRes = await request.get(`${BASE}/api/profile`);
      const getBody = await getRes.json();
      expect(getBody.data.currentTitle).toBe("测试工程师");
    });
  });
});
