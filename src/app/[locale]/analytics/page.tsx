"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { BarChart3, AlertTriangle, TrendingUp, TrendingDown, Minus, Brain, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import type { PatternAnalysisResult } from "@/types";

// Dynamic imports for recharts components (SSR unsafe)
const MonthlyTrendChart = dynamic(
  () => import("@/components/analytics/MonthlyTrendChart").then((m) => ({ default: m.MonthlyTrendChart })),
  { ssr: false }
);
const ResultDistributionChart = dynamic(
  () => import("@/components/analytics/ResultDistributionChart").then((m) => ({ default: m.ResultDistributionChart })),
  { ssr: false }
);
const CompanyGroupingChart = dynamic(
  () => import("@/components/analytics/CompanyGroupingChart").then((m) => ({ default: m.CompanyGroupingChart })),
  { ssr: false }
);
const TopicPassRateChart = dynamic(
  () => import("@/components/analytics/TopicPassRateChart").then((m) => ({ default: m.TopicPassRateChart })),
  { ssr: false }
);
const ExperienceTrendChart = dynamic(
  () => import("@/components/analytics/ExperienceTrendChart").then((m) => ({ default: m.ExperienceTrendChart })),
  { ssr: false }
);

interface AnalyticsData {
  summary: {
    totalInterviews: number;
    passRate: number;
    avgExperienceRating: number;
    totalRedFlags: number;
  };
  monthlyTrend: { month: string; count: number; passCount: number; passRate: number; avgRating: number }[];
  resultDistribution: { result: string; count: number; percentage: number }[];
  companyGrouping: {
    dimension: "industry" | "size" | "mode";
    groups: { name: string; count: number; passRate: number; avgRating: number }[];
  };
  topicStats: { topic: string; count: number; passCount: number; passRate: number }[];
  experienceTrend: { month: string; avgRating: number }[];
  hasEnoughData: boolean;
}

