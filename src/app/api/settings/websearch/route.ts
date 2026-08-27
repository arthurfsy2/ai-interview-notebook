import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptSafe } from "@/lib/crypto";

interface WebSearchConfig {
  provider: "tavily" | "exa" | "anysearch";
  apiKey: string;
}

/**
 * GET /api/settings/websearch
 * 读取 WebSearch 配置
 */
export async function GET() {
  try {
    const setting = await prisma.settings.findUnique({ where: { key: "websearch_config" } });
    if (!setting?.value) {
      return NextResponse.json({ success: true, data: null });
    }
    const config: WebSearchConfig = JSON.parse(setting.value);
    return NextResponse.json({
      success: true,
      data: {
        provider: config.provider,
        hasApiKey: !!config.apiKey,
      },
    });
  } catch (error: any) {
    console.error("[websearch] GET error:", error);
    return NextResponse.json({ error: "获取配置失败" }, { status: 500 });
  }
}

/**
 * POST /api/settings/websearch
 * 保存 WebSearch 配置
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, apiKey } = body;

    if (!provider || !["tavily", "exa", "anysearch"].includes(provider)) {
      return NextResponse.json({ error: "无效的搜索引擎" }, { status: 400 });
    }

    // 如果 apiKey 为空，保留原有的
    let finalKey = apiKey;
    if (!apiKey) {
      const existing = await prisma.settings.findUnique({ where: { key: "websearch_config" } });
      if (existing?.value) {
        const parsed = JSON.parse(existing.value);
        finalKey = parsed.apiKey;
      }
    }

    if (!finalKey) {
      return NextResponse.json({ error: "API Key 不能为空" }, { status: 400 });
    }

    await prisma.settings.upsert({
      where: { key: "websearch_config" },
      update: { value: JSON.stringify({ provider, apiKey: finalKey }) },
      create: { key: "websearch_config", value: JSON.stringify({ provider, apiKey: finalKey }) },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[websearch] POST error:", error);
    return NextResponse.json({ error: "保存配置失败" }, { status: 500 });
  }
}
