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

    console.log("[pre-interview] WebSearch primary:", companyName);
    const primary = await doSearch(`${companyName} 公司 融资 规模 评价`);

    let secondary = "";
    if (altName && altName !== companyName) {
      console.log("[pre-interview] WebSearch secondary:", altName);
      secondary = await doSearch(`${altName} 公司 招聘`);
    }

    // Search for employee reviews and overtime info (P0 enhancement)
    let culture = "";
    try {
      culture = await doSearch(`${companyName} 员工评价 脉脉 看准 加班 工作强度`);
    } catch {}

    const merged = [primary, secondary, culture].filter(Boolean).join("\n");
    return merged;
  } catch (e: any) {
    console.warn("[pre-interview] WebSearch error:", e.message);
    return "";
  }
}

function buildPreferenceSection(profile: any): { salaryInfo: string; preferenceSection: string } {
  let salaryInfo = "";
  let preferenceSection = "";

  let userMonthlySalary = 0;
  let userWorkSchedule = "双休";
  try {
    const salary = JSON.parse(profile.currentSalary || "{}");
    userMonthlySalary = salary.monthlyPreTax || 0;
    userWorkSchedule = salary.workSchedule || "双休";
    if (userMonthlySalary) {
      salaryInfo = `\n用户当前薪资基准：税前 ${userMonthlySalary}/月，${userWorkSchedule}`;
    }
  } catch {}

  try {
    const priorities: string[] = JSON.parse(profile.priorities || "[]");
    const residence: { address?: string; city?: string; district?: string } = JSON.parse(profile.residence || "{}");
    const residenceAddr = residence.address || (residence.city ? `${residence.city}${residence.district || ""}` : "");

    if (priorities.length === 0) return { salaryInfo, preferenceSection };

    const priorityLabels: Record<string, string> = {
      salary: "薪资水平",
      proximity: "离家距离",
      workSchedule: "工作制度",
      stability: "公司稳定性",
      industry: "行业匹配",
    };

    preferenceSection = `\n用户决策偏好（按优先级从高到低排序）：
${priorities.map((p, i) => `${i + 1}. ${priorityLabels[p] || p}`).join("\n")}`;

    if (residenceAddr) {
      preferenceSection += `\n用户家庭地址：${residenceAddr}`;
    }

    // Build salary verdict: pre-calculate to prevent AI from guessing
    let salaryVerdict = "";
    if (userMonthlySalary > 0) {
      const salaryThreshold = Math.round(userMonthlySalary * 0.8);
      salaryVerdict = `\n【薪资强制判定】用户当前薪资为 ${userMonthlySalary}/月（${userWorkSchedule}）。须严格按照以下数值判断，note中必须写明对比双方的具体数字：
- JD上限 >= ${userMonthlySalary} → 完全匹配（+15~20），note格式："JD上限X >= 当前${userMonthlySalary}，匹配"
- JD上限在 ${salaryThreshold}~${userMonthlySalary - 1} → 部分匹配（0），note格式："JD上限X，在${salaryThreshold}~${userMonthlySalary - 1}之间，持平"
- JD上限 < ${salaryThreshold} → 不匹配（-15~20），note格式："JD上限X < ${salaryThreshold}(当前${userMonthlySalary}的80%)，实际降薪"`;
    }

    preferenceSection += `\n
请在决策建议中重点考虑以上偏好，严格按以下标准评分：
- 偏好权重应显著影响 decision.score（第1优先级 ±15~20分，第2~3优先级 ±10~15分，第4~5优先级 ±5~10分）
${salaryVerdict}
距离评估标准（对比JD工作地址与用户家庭地址）：
- 同区或通勤 <5公里 → 完全匹配（加分）
- 同城不同区但通勤5~15公里 → 部分匹配（不加不减）
- 通勤 >15公里或跨城 → 不匹配（扣分）

工作制度评估标准：
- 双休 → 完全匹配，大小周 → 部分匹配，单休/996 → 不匹配

preferenceAnalysis 中请使用用户偏好列表中的准确名称作为 key，note 中必须引用上述具体数字`;
  } catch {}

  return { salaryInfo, preferenceSection };
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

      // Search company background
      let companyBackground = "";
      try {
        companyBackground = await searchCompanyBackground(companyName, searchAltName);
        if (companyBackground) {
          console.log("[pre-interview] Got company background, length:", companyBackground.length);
        }
      } catch {}

      // Get user profile and build preference section
      const profile = await prisma.userProfile.findUnique({ where: { userId: "local" } });
      const { salaryInfo, preferenceSection } = profile
        ? buildPreferenceSection(profile)
        : { salaryInfo: "", preferenceSection: "" };

      const userSchedule = userWorkSchedule && userWorkSchedule !== "未提及"
        ? `\n目标工作制度（用户提供）：${userWorkSchedule}`
        : "";

      const prompt = `请分析以下招聘信息，给出结构化评估。

公司名称：${companyName}
岗位：${position}
JD内容：
${jdRawText}
${salaryInfo}${userSchedule}${preferenceSection}
${companyBackground ? `\n公司背景信息（来自搜索引擎）：\n${companyBackground}` : ""}

请从以下维度分析（返回JSON，只返回JSON不要其他内容）：

{
  "companyAnalysis": {"scale":"规模评估","financingStage":"融资阶段","stabilityRisk":"低|中|高","riskNotes":["风险点"],"industryOutlook":"行业前景"},
  "jdAnalysis": {"coreRequirements":["核心要求"],"niceToHave":["加分项"],"redFlags":["JD危险信号"],"workSchedule":"双休|大小周|单休|996|未提及","listedSalaryRange":"JD薪资范围或null"},
  "salaryConversion": {"targetSchedule":"工作制度","equivalentMonthly":0,"equivalentAnnual":0,"premium":0,"premiumPercent":0,"formula":"换算说明"},
  "resumeMatch": {"overallScore":0,"skillMatch":0,"experienceMatch":0,"industryMatch":0,"matchDetails":[],"gapDetails":[]},
  "careerAssessment": {"outlook":"积极|中性|消极","growthPotential":0,"skillGrowth":[],"titleProgression":"","notes":""},
  "companyCulture": {"keywords":["企业文化关键词"],"employeeSentiment":"积极|中性|消极","highlights":["正面评价"],"warnings":["负面信号"],"source":"数据来源"},
  "workIntensity": {"expectedOvertime":"低|中|高","signals":["加班信号词"],"compensation":"有加班费|调休|无补偿|未提及","weekendWork":"无|偶尔|经常"},
  "benefitsDetail": {"insurance":"五险一金|仅社保|未提及","annualBonus":"有|无|未提及","perks":["福利项目"],"leaveDays":"年假天数或未提及"},
  "decision": {"verdict":"建议去|可考虑|谨慎|不建议","score":0,"pros":[],"cons":[],"summary":"","preferenceAnalysis":{"薪资水平":{"match":"完全匹配|部分匹配|不匹配|待确认","scoreImpact":0,"note":"与用户当前薪资对比"},"离家距离":{"match":"完全匹配|部分匹配|不匹配|待确认","scoreImpact":0,"note":"JD地址与家庭地址的距离"}}}
}`;

      const completion = await openai.chat.completions.create(
        {
          model: aiConfig.model,
          messages: [
            { role: "system", content: `你是一位求职决策顾问。根据JD和公司信息给出客观分析。只返回JSON。

【强制规则 - 必须严格遵守】
${profile ? (() => { try { const s = JSON.parse(profile.currentSalary||"{}"); if(s.monthlyPreTax) return `1. 薪资对比：用户当前薪资为 ${s.monthlyPreTax}/月。preferenceAnalysis中"薪资水平"的match、scoreImpact、note必须基于JD薪资与${s.monthlyPreTax}的数值对比，而非市场水平。JD上限 < ${Math.round(s.monthlyPreTax*0.8)} 则为不匹配。`; } catch { return ""; } })() : ""}
${profile ? (() => { try { const r = JSON.parse(profile.residence||"{}"); const a = r.address||(r.city?r.city+(r.district||""):""); if(a) return `2. 距离对比：用户家庭地址为${a}。preferenceAnalysis中"离家距离"的评估基于JD工作地址与此地址的距离。`; } catch { return ""; } })() : ""}
3. preferenceAnalysis 中每个维度的 note 必须引用上述具体数字` },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 1500,
        },
        { maxRetries: 0, timeout: 120000 }
      );

      // DEBUG: dump full prompt to file for auditing
      try {
        const sysMsg = `你是一位求职决策顾问。根据JD和公司信息给出客观分析。只返回JSON。

【强制规则 - 必须严格遵守】
${profile ? (() => { try { const s = JSON.parse(profile.currentSalary||"{}"); if(s.monthlyPreTax) return `1. 薪资对比：用户当前薪资为 ${s.monthlyPreTax}/月。preferenceAnalysis中"薪资水平"的match、scoreImpact、note必须基于JD薪资与${s.monthlyPreTax}的数值对比，而非市场水平。JD上限 < ${Math.round(s.monthlyPreTax*0.8)} 则为不匹配。`; } catch { return ""; } })() : ""}
${profile ? (() => { try { const r = JSON.parse(profile.residence||"{}"); const a = r.address||(r.city?r.city+(r.district||""):""); if(a) return `2. 距离对比：用户家庭地址为${a}。preferenceAnalysis中"离家距离"的评估基于JD工作地址与此地址的距离。`; } catch { return ""; } })() : ""}
3. preferenceAnalysis 中每个维度的 note 必须引用上述具体数字`;
        require("fs").writeFileSync(".claude/debug-prompt-latest.txt", `=== SYSTEM MESSAGE ===\n${sysMsg}\n\n=== USER PROMPT ===\n${prompt}\n`, "utf-8");
        console.log("[pre-interview] Prompt dumped to .claude/debug-prompt-latest.txt");
      } catch (e) {
        console.error("[pre-interview] Failed to dump prompt:", e.message);
      }

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

        // Post-process: override salary preference with code-calculated result
        if (profile && parsed.decision?.preferenceAnalysis) {
          try {
            const s = JSON.parse(profile.currentSalary || "{}");
            const userSalary = s.monthlyPreTax || 0;
            console.log("[pre-interview] Post-process: userSalary=", userSalary);
            if (userSalary > 0) {
              const jdText = jdRawText || "";
              const salaryMatch = jdText.match(/(?:薪资|工资).*?(\d+)\s*[-~]\s*(\d+)\s*[Kk]/) ||
                                  jdText.match(/(\d+)\s*[-~]\s*(\d+)\s*[Kk]/);
              console.log("[pre-interview] Post-process: salaryMatch=", salaryMatch);
              if (salaryMatch) {
                const jdMax = parseInt(salaryMatch[2]) * 1000;
                const threshold80 = Math.round(userSalary * 0.8);
                let match: string;
                let scoreImpact: number;
                let note: string;
                if (jdMax >= userSalary) {
                  match = "完全匹配"; scoreImpact = 15;
                  note = `JD上限${(jdMax/1000).toFixed(0)}K >= 用户当前${userSalary}，薪资有竞争力`;
                } else if (jdMax >= threshold80) {
                  match = "部分匹配"; scoreImpact = 0;
                  note = `JD上限${(jdMax/1000).toFixed(0)}K 在${threshold80}~${userSalary-1}(当前${userSalary}的80%~100%)之间，基本持平`;
                } else {
                  match = "不匹配"; scoreImpact = -15;
                  note = `JD上限${(jdMax/1000).toFixed(0)}K < ${threshold80}(当前${userSalary}的80%)，实际降薪`;
                }
                console.log("[pre-interview] Post-process: overriding salary ->", { match, scoreImpact, note });
                parsed.decision.preferenceAnalysis["薪资水平"] = { match, scoreImpact, note };
              }
            }

            // Post-process distance: district-level address matching
            try {
              const r = JSON.parse(profile.residence || "{}");
              const homeAddr = r.address || (r.city ? r.city + (r.district || "") : "");
              if (homeAddr) {
                // Extract district: 深圳市盐田区... → 盐田区
                const KNOWN_DISTRICTS = [
                  "盐田区","南山区","福田区","罗湖区","宝安区","龙岗区","龙华区",
                  "坪山区","光明区","大鹏新区","前海","蛇口",
                  "天河区","越秀区","海珠区","荔湾区","白云区","黄埔区","番禺区","花都区","南沙区",
                  "朝阳区","海淀区","丰台区","东城区","西城区","通州区","大兴区","顺义区","昌平区",
                  "浦东新区","徐汇区","静安区","黄浦区","杨浦区","虹口区","长宁区","普陀区","闵行区",
                  "西湖区","滨江区","余杭区","拱墅区","上城区","萧山区","临平区",
                  "武侯区","锦江区","青羊区","金牛区","成华区","高新区",
                ];
                const getDistrict = (addr: string) => {
                  const known = KNOWN_DISTRICTS.find((d) => addr.includes(d));
                  if (known) return known;
                  const m = addr.match(/([一-龥]{2})(?:区|县)/);
                  return m ? m[1] + "区" : "";
                };
                const getCity = (addr: string) => {
                  const m = addr.match(/([一-龥]{2,4}(?:市))/);
                  return m ? m[1] : addr.substring(0, 2);
                };

                // Try to find work address in JD text
                const workAddrMatch = jdRawText.match(/工作地址[：:]\s*([^\n]+)/);
                const workAddr = workAddrMatch ? workAddrMatch[1] : "";
                const jdLocationMatch = jdRawText.match(/(?:城市|工作城市)[：:]\s*([^\n]+)/);

                const homeDistrict = getDistrict(homeAddr);
                const homeCity = getCity(homeAddr) || homeAddr.substring(0, 2);
                const workDistrict = getDistrict(workAddr);
                const workCity = workDistrict ? getCity(workAddr) || workAddr.substring(0, 2) : "";

                console.log("[pre-interview] Post-process distance:", { homeAddr, homeDistrict, homeCity, workAddr: workAddr.substring(0, 50), workDistrict, workCity, jdLocation: jdLocationMatch?.[1] });

                let distMatch: string;
                let distImpact: number;
                let distNote: string;

                if (homeDistrict && workDistrict && homeDistrict === workDistrict) {
                  distMatch = "完全匹配"; distImpact = 15;
                  distNote = `同区（${homeDistrict}），通勤距离预计<5公里`;
                } else if (homeCity && workCity && homeCity === workCity) {
                  distMatch = "部分匹配"; distImpact = 0;
                  distNote = `同城（${homeCity}）不同区，通勤约5~15公里`;
                } else if (homeCity && workCity && homeCity !== workCity) {
                  distMatch = "不匹配"; distImpact = -15;
                  distNote = `跨城（${homeCity} vs ${workCity}），通勤>15公里`;
                } else if (workAddr && homeAddr) {
                  // Have both addresses but can't parse districts clearly
                  distMatch = "待确认";
                  distImpact = 0;
                  distNote = `家庭地址：${homeAddr}，工作地址：${workAddr.substring(0, 60)}，请手动确认距离`;
                } else {
                  distMatch = "待确认";
                  distImpact = 0;
                  distNote = "缺少地址信息，无法评估距离";
                }

                console.log("[pre-interview] Post-process: overriding distance ->", { distMatch, distImpact, distNote });
                parsed.decision.preferenceAnalysis["离家距离"] = { match: distMatch, scoreImpact: distImpact, note: distNote };
              }
            } catch (e) {
              console.error("[pre-interview] Post-process distance error:", e);
            }
          } catch (e) {
            console.error("[pre-interview] Post-process error:", e);
          }
        }

        const decision = parsed.decision || {};
        const verdict = decision.verdict || "可考虑";
        const score = decision.score || 50;

        const redFlags = parsed.companyAnalysis?.riskNotes || [];
        const severeKeywords = ["劳动仲裁", "欠薪", "司法风险", "涉嫌诈骗", "跑路", "倒闭"];
        const hasSevere = redFlags.some((f: string) => severeKeywords.some((k) => f.includes(k)));
        const vetoReason = hasSevere ? `严重风险信号：${redFlags.filter((f: string) => severeKeywords.some((k) => f.includes(k))).join("、")}` : undefined;

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
