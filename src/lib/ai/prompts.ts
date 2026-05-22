import OpenAI from "openai";
import { getConfigForPurpose } from "./config";
import { normalizeAIUrl } from "@/lib/ai-url";
import type { AITags, AIInsights } from "@/types";

const SYSTEM_PROMPT = `分析面试备注，只返回JSON（不要其他内容）：
{
  "interviewerStyle": "专业"|"友好"|"冷淡"|"敷衍"|"压力面"|null,
  "interviewDepth": "浅(仅HR)"|"中(技术面+HR)"|"深(多轮+高管)"|null,
  "questions": ["被问到的具体问题"],
  "keyTopics": ["核心技术主题，如系统架构/AI应用/项目管理/数据分析"],
  "redFlags": ["风险信号，从以下选：JD不符实际/外包冒充正编/面试流程混乱/面试官不专业/流程过简(刷KPI)/工作环境差/薪资低于预期/诚信问题"],
  "greenFlags": ["正面信号，从以下选：面试流程专业/薪资有竞争力/团队氛围好/公司重视/面试官专业/多轮面试"],
  "salarySignal": "高"|"中"|"低"|"未透露"|null,
  "commuteAssessment": "近"|"中等"|"远"|null,
  "rejectionReason": "技术不匹配"|"业务调整"|"薪资谈不拢"|"竞争激烈"|"其他"|null,
  "rejectionControllability": "可控"|"不可控"|"未知"|null,
  "summary": "一句话总结",
  "keyFindings": ["关键发现1-3条"],
  "improvementSuggestions": ["改进建议1-3条"],
  "prepFocus": ["下次准备重点1-3条"]
}
无法判断的字段用null，空数组用[]`;

const FEW_SHOT_EXAMPLE = `示例输入："3轮到高管，问大并发架构"
输出：{"interviewerStyle":"专业","interviewDepth":"深(多轮+高管)","questions":["大并发架构设计"],"keyTopics":["系统架构"],"redFlags":[],"greenFlags":["面试流程专业","多轮面试"],"salarySignal":null,"commuteAssessment":null,"rejectionReason":null,"rejectionControllability":null,"summary":"3轮到高管，考察大并发架构能力","keyFindings":["流程规范","考察架构能力"],"improvementSuggestions":["系统梳理架构知识"],"prepFocus":["大并发架构"]}`;

export async function analyzeNotes(notes: string, position?: string) {
  const aiConfig = await getConfigForPurpose("text");

  if (!aiConfig.apiKey) {
    return {
      ...getDefaultResult(),
      _error: "未配置 AI API Key，请在设置中添加 AI 配置",
    };
  }

  const openai = new OpenAI({
    apiKey: aiConfig.apiKey,
    baseURL: normalizeAIUrl(aiConfig.baseUrl, aiConfig.provider),
    timeout: 120000,
  });

  const userPrompt = position
    ? `面试岗位：${position}\n\n面试备注：\n${notes}`
    : `面试备注：\n${notes}`;

  try {
    const completion = await openai.chat.completions.create(
      {
        model: aiConfig.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: FEW_SHOT_EXAMPLE },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
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
        try {
          parsed = JSON.parse(fixed);
        } catch {
          return { ...getDefaultResult(), _error: "AI 返回格式异常，无法解析" };
        }
      }

      return {
        tags: {
          interviewerStyle: parsed.interviewerStyle || null,
          interviewDepth: parsed.interviewDepth || null,
          questions: parsed.questions || [],
          keyTopics: parsed.keyTopics || [],
          redFlags: parsed.redFlags || [],
          greenFlags: parsed.greenFlags || [],
          salarySignal: parsed.salarySignal || null,
          commuteAssessment: parsed.commuteAssessment || null,
          rejectionReason: parsed.rejectionReason || null,
          rejectionControllability: parsed.rejectionControllability || null,
        } as AITags,
        insights: {
          summary: parsed.summary || "",
          keyFindings: parsed.keyFindings || [],
          improvementSuggestions: parsed.improvementSuggestions || [],
          prepFocus: parsed.prepFocus || [],
        } as AIInsights,
        questions: parsed.questions || [],
      };
    }

    return { ...getDefaultResult(), _error: "AI 返回中未找到 JSON" };
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    console.error("[analyzeNotes] error:", errMsg);
    return {
      ...getDefaultResult(),
      _error: errMsg,
    };
  }
}

function getDefaultResult() {
  return {
    tags: {
      interviewerStyle: null,
      interviewDepth: null,
      questions: [],
      keyTopics: [],
      redFlags: [],
      greenFlags: [],
      salarySignal: null,
      commuteAssessment: null,
      rejectionReason: null,
      rejectionControllability: null,
    } as AITags,
    insights: {
      summary: "AI 分析暂不可用",
      keyFindings: [],
      improvementSuggestions: [],
      prepFocus: [],
    } as AIInsights,
    questions: [],
  };
}
