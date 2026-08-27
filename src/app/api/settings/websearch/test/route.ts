import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptSafe } from "@/lib/crypto";

interface TestRequest {
  apiKey?: string;
  provider?: string;
}

function getProviderConfig(provider: string, apiKey: string) {
  switch (provider) {
    case "tavily":
      return {
        url: "https://api.tavily.com/search",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: { query: "test", max_results: 1 },
        name: "Tavily",
      };
    case "exa":
      return {
        url: "https://api.exa.ai/search",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: { query: "test", num_results: 1 },
        name: "Exa",
      };
    case "anysearch":
      return {
        url: "https://api.anysearch.com/v1/search",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: { query: "test", max_results: 1 },
        name: "AnySearch",
      };
    default:
      return null;
  }
}

/**
 * POST /api/settings/websearch/test
 * 测试 WebSearch API 连接
 */
export async function POST(request: Request) {
  try {
    const { apiKey: rawApiKey, provider: reqProvider } = await request.json();

    let apiKey = rawApiKey;
    let provider = reqProvider;

    // 前端未传时，从数据库读取
    if (!apiKey || !provider) {
      const configsSetting = await prisma.settings.findUnique({ where: { key: "websearch_config" } });
      if (configsSetting?.value) {
        const stored = JSON.parse(configsSetting.value);
        if (!apiKey && stored.apiKey) apiKey = decryptSafe(stored.apiKey);
        if (!provider && stored.provider) provider = stored.provider;
      }
    }

    // 兼容旧数据：从 ai_configs 中读取
    if (!apiKey) {
      const configsSetting = await prisma.settings.findUnique({ where: { key: "ai_configs" } });
      if (configsSetting?.value) {
        const configs = JSON.parse(configsSetting.value);
        const stored = configs.find((c: any) => c.id === "websearch");
        if (stored?.apiKey) {
          apiKey = decryptSafe(stored.apiKey);
          // 旧数据没有 provider 字段，根据 key 前缀推断
          if (!provider) {
            if (apiKey.startsWith("tvly-")) provider = "tavily";
            else if (apiKey.startsWith("exa-")) provider = "exa";
            else provider = "tavily"; // 默认
          }
        }
      }
    }

    if (!apiKey || !provider) {
      return NextResponse.json({ success: false, error: "API Key 和搜索引擎不能为空" });
    }

    const config = getProviderConfig(provider, apiKey);
    if (!config) {
      return NextResponse.json({ success: false, error: `不支持的搜索引擎: ${provider}` });
    }

    const debug = {
      requestUrl: config.url,
      provider: config.name,
      apiKeyMasked: apiKey ? `${apiKey.substring(0, 8)}...${apiKey.slice(-4)}` : "(empty)",
    };
    const startTime = Date.now();

    console.log("[WebSearch Test]", debug);

    let fetchResponse: Response;
    try {
      fetchResponse = await fetch(config.url, {
        method: "POST",
        headers: config.headers,
        body: JSON.stringify(config.body),
      });
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
    return NextResponse.json({ success: false, error: error.message || "连接失败" });
  }
}
