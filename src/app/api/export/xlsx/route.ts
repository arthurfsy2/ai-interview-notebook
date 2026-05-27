import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

const RESULT_LABELS: Record<string, string> = {
  "通过": "通过",
  "被拒": "被拒",
  "主动放弃": "主动放弃",
  "无消息": "无消息",
  "待定": "待定",
};

const EXPERIENCE_LABELS: Record<number, string> = {
  1: "体验很差",
  2: "体验中等偏下",
  3: "体验中等",
  4: "体验比较不错",
  5: "体验很好",
};

const MODE_LABELS: Record<string, string> = {
  "线上": "线上",
  "线下": "线下",
  "混合": "混合",
};

export async function GET() {
  try {
    const interviews = await prisma.interview.findMany({
      where: { userId: "local" },
      orderBy: { interviewDate: "desc" },
    });

    const preInterviews = await prisma.preInterviewAnalysis.findMany({
      where: { userId: "local" },
    });

    const rows = interviews.map((iv) => ({
      "公司": iv.companyName,
      "面试岗位": iv.position,
      "面试时间": iv.interviewDate.toISOString().slice(0, 10),
      "面试方式": MODE_LABELS[iv.interviewMode] || iv.interviewMode,
      "轮次": iv.rounds,
      "结果": RESULT_LABELS[iv.result] || iv.result,
      "评价": EXPERIENCE_LABELS[iv.experienceRating] || String(iv.experienceRating),
      "薪资范围": iv.salaryRange || "",
      "通勤时间": iv.commuteTime || "",
      "工作制度": iv.workSchedule || "",
      "备注": iv.notes || "",
    }));

    const preRows = preInterviews.map((pi) => ({
      "公司": pi.companyName,
      "面试岗位": pi.position,
      "面试时间": pi.createdAt.toISOString().slice(0, 10),
      "面试方式": "投前评估",
      "轮次": "",
      "结果": pi.verdict || "",
      "评价": pi.score != null ? `${pi.score}/10` : "",
      "薪资范围": "",
      "通勤时间": "",
      "工作制度": "",
      "备注": pi.vetoReason || "",
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws1, "面试记录");

    if (preRows.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(preRows);
      XLSX.utils.book_append_sheet(wb, ws2, "投前评估");
    }

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="interview-export-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("[export/xlsx] GET error:", error);
    return NextResponse.json(
      { error: "导出失败" },
      { status: 500 }
    );
  }
}
