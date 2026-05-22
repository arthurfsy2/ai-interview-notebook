import { NextResponse } from "next/server";
import { normalizeAIUrl } from "@/lib/ai-url";
import { prisma } from "@/lib/prisma";
import { decryptSafe } from "@/lib/crypto";

/**
 * POST /api/settings/ai/test
 * 测试 AI 连接：发一个最小请求到 {baseUrl}/chat/completions，验证配置是否正确
 */
export async function POST(request: Request) {
  try {
    const {
      apiKey: rawApiKey,
      baseUrl,
      model,
      provider,
      configId,
    } = await request.json();

    let apiKey = rawApiKey;

    // 前端未传 apiKey 时，从数据库读取已保存的 key
    if (!apiKey && configId) {
      const configsSetting = await prisma.settings.findUnique({
        where: { key: "ai_configs" },
      });
      if (configsSetting?.value) {
        const configs = JSON.parse(configsSetting.value);
        const stored = configs.find((c: any) => c.id === configId);
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

    const normalizedUrl = normalizeAIUrl(baseUrl || "", provider);
    const trimmedModel = (model || "").trim();

    const fetchUrl = `${normalizedUrl}/chat/completions`;
    const debug = {
      requestUrl: fetchUrl,
      method: "POST",
      normalizedBaseUrl: normalizedUrl,
      requestModel: trimmedModel,
      apiKeyMasked: apiKey ? `${apiKey.substring(0, 8)}...${apiKey.slice(-4)}` : "(empty)",
    };
    const startTime = Date.now();

    console.log("[AI Test]", { provider, model: trimmedModel, baseUrl: normalizedUrl });

    let fetchResponse: Response;
    try {
      fetchResponse = await fetch(fetchUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: trimmedModel,
          messages: [{ role: "user", content: "Hi" }],
          max_tokens: 3,
        }),
      });
    } catch (fetchErr: any) {
      console.error("[AI Test] fetch 异常:", fetchErr.message);
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
        debug,
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(responseBody);
    } catch {
      return NextResponse.json({
        success: false,
        error: `响应解析失败: ${responseBody.substring(0, 200)}`,
        debug,
      });
    }

    if (parsed.choices?.length > 0) {
      return NextResponse.json({
        success: true,
        message: `模型 ${parsed.model || trimmedModel} 响应正常（${responseTime}ms）`,
        data: {
          model: parsed.model || trimmedModel,
          responseTime: `${responseTime}ms`,
          tokenUsage: parsed.usage,
        },
        debug,
      });
    }

    return NextResponse.json({
      success: false,
      error: "未收到模型响应",
      debug,
    });
  } catch (error: any) {
    console.error("[AI Test] 连接失败:", error.message);
    return NextResponse.json({
      success: false,
      error: error.message || "连接失败",
    });
  }
}
