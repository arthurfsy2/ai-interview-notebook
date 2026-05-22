import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const analyses = await prisma.preInterviewAnalysis.findMany({
      where: { userId: "local" },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: analyses });
  } catch (error) {
    console.error("[pre-interview] GET error:", error);
    return NextResponse.json({ error: "获取分析列表失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const analysis = await prisma.preInterviewAnalysis.create({
      data: {
        userId: "local",
        companyName: body.companyName,
        position: body.position,
        jdRawText: body.jdRawText,
      },
    });

    return NextResponse.json({ success: true, data: analysis }, { status: 201 });
  } catch (error) {
    console.error("[pre-interview] POST error:", error);
    return NextResponse.json({ error: "创建分析失败" }, { status: 500 });
  }
}
