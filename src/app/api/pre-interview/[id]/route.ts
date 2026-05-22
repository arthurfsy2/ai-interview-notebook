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

    return NextResponse.json({ success: true, data: analysis });
  } catch (error) {
    console.error("[pre-interview] GET error:", error);
    return NextResponse.json({ error: "获取分析失败" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.preInterviewAnalysis.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[pre-interview] DELETE error:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
