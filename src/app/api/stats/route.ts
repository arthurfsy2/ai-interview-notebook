import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const interviews = await prisma.interview.findMany({
      where: { userId: "local" },
    });

    const totalInterviews = interviews.length;
    const passed = interviews.filter((i) => i.result === "通过").length;
    const passRate = totalInterviews > 0 ? Math.round((passed / totalInterviews) * 100) : 0;
    const goodExperience = interviews.filter((i) => i.experienceRating >= 4).length;
    const hasRedFlags = interviews.filter((i) => {
      if (!i.aiTags) return false;
      try {
        const tags = JSON.parse(i.aiTags);
        return tags.redFlags && tags.redFlags.length > 0;
      } catch {
        return false;
      }
    }).length;

    return NextResponse.json({
      success: true,
      data: {
        totalInterviews,
        passRate,
        goodExperience,
        highRiskCompanies: hasRedFlags,
      },
    });
  } catch (error) {
    console.error("[stats] error:", error);
    return NextResponse.json({ error: "获取统计数据失败" }, { status: 500 });
  }
}
