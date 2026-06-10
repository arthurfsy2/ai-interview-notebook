import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface MonthlyTrend {
  month: string;
  count: number;
  passCount: number;
  passRate: number;
  avgRating: number;
}

interface ResultDistItem {
  result: string;
  count: number;
  percentage: number;
}

interface CompanyGroup {
  name: string;
  count: number;
  passRate: number;
  avgRating: number;
}

interface TopicStat {
  topic: string;
  count: number;
  passCount: number;
  passRate: number;
}

/** Extract first number from a string like "50-200人" or "1000人以上" */
function extractNumber(text: string): number | null {
  const match = text.match(/(\d[\d,.]*)/);
  if (!match) return null;
  return parseInt(match[1].replace(/,/g, ""), 10);
}

/** Normalize company size to fixed buckets */
function normalizeSize(scale: string): string {
  const num = extractNumber(scale);
  if (num === null) return "未知";
  if (num < 50) return "小型(<50人)";
  if (num < 500) return "中型(50-500人)";
  if (num < 2000) return "大型(500-2000人)";
  return "超大型(>2000人)";
}

/** Safely parse JSON, return null on failure */
function safeParse(json: string | null): any {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Generate month keys between earliest and latest dates */
function fillMonthGaps(months: string[]): string[] {
  if (months.length === 0) return [];
  const sorted = [...months].sort();
  const result: string[] = [];
  const [startYear, startMonth] = sorted[0].split("-").map(Number);
  const [endYear, endMonth] = sorted[sorted.length - 1].split("-").map(Number);

  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    result.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return result;
}

export async function GET() {
  try {
    const interviews = await prisma.interview.findMany({
      where: { userId: "local" },
      include: { preInterviewAnalysis: true },
      orderBy: { interviewDate: "asc" },
    });

    const total = interviews.length;
    const passed = interviews.filter((i) => i.result === "通过").length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    // Aggregate rating and red flags
    let totalRating = 0;
    let totalRedFlags = 0;
    const monthMap: Record<string, { count: number; passCount: number; ratingSum: number; ratingCount: number }> = {};
    const resultMap: Record<string, number> = {};
    const topicMap: Record<string, { count: number; passCount: number }> = {};
    const industryMap: Record<string, { count: number; passCount: number; ratingSum: number }> = {};
    const sizeMap: Record<string, { count: number; passCount: number; ratingSum: number }> = {};
    const modeMap: Record<string, { count: number; passCount: number; ratingSum: number }> = {};

    let hasCompanyData = false;

    for (const interview of interviews) {
      const month = interview.interviewDate.toISOString().slice(0, 7);
      const isPassed = interview.result === "通过";
      const rating = interview.experienceRating;

      totalRating += rating;

      // Monthly aggregation
      if (!monthMap[month]) {
        monthMap[month] = { count: 0, passCount: 0, ratingSum: 0, ratingCount: 0 };
      }
      monthMap[month].count++;
      if (isPassed) monthMap[month].passCount++;
      monthMap[month].ratingSum += rating;
      monthMap[month].ratingCount++;

      // Result distribution
      resultMap[interview.result] = (resultMap[interview.result] || 0) + 1;

      // Mode aggregation (always available as fallback)
      const mode = interview.interviewMode || "未知";
      if (!modeMap[mode]) {
        modeMap[mode] = { count: 0, passCount: 0, ratingSum: 0 };
      }
      modeMap[mode].count++;
      if (isPassed) modeMap[mode].passCount++;
      modeMap[mode].ratingSum += rating;

      // Parse aiTags for topics and red flags
      const aiTags = safeParse(interview.aiTags);
      if (aiTags) {
        if (aiTags.keyTopics && Array.isArray(aiTags.keyTopics)) {
          for (const topic of aiTags.keyTopics) {
            if (!topicMap[topic]) {
              topicMap[topic] = { count: 0, passCount: 0 };
            }
            topicMap[topic].count++;
            if (isPassed) topicMap[topic].passCount++;
          }
        }
        if (aiTags.redFlags && Array.isArray(aiTags.redFlags)) {
          totalRedFlags += aiTags.redFlags.length;
        }
      }

      // Parse company analysis from PreInterviewAnalysis
      const preAnalysis = interview.preInterviewAnalysis;
      if (preAnalysis?.analysisResult) {
        const parsed = safeParse(preAnalysis.analysisResult);
        const companyAnalysis = parsed?.companyAnalysis;
        if (companyAnalysis) {
          hasCompanyData = true;

          // Industry grouping
          const industry = companyAnalysis.industryOutlook || "未知";
          if (!industryMap[industry]) {
            industryMap[industry] = { count: 0, passCount: 0, ratingSum: 0 };
          }
          industryMap[industry].count++;
          if (isPassed) industryMap[industry].passCount++;
          industryMap[industry].ratingSum += rating;

          // Size grouping
          const scale = companyAnalysis.scale || "未知";
          const normalizedSize = normalizeSize(scale);
          if (!sizeMap[normalizedSize]) {
            sizeMap[normalizedSize] = { count: 0, passCount: 0, ratingSum: 0 };
          }
          sizeMap[normalizedSize].count++;
          if (isPassed) sizeMap[normalizedSize].passCount++;
          sizeMap[normalizedSize].ratingSum += rating;
        }
      }
    }

    // Build monthly trend with gap filling
    const rawMonths = Object.keys(monthMap);
    const allMonths = fillMonthGaps(rawMonths);
    const monthlyTrend: MonthlyTrend[] = allMonths.map((month) => {
      const data = monthMap[month] || { count: 0, passCount: 0, ratingSum: 0, ratingCount: 0 };
      return {
        month,
        count: data.count,
        passCount: data.passCount,
        passRate: data.count > 0 ? Math.round((data.passCount / data.count) * 100) : 0,
        avgRating: data.ratingCount > 0 ? Math.round((data.ratingSum / data.ratingCount) * 10) / 10 : 0,
      };
    });

    // Build result distribution
    const resultDistribution: ResultDistItem[] = Object.entries(resultMap)
      .map(([result, count]) => ({
        result,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Build company grouping
    let companyDimension: "industry" | "size" | "mode" = "mode";
    let companyGroups: CompanyGroup[] = [];

    if (hasCompanyData) {
      // Prefer industry, then size
      const industryEntries = Object.entries(industryMap);
      if (industryEntries.length >= 2) {
        companyDimension = "industry";
        companyGroups = industryEntries
          .map(([name, d]) => ({
            name: name.length > 20 ? name.slice(0, 20) + "…" : name,
            count: d.count,
            passRate: d.count > 0 ? Math.round((d.passCount / d.count) * 100) : 0,
            avgRating: d.count > 0 ? Math.round((d.ratingSum / d.count) * 10) / 10 : 0,
          }))
          .sort((a, b) => b.count - a.count);
      } else {
        const sizeEntries = Object.entries(sizeMap);
        if (sizeEntries.length >= 2) {
          companyDimension = "size";
          companyGroups = sizeEntries
            .map(([name, d]) => ({
              name,
              count: d.count,
              passRate: d.count > 0 ? Math.round((d.passCount / d.count) * 100) : 0,
              avgRating: d.count > 0 ? Math.round((d.ratingSum / d.count) * 10) / 10 : 0,
            }))
            .sort((a, b) => b.count - a.count);
        }
      }
    }

    // Fallback to mode if no company data or no industry/size variation
    if (companyGroups.length === 0) {
      companyDimension = "mode";
      companyGroups = Object.entries(modeMap)
        .map(([name, d]) => ({
          name,
          count: d.count,
          passRate: d.count > 0 ? Math.round((d.passCount / d.count) * 100) : 0,
          avgRating: d.count > 0 ? Math.round((d.ratingSum / d.count) * 10) / 10 : 0,
        }))
        .sort((a, b) => b.count - a.count);
    }

    // Build topic stats (top 10)
    const topicStats: TopicStat[] = Object.entries(topicMap)
      .map(([topic, d]) => ({
        topic,
        count: d.count,
        passCount: d.passCount,
        passRate: d.count > 0 ? Math.round((d.passCount / d.count) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Experience trend (from monthlyTrend)
    const experienceTrend = monthlyTrend
      .filter((m) => m.count > 0)
      .map((m) => ({ month: m.month, avgRating: m.avgRating }));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalInterviews: total,
          passRate,
          avgExperienceRating: total > 0 ? Math.round((totalRating / total) * 10) / 10 : 0,
          totalRedFlags,
        },
        monthlyTrend,
        resultDistribution,
        companyGrouping: {
          dimension: companyDimension,
          groups: companyGroups,
        },
        topicStats,
        experienceTrend,
        hasEnoughData: total >= 5,
      },
    });
  } catch (error) {
    console.error("[analytics] error:", error);
    return NextResponse.json({ error: "获取分析数据失败" }, { status: 500 });
  }
}
