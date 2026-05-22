"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Edit,
  Trash2,
  Sparkles,
  Loader2,
  Tag as TagIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import type { Interview, AITags, AIInsights } from "@/types";

const getResultBadge = (result: string) => {
  const map: Record<string, string> = {
    "通过": "bg-emerald-100 text-emerald-700",
    "被拒": "bg-red-100 text-red-700",
    "主动放弃": "bg-slate-100 text-slate-700",
    "无消息": "bg-amber-100 text-amber-700",
    "待定": "bg-blue-100 text-blue-700",
  };
  return map[result] || "bg-slate-100 text-slate-700";
};

export default function InterviewDetailPage() {
  const t = useTranslations("Interview");
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiTags, setAiTags] = useState<AITags | null>(null);
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/interviews/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setInterview(d.data);
          if (d.data.aiTags) {
            try { setAiTags(JSON.parse(d.data.aiTags)); } catch {}
          }
          if (d.data.aiInsights) {
            try { setAiInsights(JSON.parse(d.data.aiInsights)); } catch {}
          }
        }
        setLoading(false);
      });
  }, [id]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/interviews/${id}/analyze`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        // Check for analysis error
        if (data.data._error) {
          setAnalyzeError(data.data._error);
        } else {
          setAnalyzeError(null);
        }

        if (data.data.aiTags) {
          try {
            const parsed = typeof data.data.aiTags === "string" ? JSON.parse(data.data.aiTags) : data.data.aiTags;
            setAiTags(parsed);
          } catch {}
        }
        if (data.data.aiInsights) {
          try {
            const parsed = typeof data.data.aiInsights === "string" ? JSON.parse(data.data.aiInsights) : data.data.aiInsights;
            setAiInsights(parsed);
          } catch {}
        }
      }
    } catch (e) {
      console.error("Analyze failed:", e);
    }
    setAnalyzing(false);
  };

  const handleDelete = async () => {
    if (!confirm(t("confirmDelete"))) return;
    await fetch(`/api/interviews/${id}`, { method: "DELETE" });
    router.push("/interviews");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="container max-w-2xl mx-auto px-4 py-12 text-center text-slate-400">加载中...</main>
        <Footer />
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="container max-w-2xl mx-auto px-4 py-12 text-center text-slate-400">记录不存在</main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30">
      <Header />
      <main className="container max-w-2xl mx-auto px-4 py-8">
        {/* Back + Actions */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-slate-400 hover:text-slate-700">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">返回</span>
          </button>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => router.push(`/interviews/${id}/edit`)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Header Card */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-slate-900">{interview.companyName}</h2>
                  <Badge className={getResultBadge(interview.result)}>{interview.result}</Badge>
                </div>
                <p className="text-base text-slate-600 mb-3">{interview.position}</p>
              </div>
              <div className="text-right text-sm">
                <div className="text-slate-400 mb-1">
                  <Calendar className="h-3.5 w-3.5 inline mr-1" />
                  {new Date(interview.interviewDate).toLocaleDateString("zh-CN")}
                </div>
              </div>
            </div>

            <div className="flex gap-4 text-sm text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />{interview.interviewMode}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />{interview.rounds}轮
              </span>
              {interview.salaryRange && <span>💰 {interview.salaryRange}</span>}
              {interview.commuteTime && <span>🚗 {interview.commuteTime}</span>}
            </div>

            <div className="mt-3 text-sm">
              体验评价：{"⭐".repeat(interview.experienceRating)}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {interview.notes && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("notes")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {interview.notes}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Analyze Button — always visible for re-analysis */}
        {interview.notes && interview.notes.trim().length >= 5 && (
          <div className="text-center mb-6">
            <Button onClick={handleAnalyze} disabled={analyzing} className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-purple-500/25">
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("analyzing")}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {aiTags ? "重新分析" : t("analyze")}
                </>
              )}
            </Button>
          </div>
        )}

        {/* AI Tags */}
        {aiTags && (
          <Card className="mb-6 border-purple-200 bg-purple-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                AI 分析标签
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {aiTags.interviewerStyle && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">面试官风格：</span>
                  <Badge variant="secondary">{aiTags.interviewerStyle}</Badge>
                </div>
              )}
              {aiTags.interviewDepth && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">面试深度：</span>
                  <Badge variant="secondary">{aiTags.interviewDepth}</Badge>
                </div>
              )}
              {aiTags.keyTopics?.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-500">核心考察点：</span>
                  {aiTags.keyTopics.map((t) => (
                    <Badge key={t} className="bg-blue-50 text-blue-700"><TagIcon className="h-3 w-3 mr-0.5 inline" />{t}</Badge>
                  ))}
                </div>
              )}
              {aiTags.redFlags?.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-red-500">⚠ 风险信号：</span>
                  {aiTags.redFlags.map((f) => (
                    <Badge key={f} className="bg-red-50 text-red-700">{f}</Badge>
                  ))}
                </div>
              )}
              {aiTags.greenFlags?.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-emerald-500">✅ 正面信号：</span>
                  {aiTags.greenFlags.map((f) => (
                    <Badge key={f} className="bg-emerald-50 text-emerald-700">{f}</Badge>
                  ))}
                </div>
              )}
              {aiTags.salarySignal && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">薪资水平：</span>
                  <Badge variant="secondary">{aiTags.salarySignal}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* AI Insights */}
        {aiInsights && (
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">💡 AI 洞察</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {analyzeError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-xs">
                  <span className="font-medium">⚠ 分析过程中出现错误：</span>
                  <p className="mt-1 text-red-600">{analyzeError}</p>
                </div>
              )}
              {aiInsights.summary && (
                <p className="text-slate-700 font-medium">{aiInsights.summary}</p>
              )}
              {aiInsights.keyFindings?.length > 0 && (
                <div>
                  <p className="text-slate-500 mb-1">关键发现：</p>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                    {aiInsights.keyFindings.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
              )}
              {aiInsights.improvementSuggestions?.length > 0 && (
                <div>
                  <p className="text-slate-500 mb-1">改进建议：</p>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                    {aiInsights.improvementSuggestions.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {aiInsights.prepFocus?.length > 0 && (
                <div>
                  <p className="text-slate-500 mb-1">下次准备重点：</p>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                    {aiInsights.prepFocus.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
