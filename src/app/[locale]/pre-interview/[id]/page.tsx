"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import {
  ArrowLeft,
  Building2,
  FileText,
  Banknote,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Loader2,
  RefreshCw,
  Plus,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const verdictColors: Record<string, string> = {
  "建议去": "bg-emerald-100 text-emerald-700 border-emerald-300",
  "可考虑": "bg-blue-100 text-blue-700 border-blue-300",
  "谨慎": "bg-amber-100 text-amber-700 border-amber-300",
  "不建议": "bg-red-100 text-red-700 border-red-300",
};

export default function PreInterviewDetailPage() {
  const t = useTranslations("PreInterview");
  const locale = useLocale();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [showSearchRaw, setShowSearchRaw] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [candidateInterviews, setCandidateInterviews] = useState<any[]>([]);
  const [linking, setLinking] = useState(false);
  // Track which interviews are linked to THIS analysis
  const [linkedInterviewIds, setLinkedInterviewIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/pre-interview/${id}`)
      .then((r) => r.json())
      .then((d) => {
        console.log("[PreInterviewDetail] API response linkedInterviewId:", d.data?.linkedInterviewId);
        if (d.success) {
          setAnalysis(d.data);
        }
        setLoading(false);
      });
  }, [id]);

  const handleReanalyze = async () => {
    if (!analysis) return;
    setReanalyzing(true);
    try {
      const res = await fetch("/api/pre-interview/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: analysis.companyName,
          position: analysis.position,
          jdRawText: analysis.jdRawText,
          analysisId: analysis.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data._error) {
          alert(`分析失败：${data._error}`);
        }
        // Reload the analysis data
        setAnalysis(data.data);
      } else {
        alert(data.error || "重新分析失败");
      }
    } catch (e) {
      alert("请求失败，请检查网络");
    }
    setReanalyzing(false);
  };

  const handleOpenLinkDialog = async () => {
    // Re-fetch analysis to get latest linkedInterviewId
    const [interviewsRes, analysisRes, allAnalysesRes] = await Promise.all([
      fetch("/api/interviews"),
      fetch(`/api/pre-interview/${id}`),
      fetch("/api/pre-interview"),
    ]);
    const interviewsData = await interviewsRes.json();
    const analysisData = await analysisRes.json();
    const allAnalysesData = await allAnalysesRes.json();

    if (interviewsData.success) setCandidateInterviews(interviewsData.data || []);
    if (analysisData.success) setAnalysis(analysisData.data);

    // Build set of already-linked interview IDs (across all analyses)
    const linked = new Set<string>();
    if (allAnalysesData.success) {
      (allAnalysesData.data || []).forEach((a: any) => {
        if (a.linkedInterviewId) linked.add(a.linkedInterviewId);
      });
    }
    setLinkedInterviewIds(linked);

    setShowLinkDialog(true);
  };

  const handleLinkInterview = async (interviewId: string) => {
    setLinking(true);
    try {
      const res = await fetch(`/api/pre-interview/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedInterviewId: interviewId }),
      });
      const data = await res.json();
      if (data.success) {
        setAnalysis({ ...analysis, linkedInterviewId: interviewId });
        setShowLinkDialog(false);
      }
    } catch (e) {}
    setLinking(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="container max-w-2xl mx-auto px-4 py-12 text-center text-slate-400">{t("loading")}</main>
        <Footer />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="container max-w-2xl mx-auto px-4 py-12 text-center text-slate-400">{t("notFound")}</main>
        <Footer />
      </div>
    );
  }

  let report: any = null;
  try {
    report = analysis.analysisResult ? JSON.parse(analysis.analysisResult) : null;
  } catch {}

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30">
      <Header />
      <main className="container max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-slate-400 hover:text-slate-700">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">{t("back")}</span>
          </button>
        </div>

        {/* Title + Verdict */}
        <Card className="mb-6 border-2 border-blue-200">
          <CardContent className="p-5 text-center">
            <h2 className="text-xl font-bold text-slate-900 mb-1">{analysis.companyName}</h2>
            <p className="text-slate-500 mb-4">{analysis.position}</p>
            {analysis.verdict && (
              <Badge className={`text-lg px-4 py-1.5 ${verdictColors[analysis.verdict] || ""}`}>
                {analysis.verdict}
              </Badge>
            )}
            {analysis.score != null && (
              <div className="mt-2 text-3xl font-bold text-slate-700">{analysis.score}<span className="text-base text-slate-400">/100</span></div>
            )}
            {report?._source?.hasWebSearch && (
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                  🌐 含搜索引擎实时数据
                </Badge>
              </div>
            )}
            {analysis.vetoReason && (
              <div className="mt-2 flex items-center justify-center gap-1 text-sm text-red-600">
                <AlertTriangle className="h-4 w-4" /> {analysis.vetoReason}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preference Match */}
        {report?.decision?.preferenceAnalysis && Object.keys(report.decision.preferenceAnalysis).length > 0 && (
          <Card className="mb-6 border-indigo-200 bg-indigo-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-indigo-600" />
                {t("preferenceMatch")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(report.decision.preferenceAnalysis).map(([key, val]) => {
                const item = typeof val === "object" && val !== null ? val : { note: String(val), match: "未评估", scoreImpact: 0 };
                const match = item.match || "";
                const note = item.note || "";
                const impact = item.scoreImpact || 0;

                const isPositive = /完全匹配|正面|优|好/.test(match) || impact > 0;
                const isNegative = /不匹配|负面|差|远|风险/.test(match) || impact < 0;

                return (
                  <div
                    key={key}
                    className={`p-3 rounded-lg text-sm border ${
                      isPositive
                        ? "bg-emerald-50 border-emerald-200"
                        : isNegative
                          ? "bg-red-50 border-red-200"
                          : "bg-white border-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-800">{key}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          isPositive ? "bg-emerald-100 text-emerald-700"
                            : isNegative ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {isPositive ? "✅ " : isNegative ? "⚠️ " : ""}{match}
                        </span>
                        {impact !== 0 && (
                          <span className={`text-xs font-bold ${impact > 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {impact > 0 ? "+" : ""}{impact}分
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">{note}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {report && (
          <>
            {/* Company Analysis */}
            {report.companyAnalysis && (
              <Card className="mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    {t("companyAnalysis")}
                    <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {report._source?.hasWebSearch ? "JD+搜索+AI" : "JD+AI"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><span className="text-slate-500">规模：</span>{report.companyAnalysis.scale}</p>
                  <p><span className="text-slate-500">融资：</span>{report.companyAnalysis.financingStage}</p>
                  <div><span className="text-slate-500">稳定性：</span>
                    <Badge variant={report.companyAnalysis.stabilityRisk === "高" ? "destructive" : "secondary"} className="ml-1">{report.companyAnalysis.stabilityRisk}</Badge>
                  </div>
                  {report.companyAnalysis.riskNotes?.map((n: string, i: number) => (
                    <p key={i} className="text-red-600 text-xs">⚠ {n}</p>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* JD Analysis */}
            {report.jdAnalysis && (
              <Card className="mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-violet-600" />
                    {t("jdAnalysis")}
                    <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">AI 解析</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div>
                    <span className="text-slate-500">核心要求：</span>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {report.jdAnalysis.coreRequirements?.map((r: string) => (
                        <Badge key={r} variant="secondary">{r}</Badge>
                      ))}
                    </div>
                  </div>
                  {report.jdAnalysis.redFlags?.length > 0 && (
                    <div>
                      <span className="text-red-500 text-xs">⚠ JD风险信号：</span>
                      {report.jdAnalysis.redFlags.map((f: string) => (
                        <Badge key={f} className="ml-1 bg-red-50 text-red-700">{f}</Badge>
                      ))}
                    </div>
                  )}
                  <p><span className="text-slate-500">工作制度：</span>{report.jdAnalysis.workSchedule}</p>
                </CardContent>
              </Card>
            )}

            {/* Salary Conversion */}
            {report.salaryConversion && (
              <Card className="mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-emerald-600" />
                    {t("salaryConversion")}
                    <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">AI 计算</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>目标时薪：¥{report.salaryConversion.equivalentMonthly?.toLocaleString()}/月</p>
                  <p>等效年薪：¥{report.salaryConversion.equivalentAnnual?.toLocaleString()}</p>
                  <p>
                    溢价：
                    <span className={report.salaryConversion.premium > 0 ? "text-emerald-600" : "text-red-600"}>
                      {report.salaryConversion.premiumPercent > 0 ? "+" : ""}{report.salaryConversion.premiumPercent}%
                    </span>
                  </p>
                  <p className="text-xs text-slate-400">{report.salaryConversion.formula}</p>
                </CardContent>
              </Card>
            )}

            {/* Resume Match */}
            {report.resumeMatch && (
              <Card className="mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-amber-600" />
                    {t("resumeMatch")}：{report.resumeMatch.overallScore}分
                    <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">AI 分析</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex gap-4 text-xs">
                    <span>技能：{report.resumeMatch.skillMatch}</span>
                    <span>经验：{report.resumeMatch.experienceMatch}</span>
                    <span>行业：{report.resumeMatch.industryMatch}</span>
                  </div>
                  {report.resumeMatch.gapDetails?.length > 0 && (
                    <div>
                      <span className="text-amber-600 text-xs">差距：</span>
                      {report.resumeMatch.gapDetails.map((g: string) => (
                        <p key={g} className="text-xs text-slate-500">- {g}</p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* WebSearch raw results */}
        {report?._source?.hasWebSearch && report._source?.webSearchSnippet && (
          <Card className="mb-4 border-emerald-200 bg-emerald-50/30">
            <CardHeader
              className="pb-2 cursor-pointer"
              onClick={() => setShowSearchRaw(!showSearchRaw)}
            >
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-emerald-600" />
                  搜索引擎原始数据
                  <span className="text-[10px] font-normal text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">Tavily</span>
                </span>
                {showSearchRaw ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </CardTitle>
            </CardHeader>
            {showSearchRaw && (
              <CardContent>
                <pre className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                  {report._source.webSearchSnippet}
                </pre>
                <p className="text-[10px] text-slate-400 mt-2">
                  搜索时间：{new Date(report._source.searchedAt).toLocaleString(locale)}
                </p>
              </CardContent>
            )}
          </Card>
        )}

        {/* If no report yet, or report contains error */}
        {(!report || report._error) && (
          <Card className="mb-4 border-dashed border-2 border-slate-200">
            <CardContent className="py-8 text-center">
              {report?._error ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                  <p className="text-sm font-medium text-red-700 mb-1">AI 分析失败</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto break-all">{report._error}</p>
                </>
              ) : (
                <>
                  <Sparkles className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm text-slate-400">分析报告尚未生成或数据不完整</p>
                  <p className="text-xs text-slate-400 mt-1">请确保已配置 AI 和 WebSearch API Key</p>
                </>
              )}
              <div className="mt-4">
                <Button
                  onClick={handleReanalyze}
                  disabled={reanalyzing}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                >
                  {reanalyzing ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />重新分析中...</>
                  ) : (
                    <><RefreshCw className="h-4 w-4 mr-2" />重新分析</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Re-analyze button when report exists */}
        {report && !report._error && (
          <div className="text-center mb-4">
            <Button
              variant="outline"
              onClick={handleReanalyze}
              disabled={reanalyzing}
              className="text-blue-600 border-blue-200"
            >
              {reanalyzing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />重新分析中...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" />重新分析</>
              )}
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              const params = new URLSearchParams();
              params.set("company", analysis.companyName);
              params.set("position", analysis.position);
              if (report?.jdAnalysis?.listedSalaryRange) params.set("salary", report.jdAnalysis.listedSalaryRange);
              if (report?.jdAnalysis?.workSchedule && report.jdAnalysis.workSchedule !== "未提及") params.set("workSchedule", report.jdAnalysis.workSchedule);
              router.push(`/interviews/new?${params.toString()}`);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />创建面试记录
          </Button>
          <Button
            variant="outline"
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
            onClick={handleOpenLinkDialog}
          >
            {analysis.linkedInterviewId ? "已关联" : "关联已有记录"}
          </Button>
        </div>

        {analysis.linkedInterviewId && (
          <p className="text-center text-xs text-slate-400 mt-2">
            已关联面试记录，可在记录详情页对比分析预期与实际
          </p>
        )}

        {/* Link Dialog */}
        {showLinkDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowLinkDialog(false)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-5 border-b">
                <h3 className="text-lg font-semibold">选择要关联的面试记录</h3>
                <p className="text-sm text-slate-500 mt-1">
                  关联后可对比"分析预期"与"实际面试"，发现差距和模式
                </p>
              </div>
              <div className="p-3">
                {candidateInterviews.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">
                    暂无面试记录，请先创建
                  </p>
                ) : (
                  <div className="space-y-2">
                    {candidateInterviews
                      .map((iv: any) => {
                        const isLinkedToThis = analysis.linkedInterviewId === iv.id;
                        const isLinkedToOther = !isLinkedToThis && linkedInterviewIds.has(iv.id);
                        return (
                      <div
                        key={iv.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                          isLinkedToThis
                            ? "border-blue-400 bg-blue-50"
                            : isLinkedToOther
                              ? "border-amber-200 bg-amber-50/50"
                              : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                        }`}
                        onClick={() => handleLinkInterview(iv.id)}
                      >
                        <div>
                          <div className="text-sm font-medium">{iv.companyName}</div>
                          <div className="text-xs text-slate-500">{iv.position}</div>
                          <div className="text-xs text-slate-400">
                            {new Date(iv.interviewDate).toLocaleDateString(locale)} · {iv.result}
                            {isLinkedToOther && (
                              <span className="ml-2 text-amber-500">⚠ 已关联到其他评估</span>
                            )}
                          </div>
                        </div>
                        {isLinkedToThis ? (
                          <CheckCircle className="h-5 w-5 text-emerald-500" />
                        ) : isLinkedToOther ? (
                          <span className="text-xs text-amber-600">占用</span>
                        ) : (
                          <span className="text-xs text-blue-600">关联</span>
                        )}
                      </div>
                    );
                    })}
                  </div>
                )}
              </div>
              <div className="p-3 border-t">
                <Button variant="outline" className="w-full" onClick={() => setShowLinkDialog(false)}>
                  关闭
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
