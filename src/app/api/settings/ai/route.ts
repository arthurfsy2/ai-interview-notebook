import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptSafe, encrypt } from "@/lib/crypto";

// GET: 获取所有 AI 配置
export async function GET() {
  try {
    const [configsSetting, activeSetting] = await Promise.all([
      prisma.settings.findUnique({ where: { key: "ai_configs" } }),
      prisma.settings.findUnique({ where: { key: "ai_active_config" } }),
    ]);

    let configs: any[] = [];
    if (configsSetting?.value) {
      configs = JSON.parse(configsSetting.value);
      // Mask API keys
      configs = configs.map((c: any) => ({
        ...c,
        apiKey: c.apiKey ? "****" : "",
        hasApiKey: !!c.apiKey,
      }));
    }

    return NextResponse.json({
      success: true,
      configs,
      activeId: activeSetting?.value || (configs[0]?.id || ""),
    });
  } catch (error) {
    console.error("[settings/ai] GET error:", error);
    return NextResponse.json({ error: "获取配置失败" }, { status: 500 });
  }
}

// POST: 创建/更新/删除 AI 配置
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const configsSetting = await prisma.settings.findUnique({ where: { key: "ai_configs" } });
    let configs: any[] = [];
    if (configsSetting?.value) {
      configs = JSON.parse(configsSetting.value);
    }

    // Delete
    if (body.action === "delete") {
      configs = configs.filter((c: any) => c.id !== body.id);
      await prisma.settings.upsert({
        where: { key: "ai_configs" },
        update: { value: JSON.stringify(configs) },
        create: { key: "ai_configs", value: JSON.stringify(configs) },
      });

      // If deleted active config, clear active
      const activeSetting = await prisma.settings.findUnique({ where: { key: "ai_active_config" } });
      if (activeSetting?.value === body.id) {
        await prisma.settings.upsert({
          where: { key: "ai_active_config" },
          update: { value: configs[0]?.id || "" },
          create: { key: "ai_active_config", value: configs[0]?.id || "" },
        });
      }

      return NextResponse.json({ success: true, configs });
    }

    // Update existing
    const existingIndex = configs.findIndex((c: any) => c.id === body.id);
    if (existingIndex >= 0) {
      // 编辑时若 apiKey 为空则保留原 key
      const newKey = body.apiKey ? encrypt(body.apiKey) : configs[existingIndex].apiKey;
      configs[existingIndex] = {
        ...configs[existingIndex],
        ...body,
        apiKey: newKey,
      };
    } else {
      // Create new — must provide apiKey
      if (!body.apiKey) {
        return NextResponse.json({ error: "API Key 不能为空" }, { status: 400 });
      }
      configs.push({
        ...body,
        apiKey: encrypt(body.apiKey),
        enabled: body.enabled ?? false,
      });
    }

    await prisma.settings.upsert({
      where: { key: "ai_configs" },
      update: { value: JSON.stringify(configs) },
      create: { key: "ai_configs", value: JSON.stringify(configs) },
    });

    // If this is the first config, auto-set as active
    if (configs.length === 1) {
      await prisma.settings.upsert({
        where: { key: "ai_active_config" },
        update: { value: configs[0].id },
        create: { key: "ai_active_config", value: configs[0].id },
      });
    }

    return NextResponse.json({ success: true, configs });
  } catch (error) {
    console.error("[settings/ai] POST error:", error);
    return NextResponse.json({ error: "保存配置失败" }, { status: 500 });
  }
}

// PATCH: 切换激活配置
export async function PATCH(req: NextRequest) {
  try {
    const { activeId } = await req.json();

    await prisma.settings.upsert({
      where: { key: "ai_active_config" },
      update: { value: activeId },
      create: { key: "ai_active_config", value: activeId },
    });

    return NextResponse.json({ success: true, activeId });
  } catch (error) {
    console.error("[settings/ai] PATCH error:", error);
    return NextResponse.json({ error: "切换失败" }, { status: 500 });
  }
}
