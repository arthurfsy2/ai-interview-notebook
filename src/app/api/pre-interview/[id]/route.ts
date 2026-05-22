import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const analysis = await prisma.preInterviewAnalysis.findUnique({
      where: { id },
      include: { interview: true },
    });

    if (!analysis) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }

    const result = {
      id: analysis.id,
      userId: analysis.userId,
      companyName: analysis.companyName,
      position: analysis.position,
      jdRawText: analysis.jdRawText,
      analysisResult: analysis.analysisResult,
      verdict: analysis.verdict,
      score: analysis.score,
      vetoReason: analysis.vetoReason,
      linkedInterviewId: analysis.linkedInterviewId,
      interview: analysis.interview,
      createdAt: analysis.createdAt,
    };

    console.log("[pre-interview GET] linkedInterviewId:", analysis.linkedInterviewId, "->", result.linkedInterviewId);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[pre-interview] GET error:", error);
    return NextResponse.json({ error: "获取分析失败" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updated = await prisma.preInterviewAnalysis.update({
      where: { id },
      data: {
        linkedInterviewId: body.linkedInterviewId || null,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[pre-interview] PATCH error:", error);
    return NextResponse.json({ error: "关联失败" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Unbind linked interview before deleting
    const analysis = await prisma.preInterviewAnalysis.findUnique({ where: { id } });
    if (analysis?.linkedInterviewId) {
      await prisma.preInterviewAnalysis.update({
        where: { id },
        data: { linkedInterviewId: null },
      });
    }

    await prisma.preInterviewAnalysis.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[pre-interview] DELETE error:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
