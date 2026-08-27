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
  "summary": "一句话总结",
  "keyFindings": ["关键发现1-3条"],
  "improvementSuggestions": ["改进建议1-3条"],
  "prepFocus": ["下次准备重点1-3条"],
  "confidence": 85,
  "dataQuality": "high"|"medium"|"low"
}

条件输出规则：
- 仅当面试结果为"被拒"时，才分析 rejectionReason
- 当结果为"通过"、"主动放弃"、"无消息"、"待定"时，rejectionReason 必须为 null

置信度评估规则（confidence，0-100）：
- 笔记详细（>200字，含具体问题和细节）：80-100
- 笔记一般（50-200字，有基本描述）：50-80
- 笔记简短（<50字，信息有限）：20-50

数据质量评估规则（dataQuality）：
- high: 笔记详细，包含具体问题、面试官风格、技术考察点等
- medium: 笔记一般，有基本描述但缺少细节
- low: 笔记简短，信息有限

无法判断的字段用null，空数组用[]`;

const FEW_SHOT_EXAMPLE = `示例输入："3轮到高管，问大并发架构"
输出：{"interviewerStyle":"专业","interviewDepth":"深(多轮+高管)","questions":["大并发架构设计"],"keyTopics":["系统架构"],"redFlags":[],"greenFlags":["面试流程专业","多轮面试"],"salarySignal":null,"commuteAssessment":null,"rejectionReason":null,"rejectionControllability":null,"summary":"3轮到高管，考察大并发架构能力","keyFindings":["流程规范","考察架构能力"],"improvementSuggestions":["系统梳理架构知识"],"prepFocus":["大并发架构"]}`;

export async function analyzeNotes(
  notes: string,
  position?: string,
  context?: {
    result?: string;          // '通过' | '被拒' | etc.
    interviewMode?: string;   // '线上' | '线下' | '混合'
    rounds?: number;          // Number of rounds completed
    experienceRating?: number; // 1-5
    userPriorities?: string[]; // From UserProfile.priorities
    targetTitle?: string;     // User's target position
    currentTitle?: string;    // User's current position
  },
  aiMeetingSummary?: string   // AI 会议摘要（如腾讯会议 AI 总结）
) {
  const aiConfig = await getConfigForPurpose("text");

  if (!aiConfig.apiKey) {
    return {
      ...getDefaultResult(),
      _error: "未配置 AI API Key，请在设置中添加 AI 配置",
    };
  }

  const normalizedUrl = normalizeAIUrl(aiConfig.baseUrl, aiConfig.provider);
  if (!normalizedUrl || !normalizedUrl.startsWith("http")) {
    return {
      ...getDefaultResult(),
      _error: `AI API 地址无效：${normalizedUrl || "(空)"}。请在设置中检查 API 地址配置。`,
    };
  }

  const openai = new OpenAI({
    apiKey: aiConfig.apiKey,
    baseURL: normalizedUrl,
    timeout: 120000,
  });

  // Build context hint for prompt
  let contextHint = "";
  if (context) {
    if (context.result) {
      contextHint += `\n本次面试结果：${context.result}`;
      if (context.result !== '被拒') {
        contextHint += '\n注意：由于面试结果不是"被拒"，rejectionReason 必须为 null';
      } else {
        contextHint += '\n请重点分析 rejectionReason';
      }
    }
    if (context.rounds) {
      contextHint += `\n面试轮次：第${context.rounds}轮`;
    }
    if (context.interviewMode) {
      contextHint += `\n面试方式：${context.interviewMode}`;
    }
    if (context.currentTitle && context.targetTitle) {
      contextHint += `\n用户当前职位：${context.currentTitle}，目标职位：${context.targetTitle}`;
    }
    if (context.userPriorities && context.userPriorities.length > 0) {
      contextHint += `\n用户求职偏好（按优先级排序）：${context.userPriorities.join('、')}`;
    }
  }

  // Adjust parameters based on notes length
  const notesLength = notes.length;
  const summaryLength = aiMeetingSummary?.length || 0;
  const totalContentLength = notesLength + summaryLength;
  let temperature = 0.3;
  let maxTokens = 4000;
  if (totalContentLength < 50) {
    temperature = 0.2;
    maxTokens = 3000;
    contextHint += `\n注意：这是一条简短的面试记录（${totalContentLength}字），信息有限。请基于已有信息给出分析，对不确定的字段标注低置信度。`;
  }

  // Build user prompt with optional meeting summary
  let userPrompt = position ? `面试岗位：${position}${contextHint}` : `${contextHint}`;

  if (aiMeetingSummary && aiMeetingSummary.trim()) {
    userPrompt += `\n\n=== AI 会议摘要 ===\n${aiMeetingSummary}`;
  }
  if (notes && notes.trim()) {
    userPrompt += `\n\n=== 面试笔记 ===\n${notes}`;
  } else if (!aiMeetingSummary || !aiMeetingSummary.trim()) {
    // Fallback: if neither exists, this shouldn't happen due to API validation
    userPrompt += `\n\n面试备注：\n${notes}`;
  }

  try {
    const completion = await openai.chat.completions.create(
      {
        model: aiConfig.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: FEW_SHOT_EXAMPLE },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
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

      // Post-process: only include rejectionReason when result indicates rejection
      if (context?.result && context.result !== '被拒') {
        parsed.rejectionReason = null;
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
        } as AITags,
        insights: {
          summary: parsed.summary || "",
          keyFindings: parsed.keyFindings || [],
          improvementSuggestions: parsed.improvementSuggestions || [],
          prepFocus: parsed.prepFocus || [],
          confidence: parsed.confidence || 50,
          dataQuality: parsed.dataQuality || 'medium',
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
    } as AITags,
    insights: {
      summary: "AI 分析暂不可用",
      keyFindings: [],
      improvementSuggestions: [],
      prepFocus: [],
      confidence: 0,
      dataQuality: 'low',
    } as AIInsights,
    questions: [],
  };
}
