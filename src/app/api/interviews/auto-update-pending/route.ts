import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST: 自动将超过 N 天的"待定"记录更新为"无消息"
export async function POST() {
  try {
    // 读取配置的过期天数（默认14天）
    const setting = await prisma.settings.findUnique({
      where: { key: "pending_auto_expire_days" },
    });
    const days = parseInt(setting?.value || "14", 10);

    // 禁用：天数为 0 或无效值时跳过
    if (!days || days <= 0) {
      return NextResponse.json({ success: true, updatedCount: 0, updatedIds: [] });
    }

    // 计算截止日期：interviewDate + N天 < 当前时间
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // 查询符合条件的"待定"记录
    const pendingInterviews = await prisma.interview.findMany({
      where: {
        userId: "local",
        result: "待定",
        interviewDate: { lt: cutoffDate },
      },
      select: { id: true },
    });

    if (pendingInterviews.length === 0) {
      return NextResponse.json({ success: true, updatedCount: 0, updatedIds: [] });
    }

    // 批量更新
    const result = await prisma.interview.updateMany({
      where: {
        id: { in: pendingInterviews.map((i) => i.id) },
      },
      data: { result: "无消息" },
    });

    console.log(
      `[auto-update-pending] Updated ${result.count} interviews from "待定" to "无消息" (threshold: ${days} days)`
    );

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
      updatedIds: pendingInterviews.map((i) => i.id),
    });
  } catch (error) {
    console.error("[auto-update-pending] error:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
