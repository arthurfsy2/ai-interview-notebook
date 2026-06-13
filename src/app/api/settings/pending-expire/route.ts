import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SETTING_KEY = "pending_auto_expire_days";
const DEFAULT_DAYS = 14;

// GET: 获取待定记录自动过期天数
export async function GET() {
  try {
    const setting = await prisma.settings.findUnique({
      where: { key: SETTING_KEY },
    });
    const days = parseInt(setting?.value || String(DEFAULT_DAYS), 10);
    return NextResponse.json({ success: true, days });
  } catch (error) {
    console.error("[settings/pending-expire] GET error:", error);
    return NextResponse.json({ success: true, days: DEFAULT_DAYS });
  }
}

// POST: 保存待定记录自动过期天数
export async function POST(req: NextRequest) {
  try {
    const { days } = await req.json();
    const value = String(Math.max(0, parseInt(String(days), 10) || 0));

    await prisma.settings.upsert({
      where: { key: SETTING_KEY },
      update: { value },
      create: { key: SETTING_KEY, value },
    });

    return NextResponse.json({ success: true, days: parseInt(value, 10) });
  } catch (error) {
    console.error("[settings/pending-expire] POST error:", error);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}
