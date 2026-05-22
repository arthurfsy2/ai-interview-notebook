import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptSafe } from "@/lib/crypto";

/**
 * POST /api/settings/websearch/test
 * 测试 WebSearch API 连接（Tavily / Exa）
 */
export async function POST(request: Request) {
  try {
    const { apiKey: rawApiKey } = await request.json();

    let apiKey = rawApiKey;

    // 前端未传 apiKey 时，从数据库读取已保存的 key
    if (!apiKey) {
      const configsSetting = await prisma.settings.findUnique({
        where: { key: "ai_configs" },
      });
      if (configsSetting?.value) {
        const configs = JSON.parse(configsSetting.value);
        const stored = configs.find((c: any) => c.id === "websearch");
        if (stored?.apiKey) {
          apiKey = decryptSafe(stored.apiKey);
        }
      }
    }

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "API Key 不能为空",
      });
    }

    // 判断是 Tavily 还是 Exa
    const isTavily = apiKey.startsWith("tvly-");
    const isExa = apiKey.startsWith("exa-");

    let fetchUrl: string;
    let fetchOptions: RequestInit;

    if (isTavily) {
      fetchUrl = "https://api.tavily.com/search";
      fetchOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ query: "test", max_results: 1 }),
      };
    } else if (isExa) {
      fetchUrl = "https://api.exa.ai/search";
      fetchOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({ query: "test", num_results: 1 }),
      };
    } else {
      // 不确定类型时，优先尝试 Tavily
      fetchUrl = "https://api.tavily.com/search";
      fetchOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ query: "test", max_results: 1 }),
      };
    }

    const debug = {
      requestUrl: fetchUrl,
      provider: isTavily ? "Tavily" : isExa ? "Exa" : "Tavily (推测)",
      apiKeyMasked: apiKey ? `${apiKey.substring(0, 8)}...${apiKey.slice(-4)}` : "(empty)",
    };
    const startTime = Date.now();

    console.log("[WebSearch Test]", debug);

    let fetchResponse: Response;
    try {
      fetchResponse = await fetch(fetchUrl, fetchOptions);
    } catch (fetchErr: any) {
      return NextResponse.json({
        success: false,
        error: `请求发送失败: ${fetchErr.message}`,
        debug,
      });
    }

    const responseTime = Date.now() - startTime;
    const responseBody = await fetchResponse.text();

    if (!fetchResponse.ok) {
      return NextResponse.json({
        success: false,
        error: `HTTP ${fetchResponse.status}: ${responseBody.substring(0, 300)}`,
        debug: { ...debug, responseTime: `${responseTime}ms` },
      });
    }

    return NextResponse.json({
      success: true,
      message: `连接成功（${responseTime}ms）`,
      debug: { ...debug, responseTime: `${responseTime}ms` },
    });
  } catch (error: any) {
    console.error("[WebSearch Test] error:", error.message);
    return NextResponse.json({
      success: false,
      error: error.message || "连接失败",
    });
  }
}
