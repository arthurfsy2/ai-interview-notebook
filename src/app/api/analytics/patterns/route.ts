import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getConfigForPurpose } from "@/lib/ai/config";
import { normalizeAIUrl } from "@/lib/ai-url";
import OpenAI from "openai";
import type { PatternAnalysisResult } from "@/types";

export const maxDuration = 120; // 2 minutes

export async function GET(req: NextRequest) {
  try {
    // Get all interviews for the user
    const interviews = await prisma.interview.findMany({
      where: { userId: "local" },
      orderBy: { createdAt: "asc" },
    });

    // Check if we have enough data
    if (interviews.length < 5) {
      return NextResponse.json({
        success: true,
        data: null,
        reason: "insufficient_data",
        currentCount: interviews.length,
        requiredCount: 5,
      });
    }

    // Check for cached result
    const cachedResult = await prisma.patternAnalysis.findFirst({
      where: {
        userId: "local",
        interviewCount: interviews.length,
      },
      orderBy: { createdAt: "desc" },
    });

    // If cached and less than 24 hours old, return it
    if (cachedResult) {
      const updatedAt = new Date(cachedResult.updatedAt).getTime();
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (now - updatedAt < twentyFourHours) {
        return NextResponse.json({
          success: true,
          data: JSON.parse(cachedResult.analysisResult),
          cached: true,
        });
      }
    }

    // Compute aggregated statistics in code
    const stats = computeInterviewStats(interviews);

    // Get AI config
    const aiConfig = await getConfigForPurpose("text");
    if (!aiConfig.apiKey) {
      return NextResponse.json({
        success: true,
        data: stats, // Return raw stats without AI analysis
        reason: "ai_not_configured",
      });
    }

    const normalizedUrl = normalizeAIUrl(aiConfig.baseUrl, aiConfig.provider);
    if (!normalizedUrl || !normalizedUrl.startsWith("http")) {
      return NextResponse.json({
        success: true,
        data: stats,
        reason: "ai_url_invalid",
      });
    }

    const openai = new OpenAI({
      apiKey: aiConfig.apiKey,
      baseURL: normalizedUrl,
      timeout: 120000,
    });

    // Build prompt for AI analysis
    const prompt = buildPatternAnalysisPrompt(stats);

    const completion = await openai.chat.completions.create(
      {
        model: aiConfig.model,
        messages: [
          {
            role: "system",
            content: `你是一位求职数据分析师。基于以下统计数据，发现跨面试的模式和趋势。只返回JSON。

要求分析：
1. highFrequencyRedFlags / highFrequencyGreenFlags - 按出现频次排序，包含百分比
2. preferencePattern - 基于面试结果和标记，推断用户的求职偏好倾向（2-3条）
3. growthTrajectory - 根据面试结果的时间序列变化判断成长趋势（trend: improving/stable/declining）
4. topicDistribution - 技术考察主题的分布和趋势（increasing/stable/decreasing）
5. summary - 一句话总结整体模式

置信度规则：
- 面试数 5-9：confidence 0.4-0.6
- 面试数 10-19：confidence 0.6-0.8
- 面试数 20+：confidence 0.8-1.0`,
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      },
      { maxRetries: 0, timeout: 120000 }
    );

    const responseText = completion.choices[0]?.message?.content || "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      let parsed: any;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        // Try to fix incomplete JSON
        let fixed = jsonMatch[0];
        const openBraces = (fixed.match(/\{/g) || []).length;
        const closeBraces = (fixed.match(/\}/g) || []).length;
        for (let i = closeBraces; i < openBraces; i++) fixed += "}";
        try {
          parsed = JSON.parse(fixed);
        } catch {
          // Return raw stats if AI parsing fails
          return NextResponse.json({
            success: true,
            data: stats,
            reason: "ai_parse_error",
          });
        }
      }

      // Merge computed stats with AI analysis
      const result: PatternAnalysisResult = {
        ...stats,
        preferencePattern: parsed.preferencePattern || [],
        growthTrajectory: parsed.growthTrajectory || {
          trend: "stable",
          evidence: [],
          recommendations: [],
        },
        topicDistribution: parsed.topicDistribution || stats.topTopics.map(t => ({
          topic: t.topic,
          count: t.count,
          trend: "stable" as const,
        })),
        confidence: parsed.confidence || calculateConfidence(interviews.length),
        summary: parsed.summary || "",
        analyzedAt: new Date().toISOString(),
      };

      // Cache the result
      await prisma.patternAnalysis.create({
        data: {
          userId: "local",
          interviewCount: interviews.length,
          analysisResult: JSON.stringify(result),
        },
      });

      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    // Return raw stats if AI doesn't return JSON
    return NextResponse.json({
      success: true,
      data: stats,
      reason: "ai_no_json",
    });
  } catch (error: any) {
    console.error("[patterns] GET error:", error);
    return NextResponse.json(
      { error: error.message || "模式分析失败" },
      { status: 500 }
    );
  }
}

function computeInterviewStats(interviews: any[]) {
  // Result distribution
  const resultDistribution: Record<string, number> = {};
  interviews.forEach((i) => {
    resultDistribution[i.result] = (resultDistribution[i.result] || 0) + 1;
  });

  // Pass rate
  const passCount = resultDistribution["通过"] || 0;
  const passRate = Math.round((passCount / interviews.length) * 100);

  // Experience rating distribution
  const experienceDistribution: Record<number, number> = {};
  let totalRating = 0;
  interviews.forEach((i) => {
    experienceDistribution[i.experienceRating] =
      (experienceDistribution[i.experienceRating] || 0) + 1;
    totalRating += i.experienceRating;
  });
  const avgExperienceRating = Math.round((totalRating / interviews.length) * 10) / 10;

  // Red flags aggregation
  const redFlagCounts: Record<string, number> = {};
  interviews.forEach((i) => {
    if (i.aiTags) {
      try {
        const tags = JSON.parse(i.aiTags);
        if (tags.redFlags) {
          tags.redFlags.forEach((flag: string) => {
            redFlagCounts[flag] = (redFlagCounts[flag] || 0) + 1;
          });
        }
      } catch {}
    }
  });
  const highFrequencyRedFlags = Object.entries(redFlagCounts)
    .map(([flag, count]) => ({
      flag,
      count,
      percentage: Math.round((count / interviews.length) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Green flags aggregation
  const greenFlagCounts: Record<string, number> = {};
  interviews.forEach((i) => {
    if (i.aiTags) {
      try {
        const tags = JSON.parse(i.aiTags);
        if (tags.greenFlags) {
          tags.greenFlags.forEach((flag: string) => {
            greenFlagCounts[flag] = (greenFlagCounts[flag] || 0) + 1;
          });
        }
      } catch {}
    }
  });
  const highFrequencyGreenFlags = Object.entries(greenFlagCounts)
    .map(([flag, count]) => ({
      flag,
      count,
      percentage: Math.round((count / interviews.length) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Interviewer style aggregation
  const styleCounts: Record<string, number> = {};
  interviews.forEach((i) => {
    if (i.aiTags) {
      try {
        const tags = JSON.parse(i.aiTags);
        if (tags.interviewerStyle) {
          styleCounts[tags.interviewerStyle] =
            (styleCounts[tags.interviewerStyle] || 0) + 1;
        }
      } catch {}
    }
  });
  const dominantInterviewerStyles = Object.entries(styleCounts)
    .map(([style, count]) => ({ style, count }))
    .sort((a, b) => b.count - a.count);

  // Rejection reasons aggregation
  const rejectionCounts: Record<string, number> = {};
  interviews.forEach((i) => {
    if (i.aiTags) {
      try {
        const tags = JSON.parse(i.aiTags);
        if (tags.rejectionReason) {
          rejectionCounts[tags.rejectionReason] =
            (rejectionCounts[tags.rejectionReason] || 0) + 1;
        }
      } catch {}
    }
  });
  const topRejectionReasons = Object.entries(rejectionCounts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  // Topics aggregation
  const topicCounts: Record<string, number> = {};
  interviews.forEach((i) => {
    if (i.aiTags) {
      try {
        const tags = JSON.parse(i.aiTags);
        if (tags.keyTopics) {
          tags.keyTopics.forEach((topic: string) => {
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
          });
        }
      } catch {}
    }
  });
  const topTopics = Object.entries(topicCounts)
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalInterviews: interviews.length,
    resultDistribution,
    passRate,
    avgExperienceRating,
    experienceDistribution,
    highFrequencyRedFlags,
    highFrequencyGreenFlags,
    dominantInterviewerStyles,
    topRejectionReasons,
    topTopics,
  };
}

function calculateConfidence(interviewCount: number): number {
  if (interviewCount >= 20) return 0.9;
  if (interviewCount >= 15) return 0.8;
  if (interviewCount >= 10) return 0.7;
  if (interviewCount >= 8) return 0.6;
  if (interviewCount >= 5) return 0.5;
  return 0.4;
}

function buildPatternAnalysisPrompt(stats: any): string {
  return `基于以下面试统计数据，发现跨面试的模式和趋势。

总面试数: ${stats.totalInterviews}
通过率: ${stats.passRate}%
平均体验评分: ${stats.avgExperienceRating}/5

结果分布: ${JSON.stringify(stats.resultDistribution)}
高频风险信号: ${JSON.stringify(stats.highFrequencyRedFlags)}
高频正面信号: ${JSON.stringify(stats.highFrequencyGreenFlags)}
面试官风格分布: ${JSON.stringify(stats.dominantInterviewerStyles)}
拒绝原因分布: ${JSON.stringify(stats.topRejectionReasons)}
技术主题分布: ${JSON.stringify(stats.topTopics)}

请分析：
1. preferencePattern - 基于面试结果和标记，推断用户的求职偏好倾向
2. growthTrajectory - 根据面试结果的时间序列变化判断成长趋势
3. topicDistribution - 技术考察主题的分布和趋势

返回JSON格式：
{
  "preferencePattern": ["偏好1", "偏好2", "偏好3"],
  "growthTrajectory": {
    "trend": "improving|stable|declining",
    "evidence": ["证据1", "证据2"],
    "recommendations": ["建议1", "建议2"]
  },
  "topicDistribution": [
    {"topic": "主题名", "count": 数量, "trend": "increasing|stable|decreasing"}
  ],
  "confidence": 0.7,
  "summary": "一句话总结整体模式"
}`;
}
