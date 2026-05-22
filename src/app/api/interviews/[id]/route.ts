import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const interview = await prisma.interview.findUnique({
      where: { id },
      include: { preInterviewAnalysis: true },
    });

    if (!interview) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: interview });
  } catch (error) {
    console.error("[interview] GET error:", error);
    return NextResponse.json({ error: "获取记录失败" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const interview = await prisma.interview.update({
      where: { id },
      data: {
        companyName: body.companyName,
        position: body.position,
        interviewDate: body.interviewDate ? new Date(body.interviewDate) : undefined,
        interviewMode: body.interviewMode,
        result: body.result,
        experienceRating: body.experienceRating,
        rounds: body.rounds,
        salaryRange: body.salaryRange,
        commuteTime: body.commuteTime,
        notes: body.notes,
        aiTags: body.aiTags,
        aiInsights: body.aiInsights,
        questions: body.questions,
      },
    });

    return NextResponse.json({ success: true, data: interview });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }
    console.error("[interview] PUT error:", error);
    return NextResponse.json({ error: "更新记录失败" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.interview.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }
    console.error("[interview] DELETE error:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
