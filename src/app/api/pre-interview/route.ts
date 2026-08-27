import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const verdict = searchParams.get("verdict") || "";
    const minScore = searchParams.get("minScore");
    const maxScore = searchParams.get("maxScore");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const where: any = { userId: "local" };

    // 搜索公司名称或职位
    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { position: { contains: search } },
      ];
    }

    // 过滤评估结果
    if (verdict) {
      where.verdict = verdict;
    }

    // 过滤评分范围
    if (minScore || maxScore) {
      where.score = {};
      if (minScore) where.score.gte = parseInt(minScore);
      if (maxScore) where.score.lte = parseInt(maxScore);
    }

    const orderBy: any = {};
    if (sortBy === "score") {
      orderBy.score = sortOrder;
    } else if (sortBy === "companyName") {
      orderBy.companyName = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const analyses = await prisma.preInterviewAnalysis.findMany({
      where,
      orderBy,
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
        workAddress: body.workAddress || null,
        jdRawText: body.jdRawText,
      },
    });

    return NextResponse.json({ success: true, data: analysis }, { status: 201 });
  } catch (error) {
    console.error("[pre-interview] POST error:", error);
    return NextResponse.json({ error: "创建分析失败" }, { status: 500 });
  }
}
