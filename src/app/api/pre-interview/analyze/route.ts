import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { getConfigForPurpose, normalizeAIUrl } from "@/lib/ai/config";
import { decryptSafe } from "@/lib/crypto";

export const maxDuration = 120;

async function searchCompanyBackground(companyName: string, altName?: string): Promise<string> {
  try {
    const configsSetting = await prisma.settings.findUnique({ where: { key: "ai_configs" } });
    if (!configsSetting?.value) return "";

    const configs = JSON.parse(configsSetting.value);
    const wsConfig = configs.find((c: any) => c.id === "websearch");
    if (!wsConfig?.apiKey) return "";

    const apiKey = decryptSafe(wsConfig.apiKey);
    if (!apiKey) return "";

    const isTavily = apiKey.startsWith("tvly-");

    const fetchUrl = isTavily
      ? "https://api.tavily.com/search"
      : "https://api.exa.ai/search";

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (isTavily) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    } else {
      headers["x-api-key"] = apiKey;
    }

    const doSearch = async (query: string) => {
      const body = isTavily
        ? JSON.stringify({ query, max_results: 3 })
        : JSON.stringify({ query, num_results: 3 });
      const res = await fetch(fetchUrl, { method: "POST", headers, body });
      if (!res.ok) return "";
      const data = await res.json();
      const results = isTavily ? data.results : data.results;
      if (!results?.length) return "";
      return results
        .map((r: any) => `- ${r.title || ""}: ${r.content || r.snippet || ""}`)
        .join("\n");
    };

    // Primary search: full company name
    console.log("[pre-interview] WebSearch primary:", companyName);
    const primary = await doSearch(`${companyName} 公司 融资 规模 评价`);

    // Secondary search: BOSS display name (if different and primary looks wrong)
    let secondary = "";
    if (altName && altName !== companyName) {
      console.log("[pre-interview] WebSearch secondary:", altName);
      secondary = await doSearch(`${altName} 公司 招聘`);
    }

    // Merge: primary first, then secondary
    const merged = [primary, secondary].filter(Boolean).join("\n");
    return merged;
  } catch (e: any) {
    console.warn("[pre-interview] WebSearch error:", e.message);
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyName, position, jdRawText, analysisId, searchAltName, workSchedule: userWorkSchedule } = body;

    if (!companyName || !jdRawText) {
      return NextResponse.json({ error: "公司名称和JD不能为空" }, { status: 400 });
    }

    // Create or reuse analysis record
    let analysis;
    if (analysisId) {
      analysis = await prisma.preInterviewAnalysis.findUnique({ where: { id: analysisId } });
      if (!analysis) {
        return NextResponse.json({ error: "分析记录不存在" }, { status: 404 });
      }
      // Clear previous result for re-analysis
    } else {
      analysis = await prisma.preInterviewAnalysis.create({
        data: {
          userId: "local",
          companyName,
          position: position || "",
          jdRawText,
        },
      });
    }

    let analysisError: string | null = null;

    try {
      const aiConfig = await getConfigForPurpose("text");

      if (!aiConfig.apiKey) {
        analysisError = "未配置 AI API Key";
        throw new Error(analysisError);
      }

      const normalizedUrl = normalizeAIUrl(aiConfig.baseUrl, aiConfig.provider);
      console.log("[pre-interview] Using AI:", {
        provider: aiConfig.provider,
        rawUrl: aiConfig.baseUrl,
        normalizedUrl,
        fullEndpoint: `${normalizedUrl}/chat/completions`,
        model: aiConfig.model,
        hasKey: !!aiConfig.apiKey,
      });

      if (!normalizedUrl || !normalizedUrl.startsWith("http")) {
        analysisError = `AI API 地址无效：${normalizedUrl || "(空)"}`;
        throw new Error(analysisError);
      }

      const openai = new OpenAI({
        apiKey: aiConfig.apiKey,
        baseURL: normalizedUrl,
        timeout: 120000,
      });

      // Search company background if WebSearch key is configured
      let companyBackground = "";
      try {
        companyBackground = await searchCompanyBackground(companyName, searchAltName);
        if (companyBackground) {
          console.log("[pre-interview] Got company background, length:", companyBackground.length);
        }
      } catch {}

      // Get user profile for salary comparison
      const profile = await prisma.userProfile.findUnique({ where: { userId: "local" } });
      let salaryInfo = "";
      if (profile) {
        try {
          const salary = JSON.parse(profile.currentSalary || "{}");
          if (salary.monthlyPreTax) {
            salaryInfo = `\n用户当前薪资基准：税前 ${salary.monthlyPreTax}/月，${salary.workSchedule || "双休"}`;
          }
        } catch {}
      }

      const userSchedule = userWorkSchedule && userWorkSchedule !== "未提及"
        ? `\n目标工作制度（用户提供）：${userWorkSchedule}`
        : "";

      const prompt = `请分析以下招聘信息，给出结构化评估。

公司名称：${companyName}
岗位：${position}
JD内容：
${jdRawText}
${salaryInfo}${userSchedule}
${companyBackground ? `\n公司背景信息（来自搜索引擎）：\n${companyBackground}` : ""}

请从以下维度分析（返回JSON，只返回JSON不要其他内容）：

{
  "companyAnalysis": {"scale":"规模评估","financingStage":"融资阶段","stabilityRisk":"低|中|高","riskNotes":["风险点"],"industryOutlook":"行业前景"},
  "jdAnalysis": {"coreRequirements":["核心要求"],"niceToHave":["加分项"],"redFlags":["JD危险信号"],"workSchedule":"双休|大小周|单休|996|未提及","listedSalaryRange":"JD薪资范围或null"},
  "salaryConversion": {"targetSchedule":"工作制度","equivalentMonthly":0,"equivalentAnnual":0,"premium":0,"premiumPercent":0,"formula":"换算说明"},
  "resumeMatch": {"overallScore":0,"skillMatch":0,"experienceMatch":0,"industryMatch":0,"matchDetails":[],"gapDetails":[]},
  "careerAssessment": {"outlook":"积极|中性|消极","growthPotential":0,"skillGrowth":[],"titleProgression":"","notes":""},
  "decision": {"verdict":"建议去|可考虑|谨慎|不建议","score":0,"pros":[],"cons":[],"summary":""}
}`;

      const completion = await openai.chat.completions.create(
        {
          model: aiConfig.model,
          messages: [
            { role: "system", content: "你是一位求职决策顾问。根据JD和公司信息给出客观分析。只返回JSON。" },
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
          let fixed = jsonMatch[0];
          const openBraces = (fixed.match(/\{/g) || []).length;
          const closeBraces = (fixed.match(/\}/g) || []).length;
          for (let i = closeBraces; i < openBraces; i++) fixed += "}";
          parsed = JSON.parse(fixed);
        }

        const decision = parsed.decision || {};
        const verdict = decision.verdict || "可考虑";
        const score = decision.score || 50;

        const redFlags = parsed.companyAnalysis?.riskNotes || [];
        const severeKeywords = ["劳动仲裁", "欠薪", "司法风险", "涉嫌诈骗", "跑路", "倒闭"];
        const hasSevere = redFlags.some((f: string) => severeKeywords.some((k) => f.includes(k)));
        const vetoReason = hasSevere ? `严重风险信号：${redFlags.filter((f: string) => severeKeywords.some((k) => f.includes(k))).join("、")}` : undefined;

        // 标注数据来源
        const enriched = {
          ...parsed,
          _source: {
            hasWebSearch: !!companyBackground,
            searchedAt: companyBackground ? new Date().toISOString() : null,
            webSearchSnippet: companyBackground ? companyBackground.substring(0, 500) : null,
          },
        };

        await prisma.preInterviewAnalysis.update({
          where: { id: analysis.id },
          data: {
            analysisResult: JSON.stringify(enriched),
            verdict: hasSevere ? "不建议" : verdict,
            score: hasSevere ? Math.min(score, 39) : score,
            vetoReason: vetoReason || null,
          },
        });

        return NextResponse.json({
          success: true,
          data: {
            ...analysis,
            analysisResult: JSON.stringify(parsed),
            verdict: hasSevere ? "不建议" : verdict,
            score: hasSevere ? Math.min(score, 39) : score,
            vetoReason,
          },
        });
      }
    } catch (aiError: any) {
      const msg = aiError?.message || String(aiError);
      console.error("[pre-interview/analyze] AI error:", msg);
      analysisError = msg;

      // Store error in DB so detail page can show it
      await prisma.preInterviewAnalysis.update({
        where: { id: analysis.id },
        data: {
          analysisResult: JSON.stringify({ _error: msg }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: { ...analysis, analysisResult: analysisError ? JSON.stringify({ _error: analysisError }) : analysis.analysisResult },
      _error: analysisError,
    });
  } catch (error: any) {
    console.error("[pre-interview/analyze] error:", error);
    return NextResponse.json({ error: error.message || "分析失败" }, { status: 500 });
  }
}