export default function AnalyticsPage() {
  const t = useTranslations("Analytics");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patternAnalysis, setPatternAnalysis] = useState<PatternAnalysisResult | null>(null);
  const [patternLoading, setPatternLoading] = useState(false);

  useEffect(() => {
    // Fetch chart data
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setAnalytics(d.data);
          // Fetch pattern analysis if enough data
          if (d.data.hasEnoughData) {
            setPatternLoading(true);
            fetch("/api/analytics/patterns")
              .then((r) => r.json())
              .then((pd) => {
                if (pd.success && pd.data) {
                  setPatternAnalysis(pd.data);
                }
              })
              .catch(() => {})
              .finally(() => setPatternLoading(false));
          }
        } else {
          setError(d.error || "Failed to load");
        }
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving": return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case "declining": return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-slate-400" />;
    }
  };

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case "improving": return "上升";
      case "declining": return "下降";
      default: return "稳定";
    }
  };

  // Stat cards
  const statCards = analytics
    ? [
        { label: t("totalInterviews"), value: analytics.summary.totalInterviews, color: "text-blue-600", bg: "bg-blue-50" },
        { label: t("passRate"), value: `${analytics.summary.passRate}%`, color: "text-emerald-600", bg: "bg-emerald-50" },
        { label: t("avgRating"), value: analytics.summary.avgExperienceRating, color: "text-violet-600", bg: "bg-violet-50", icon: Star },
        { label: t("highRiskFlags"), value: analytics.summary.totalRedFlags, color: "text-red-600", bg: "bg-red-50" },
      ]
    : [];

  const companyTitle =
    analytics?.companyGrouping.dimension === "industry"
      ? t("companyGroupingIndustry")
      : analytics?.companyGrouping.dimension === "size"
        ? t("companyGroupingSize")
        : t("companyGroupingMode");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30">
      <Header />
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          {t("title")}
        </h1>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="text-center py-4">
                  <Skeleton className="h-10 w-10 rounded-lg mx-auto mb-2" />
                  <Skeleton className="h-3 w-16 mx-auto" />
                </Card>
              ))}
            </div>
            <Skeleton className="h-[300px] w-full rounded-lg" />
            <Skeleton className="h-[300px] w-full rounded-lg" />
          </div>
        ) : error ? (
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="py-6 text-center">
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-slate-600">{error}</p>
            </CardContent>
          </Card>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Summary stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statCards.map((s) => (
                <Card key={s.label} className="text-center py-4">
                  <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-2`}>
                    {s.icon ? (
                      <s.icon className={`h-5 w-5 ${s.color}`} />
                    ) : (
                      <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
                    )}
                  </div>
                  {s.icon && <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>}
                  <div className="text-xs text-slate-500">{s.label}</div>
                </Card>
              ))}
            </div>

            {/* Chart tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="overview">{t("tabOverview")}</TabsTrigger>
                <TabsTrigger value="company">{t("tabCompany")}</TabsTrigger>
                <TabsTrigger value="topics">{t("tabTopics")}</TabsTrigger>
              </TabsList>

              {/* Trend Overview Tab */}
              <TabsContent value="overview" className="space-y-4 mt-0">
                <MonthlyTrendChart
                  data={analytics.monthlyTrend}
                  title={t("monthlyTrend")}
                  description={t("monthlyTrendDesc")}
                  emptyMessage={t("noData")}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ResultDistributionChart
                    data={analytics.resultDistribution}
                    title={t("resultDistribution")}
                    description={t("resultDistributionDesc")}
                    emptyMessage={t("noData")}
                    totalCount={analytics.summary.totalInterviews}
                  />
                  <ExperienceTrendChart
                    data={analytics.experienceTrend}
                    title={t("experienceTrend")}
                    description={t("experienceTrendDesc")}
                    emptyMessage={t("noData")}
                  />
                </div>
              </TabsContent>

              {/* Company Dimension Tab */}
              <TabsContent value="company" className="mt-0">
                <CompanyGroupingChart
                  data={analytics.companyGrouping.groups}
                  dimension={analytics.companyGrouping.dimension}
                  title={t("companyGrouping")}
                  description={companyTitle}
                  emptyMessage={t("noData")}
                  fallbackNote={analytics.companyGrouping.dimension === "mode" ? t("noCompanyData") : undefined}
                />
              </TabsContent>

              {/* Topics Tab */}
              <TabsContent value="topics" className="mt-0">
                <TopicPassRateChart
                  data={analytics.topicStats}
                  title={t("topicPassRate")}
                  description={t("topicPassRateDesc")}
                  emptyMessage={t("noData")}
                />
              </TabsContent>
            </Tabs>

            {/* Pattern Analysis Section */}
            {!analytics.hasEnoughData ? (
              <Card className="border-amber-200 bg-amber-50/50">
                <CardContent className="py-4 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-sm text-slate-600">{t("lowDataWarning")}</p>
                    <p className="text-xs text-slate-400 mt-0.5">还需要 {5 - analytics.summary.totalInterviews} 条面试记录</p>
                  </div>
                </CardContent>
              </Card>
            ) : patternLoading ? (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="py-6 text-center">
                  <Brain className="h-8 w-8 text-blue-500 mx-auto mb-2 animate-pulse" />
                  <p className="text-sm text-slate-600">AI 正在分析跨记录模式...</p>
                </CardContent>
              </Card>
            ) : patternAnalysis ? (
              <div className="space-y-4">
                {/* Summary */}
                {patternAnalysis.summary && (
                  <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Brain className="h-5 w-5 text-blue-600" />
                        AI 模式洞察
                        <Badge className="bg-blue-100 text-blue-700 ml-auto">
                          置信度 {Math.round(patternAnalysis.confidence * 100)}%
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-700">{patternAnalysis.summary}</p>
                    </CardContent>
                  </Card>
                )}

                {/* High Frequency Red Flags */}
                {patternAnalysis.highFrequencyRedFlags.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-base">{t("redFlagWarning")}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {patternAnalysis.highFrequencyRedFlags.map((item) => (
                          <Badge key={item.flag} className="bg-red-100 text-red-700">
                            {item.flag} ({item.count}次, {item.percentage}%)
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* High Frequency Green Flags */}
                {patternAnalysis.highFrequencyGreenFlags.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-base">正面信号</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {patternAnalysis.highFrequencyGreenFlags.map((item) => (
                          <Badge key={item.flag} className="bg-emerald-100 text-emerald-700">
                            {item.flag} ({item.count}次, {item.percentage}%)
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Growth Trajectory */}
                {patternAnalysis.growthTrajectory && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        成长轨迹
                        {getTrendIcon(patternAnalysis.growthTrajectory.trend)}
                        <span className="text-sm font-normal text-slate-500">
                          {getTrendLabel(patternAnalysis.growthTrajectory.trend)}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {patternAnalysis.growthTrajectory.evidence.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1">证据</p>
                          <ul className="text-sm text-slate-700 space-y-1">
                            {patternAnalysis.growthTrajectory.evidence.map((e, i) => (
                              <li key={i}>• {e}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {patternAnalysis.growthTrajectory.recommendations.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1">建议</p>
                          <ul className="text-sm text-slate-700 space-y-1">
                            {patternAnalysis.growthTrajectory.recommendations.map((r, i) => (
                              <li key={i}>• {r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Preference Pattern */}
                {patternAnalysis.preferencePattern.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-base">偏好模式</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="text-sm text-slate-700 space-y-1">
                        {patternAnalysis.preferencePattern.map((p, i) => (
                          <li key={i}>• {p}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Topic Distribution */}
                {patternAnalysis.topicDistribution.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-base">技术主题分布</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {patternAnalysis.topicDistribution.map((item) => (
                          <div key={item.topic} className="flex items-center gap-3">
                            <span className="text-sm text-slate-700 flex-1">{item.topic}</span>
                            <span className="text-xs text-slate-500">{item.count}次</span>
                            {getTrendIcon(item.trend)}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
