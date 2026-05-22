import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const result = searchParams.get("result");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "date";

    const where: any = { userId: "local" };
    if (result && result !== "all") where.result = result;
    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { position: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    const orderBy: any =
      sort === "date"
        ? { interviewDate: "desc" }
        : sort === "rating"
          ? { experienceRating: "desc" }
          : { createdAt: "desc" };

    const interviews = await prisma.interview.findMany({
      where,
      orderBy,
      include: { preInterviewAnalysis: true },
    });

    return NextResponse.json({ success: true, data: interviews });
  } catch (error: any) {
    console.error("[interviews] GET error:", error);
    return NextResponse.json(
      { error: "获取面试记录失败" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const interview = await prisma.interview.create({
      data: {
        userId: "local",
        companyName: body.companyName,
        position: body.position,
        interviewDate: new Date(body.interviewDate),
        interviewMode: body.interviewMode || "线下",
        result: body.result || "待定",
        experienceRating: body.experienceRating || 3,
        rounds: body.rounds || 1,
        salaryRange: body.salaryRange || null,
        commuteTime: body.commuteTime || null,
        workSchedule: body.workSchedule || null,
        notes: body.notes || "",
      },
    });

    return NextResponse.json({ success: true, data: interview }, { status: 201 });
  } catch (error: any) {
    console.error("[interviews] POST error:", error);
    return NextResponse.json(
      { error: "创建面试记录失败" },
      { status: 500 }
    );
  }
}
