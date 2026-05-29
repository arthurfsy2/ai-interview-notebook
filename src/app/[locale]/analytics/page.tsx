"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

interface Stats {
  totalInterviews: number;
  passRate: number;
  resultDistribution: Record<string, number>;
  experienceDistribution: Record<string, number>;
  highRiskCompanies: number;
  totalRedFlags: number;
  topTopics: { topic: string; count: number }[];
  patterns?: string[];
}

export default function AnalyticsPage() {
  const t = useTranslations("Analytics");
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          // Compute extra stats from interviews
          fetch("/api/interviews")
            .then((r) => r.json())
            .then((id) => {
              if (id.success) {
                const interviews = id.data;
                const resultDist: Record<string, number> = {};
                const expDist: Record<string, number> = {};
                const topicCounts: Record<string, number> = {};
                let redFlags = 0;
                interviews.forEach((i: any) => {
                  resultDist[i.result] = (resultDist[i.result] || 0) + 1;
                  expDist[i.experienceRating] = (expDist[i.experienceRating] || 0) + 1;
                  if (i.aiTags) {
                    try {
                      const tags = JSON.parse(i.aiTags);
                      redFlags += (tags.redFlags || []).length;
                      (tags.keyTopics || []).forEach((t: string) => {
                        topicCounts[t] = (topicCounts[t] || 0) + 1;
                      });
                    } catch {}
                  }
                });
                const topTopics = Object.entries(topicCounts)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([topic, count]) => ({ topic, count }));
                setStats({ ...d.data, resultDistribution: resultDist, experienceDistribution: expDist, topTopics, totalRedFlags: redFlags, patterns: [] });
              }
            });
        }
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30">
      <Header />
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          {t("title")}
        </h1>

        {stats ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: t("totalInterviews"), value: stats.totalInterviews, color: "text-blue-600", bg: "bg-blue-50" },
                { label: t("passRate"), value: `${stats.passRate}%`, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: t("highRiskFlags"), value: stats.totalRedFlags, color: "text-red-600", bg: "bg-red-50" },
                { label: t("highRiskCompanies"), value: stats.highRiskCompanies, color: "text-amber-600", bg: "bg-amber-50" },
              ].map((s) => (
                <Card key={s.label} className="text-center py-4">
                  <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-2`}>
                    <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
                  </div>
                  <div className="text-xs text-slate-500">{s.label}</div>
                </Card>
              ))}
            </div>

            {stats.topTopics.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">{t("topTopics")}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.topTopics.map((topicItem, i) => (
                      <div key={topicItem.topic} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400 w-4">#{i + 1}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full flex items-center px-2 text-xs text-white"
                            style={{ width: `${(topicItem.count / stats.topTopics[0].count) * 100}%` }}
                          >
                            {topicItem.topic}
                          </div>
                        </div>
                        <span className="text-xs text-slate-500">{topicItem.count}{t("countSuffix")}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {stats.totalInterviews < 5 && (
              <Card className="border-amber-200 bg-amber-50/50">
                <CardContent className="py-6 text-center">
                  <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">{t("noPatterns")}</p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">{t("loading")}</div>
        )}
      </main>
      <Footer />
    </div>
  );
}
