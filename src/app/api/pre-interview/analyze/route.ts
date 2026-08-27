import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { getConfigForPurpose, normalizeAIUrl } from "@/lib/ai/config";
import { decryptSafe } from "@/lib/crypto";
import { geocode, getAmapKey, drivingDistance, formatDrivingResult } from "@/lib/amap";

export const maxDuration = 180; // 3 minutes for multiple AI calls

async function searchCompanyBackground(companyName: string, altName?: string): Promise<string> {
  try {
    // 优先从新的 websearch_config 读取
    let provider = "";
    let apiKey = "";

    const wsSetting = await prisma.settings.findUnique({ where: { key: "websearch_config" } });
    if (wsSetting?.value) {
      const wsConfig = JSON.parse(wsSetting.value);
      provider = wsConfig.provider || "";
      apiKey = wsConfig.apiKey ? decryptSafe(wsConfig.apiKey) : "";
    }

    // 兼容旧数据：从 ai_configs 中读取
    if (!apiKey) {
      const configsSetting = await prisma.settings.findUnique({ where: { key: "ai_configs" } });
      if (configsSetting?.value) {
        const configs = JSON.parse(configsSetting.value);
        const wsConfig = configs.find((c: any) => c.id === "websearch");
        if (wsConfig?.apiKey) {
          apiKey = decryptSafe(wsConfig.apiKey);
          if (!provider) {
            if (apiKey.startsWith("tvly-")) provider = "tavily";
            else if (apiKey.startsWith("exa-")) provider = "exa";
            else provider = "tavily";
          }
        }
      }
    }

    if (!apiKey || !provider) return "";

    const doSearch = async (query: string) => {
      let fetchUrl: string;
      let headers: Record<string, string> = { "Content-Type": "application/json" };
      let body: string;

      switch (provider) {
        case "tavily":
          fetchUrl = "https://api.tavily.com/search";
          headers["Authorization"] = `Bearer ${apiKey}`;
          body = JSON.stringify({ query, max_results: 3 });
          break;
        case "exa":
          fetchUrl = "https://api.exa.ai/search";
          headers["x-api-key"] = apiKey;
          body = JSON.stringify({ query, num_results: 3 });
          break;
        case "anysearch":
          fetchUrl = "https://api.anysearch.com/v1/search";
          headers["Authorization"] = `Bearer ${apiKey}`;
          body = JSON.stringify({ query, max_results: 3 });
          break;
        default:
          return "";
      }

      const res = await fetch(fetchUrl, { method: "POST", headers, body });
      if (!res.ok) return "";
      const data = await res.json();
      const results = data.results;
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

// Round 1: Core Analysis (companyAnalysis, jdAnalysis, salaryConversion, benefitsDetail)
async function analyzeRound1(
  openai: OpenAI,
  model: string,
  companyName: string,
  position: string,
  jdRawText: string,
  salaryInfo: string,
  preferenceSection: string,
  companyBackground: string
): Promise<any> {
  const prompt = `分析以下招聘信息的基础信息。

公司名称：${companyName}
岗位：${position}
JD内容：
${jdRawText}
${salaryInfo}${preferenceSection}
${companyBackground ? `\n公司背景信息（来自搜索引擎）：\n${companyBackground}` : ""}

请从以下维度分析（返回JSON，只返回JSON不要其他内容）：

{
  "companyAnalysis": {"scale":"规模评估","financingStage":"融资阶段","stabilityRisk":"低|中|高","riskNotes":["风险点"],"industryOutlook":"行业前景"},
  "jdAnalysis": {"coreRequirements":["核心要求"],"niceToHave":["加分项"],"redFlags":["JD危险信号"],"workSchedule":"双休|大小周|单休|996|未提及","listedSalaryRange":"JD薪资范围或null"},
  "salaryConversion": {"targetSchedule":"工作制度","equivalentMonthly":0,"equivalentAnnual":0,"premium":0,"premiumPercent":0,"formula":"换算说明"},
  "benefitsDetail": {"insurance":"五险一金|仅社保|未提及","annualBonus":"有|无|未提及","perks":["福利项目"],"leaveDays":"年假天数或未提及"}
}`;

  const completion = await openai.chat.completions.create(
    {
      model,
      messages: [
        { role: "system", content: "你是一位求职分析顾问。根据JD和公司信息给出客观分析。只返回JSON。" },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    },
    { maxRetries: 0, timeout: 120000 }
  );

  const message = completion.choices[0]?.message;
  // mimo 等模型可能把内容放在 reasoning_content 而非 content
  const responseText = message?.content || (message as any)?.reasoning_content || "";
  return parseJsonResponse(responseText);
}

// Round 2: Personalized Assessment (resumeMatch, careerAssessment, decision)
async function analyzeRound2(
  openai: OpenAI,
  model: string,
  round1Result: any,
  profile: any,
  userPriorities: string[]
): Promise<any> {
  const resumeSnippet = profile?.resumeText
    ? profile.resumeText.substring(0, 500)
    : "未提供简历";

  const prioritiesStr = userPriorities.length > 0
    ? `用户偏好（按优先级排序）：${userPriorities.join('、')}`
    : "";

  const prompt = `基于以下已有分析结果，评估简历匹配度、职业发展和给出决策建议。

已有分析结果：
${JSON.stringify(round1Result, null, 2)}

用户简历摘要：
${resumeSnippet}

${prioritiesStr}

请从以下维度分析（返回JSON，只返回JSON不要其他内容）：

{
  "resumeMatch": {"overallScore":0,"skillMatch":0,"experienceMatch":0,"industryMatch":0,"matchDetails":[],"gapDetails":[]},
  "careerAssessment": {"outlook":"积极|中性|消极","growthPotential":0,"skillGrowth":[],"titleProgression":"","notes":""},
  "decision": {"verdict":"建议去|可考虑|谨慎|不建议","score":0,"pros":[],"cons":[],"summary":""}
}`;

  const completion = await openai.chat.completions.create(
    {
      model,
      messages: [
        { role: "system", content: "你是一位求职决策顾问。根据已有分析和用户简历给出客观评估。只返回JSON。" },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    },
    { maxRetries: 0, timeout: 120000 }
  );

  const message = completion.choices[0]?.message;
  // mimo 等模型可能把内容放在 reasoning_content 而非 content
  const responseText = message?.content || (message as any)?.reasoning_content || "";
  return parseJsonResponse(responseText);
}

// Round 3: Enriched Context (companyCulture, workIntensity) - Optional
async function analyzeRound3(
  openai: OpenAI,
  model: string,
  companyBackground: string
): Promise<any> {
  const prompt = `基于以下公司背景搜索结果，分析公司文化和工作强度。

公司背景信息：
${companyBackground}

请从以下维度分析（返回JSON，只返回JSON不要其他内容）：

{
  "companyCulture": {"keywords":["企业文化关键词"],"employeeSentiment":"积极|中性|消极","highlights":["正面评价"],"warnings":["负面信号"],"source":"数据来源"},
  "workIntensity": {"expectedOvertime":"低|中|高","signals":["加班信号词"],"compensation":"有加班费|调休|无补偿|未提及","weekendWork":"无|偶尔|经常"}
}`;

  const completion = await openai.chat.completions.create(
    {
      model,
      messages: [
        { role: "system", content: "你是一位企业文化分析师。根据搜索结果分析公司文化和工作强度。只返回JSON。" },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    },
    { maxRetries: 0, timeout: 120000 }
  );

  const message = completion.choices[0]?.message;
  // mimo 等模型可能把内容放在 reasoning_content 而非 content
  const responseText = message?.content || (message as any)?.reasoning_content || "";
  return parseJsonResponse(responseText);
}

function parseJsonResponse(responseText: string): any {
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    let fixed = jsonMatch[0];
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    for (let i = closeBraces; i < openBraces; i++) fixed += "}";
    try {
      return JSON.parse(fixed);
    } catch {
      return null;
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyName, position, jdRawText, workAddress: bodyWorkAddress, analysisId, searchAltName, workSchedule: userWorkSchedule } = body;

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
      // Extract workAddress: prefer explicit parameter, fallback to regex from jdRawText
      const workAddress = bodyWorkAddress || (() => {
        const m = jdRawText.match(/工作地址[：:]\s*([^\n]+)/);
        return m ? m[1].trim() : null;
      })();

      analysis = await prisma.preInterviewAnalysis.create({
        data: {
          userId: "local",
          companyName,
          position: position || "",
          workAddress: workAddress || null,
          jdRawText,
        },
      });

      // Geocode work address if available
      if (workAddress) {
        const amapKey = await getAmapKey();
        if (amapKey) {
          const geo = await geocode(workAddress, amapKey);
          if (geo) {
            await prisma.preInterviewAnalysis.update({
              where: { id: analysis.id },
              data: { latitude: geo.lat, longitude: geo.lng },
            });
            analysis = { ...analysis, latitude: geo.lat, longitude: geo.lng } as any;
            console.log("[pre-interview] Geocoded work address:", workAddress, "->", geo);
          }
        }
      }
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

      // Execute rounds in parallel/sequential as designed
      console.log("[pre-interview] Starting Round 1 + Round 3 (parallel)...");

      const [round1Settled, round3Settled] = await Promise.allSettled([
        analyzeRound1(openai, aiConfig.model, companyName, position || "", jdRawText, salaryInfo, preferenceSection, companyBackground),
        companyBackground ? analyzeRound3(openai, aiConfig.model, companyBackground) : Promise.resolve(null),
      ]);

      const round1Result = round1Settled.status === "fulfilled" ? round1Settled.value : null;
      const round3Result = round3Settled.status === "fulfilled" ? round3Settled.value : null;

      if (!round1Result) {
        throw new Error("Round 1 分析失败");
      }

      console.log("[pre-interview] Starting Round 2...");
      const userPriorities = profile?.priorities ? JSON.parse(profile.priorities) : [];
      const round2Result = await analyzeRound2(openai, aiConfig.model, round1Result, profile, userPriorities);

      // Merge results
      const parsed = {
        ...round1Result,
        ...(round2Result || {}),
        ...(round3Result || {}),
      };

      // Post-process: override salary preference with code-calculated result
      if (profile && parsed.decision) {
        // Add preferenceAnalysis if missing
        if (!parsed.decision.preferenceAnalysis) {
          parsed.decision.preferenceAnalysis = {};
        }

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

              const workAddrMatch = jdRawText.match(/工作地址[：:]\s*([^\n]+)/);
              const workAddr = workAddrMatch ? workAddrMatch[1] : "";

              const homeDistrict = getDistrict(homeAddr);
              const homeCity = getCity(homeAddr) || homeAddr.substring(0, 2);
              const workDistrict = getDistrict(workAddr);
              const workCity = workDistrict ? getCity(workAddr) || workAddr.substring(0, 2) : "";

              console.log("[pre-interview] Post-process distance:", { homeAddr, homeDistrict, homeCity, workAddr: workAddr.substring(0, 50), workDistrict, workCity });

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
        _phases: {
          round1: round1Settled.status,
          round2: round2Result ? "fulfilled" : "rejected",
          round3: round3Settled.status,
        },
      };

      // Calculate driving distance if both coordinates available
      try {
        const workLat = (analysis as any).latitude;
        const workLng = (analysis as any).longitude;
        const profile = await prisma.userProfile.findUnique({ where: { userId: "local" } });
        if (profile?.latitude && profile?.longitude && workLat && workLng) {
          const amapKey = await getAmapKey();
          if (amapKey) {
            const driveResult = await drivingDistance(
              { lat: profile.latitude, lng: profile.longitude },
              { lat: workLat, lng: workLng },
              amapKey
            );
            if (driveResult) {
              enriched.commuteInfo = {
                distance: driveResult.distance,
                duration: driveResult.duration,
                formatted: formatDrivingResult(driveResult),
              };
              console.log("[pre-interview] Driving distance:", enriched.commuteInfo.formatted);
            }
          }
        }
      } catch (e) {
        console.error("[pre-interview] Driving distance error:", e);
      }

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
