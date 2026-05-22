"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);

  useEffect(() => {
    fetch(`/api/pre-interview/${id}`)
      .then((r) => r.json())
      .then((d) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="container max-w-2xl mx-auto px-4 py-12 text-center text-slate-400">加载中...</main>
        <Footer />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="container max-w-2xl mx-auto px-4 py-12 text-center text-slate-400">记录不存在</main>
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
            <span className="text-sm">返回</span>
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
            {analysis.vetoReason && (
              <div className="mt-2 flex items-center justify-center gap-1 text-sm text-red-600">
                <AlertTriangle className="h-4 w-4" /> {analysis.vetoReason}
              </div>
            )}
          </CardContent>
        </Card>

        {report && (
          <>
            {/* Company Analysis */}
            {report.companyAnalysis && (
              <Card className="mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    {t("companyAnalysis")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><span className="text-slate-500">规模：</span>{report.companyAnalysis.scale}</p>
                  <p><span className="text-slate-500">融资：</span>{report.companyAnalysis.financingStage}</p>
                  <p><span className="text-slate-500">稳定性：</span>
                    <Badge variant={report.companyAnalysis.stabilityRisk === "高" ? "destructive" : "secondary"} className="ml-1">{report.companyAnalysis.stabilityRisk}</Badge>
                  </p>
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

        {/* Link to Interview */}
        <div className="text-center mt-4">
          <Button
            variant="outline"
            className="text-blue-600 border-blue-200"
            onClick={() => router.push("/interviews/new")}
          >
            关联面试记录
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
