import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeNotes } from "@/lib/ai/prompts";

export const maxDuration = 120; // 2 分钟，适配免费模型慢响应

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const interview = await prisma.interview.findUnique({ where: { id } });

    if (!interview) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }

    if (!interview.notes || interview.notes.trim().length < 5) {
      return NextResponse.json({ error: "备注内容太少，无法分析" }, { status: 400 });
    }

    const result = await analyzeNotes(interview.notes, interview.position);

    await prisma.interview.update({
      where: { id },
      data: {
        aiTags: JSON.stringify(result.tags),
        aiInsights: JSON.stringify(result.insights),
        questions: result.questions ? JSON.stringify(result.questions) : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        aiTags: result.tags,
        aiInsights: result.insights,
        questions: result.questions,
        _error: (result as any)._error || null,
      },
    });
  } catch (error: any) {
    console.error("[analyze] error:", error);
    return NextResponse.json(
      { error: error.message || "AI 分析失败" },
      { status: 500 }
    );
  }
}
