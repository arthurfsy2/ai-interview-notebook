"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { Building2, ChevronRight, Tag, AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import type { Interview } from "@/types";

interface CompanyProfile {
  name: string;
  interviews: Interview[];
  latestDate: string;
  resultSummary: string;
  avgRating: number;
  redFlags: string[];
  greenFlags: string[];
  preInterviewId?: string;
}

const resultPriority: Record<string, number> = {
  "通过": 1, "待定": 2, "无消息": 3, "主动放弃": 4, "被拒": 5,
};

export default function CompaniesPage() {
  const t = useTranslations("Companies");
  const locale = useLocale();
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/interviews").then((r) => r.json()),
      fetch("/api/pre-interview").then((r) => r.json()),
    ]).then(([interviewsData, preData]) => {
      const interviews: Interview[] = interviewsData.success ? interviewsData.data : [];
      const preAnalyses: any[] = preData.success ? preData.data : [];

      // Group interviews by company
      const grouped: Record<string, Interview[]> = {};
      interviews.forEach((i) => {
        if (!grouped[i.companyName]) grouped[i.companyName] = [];
        grouped[i.companyName].push(i);
      });

      const result: CompanyProfile[] = Object.entries(grouped).map(([name, ivs]) => {
        const redFlags: string[] = [];
        const greenFlags: string[] = [];
        let totalRating = 0;

        ivs.forEach((i) => {
          totalRating += i.experienceRating || 0;
          if (i.aiTags) {
            try {
              const tags = JSON.parse(i.aiTags as unknown as string);
              if (tags.redFlags) redFlags.push(...tags.redFlags);
              if (tags.greenFlags) greenFlags.push(...tags.greenFlags);
            } catch {}
          }
        });

        // Find linked pre-interview analysis
        const preAnalysis = preAnalyses.find(
          (p: any) => p.companyName === name && p.linkedInterviewId
        );

        // Sort interviews by date desc
        const sorted = [...ivs].sort(
          (a, b) => new Date(b.interviewDate).getTime() - new Date(a.interviewDate).getTime()
        );

        // Result summary: count each result type
        const resultCounts: Record<string, number> = {};
        sorted.forEach((i) => { resultCounts[i.result] = (resultCounts[i.result] || 0) + 1; });
        const summaryParts = Object.entries(resultCounts)
          .sort(([a], [b]) => (resultPriority[a] || 99) - (resultPriority[b] || 99))
          .map(([r, c]) => `${r}${c}次`);

        return {
          name,
          interviews: sorted,
          latestDate: sorted[0]?.interviewDate || "",
          resultSummary: summaryParts.join("，"),
          avgRating: Math.round(totalRating / ivs.length),
          redFlags: [...new Set(redFlags)].slice(0, 4),
          greenFlags: [...new Set(greenFlags)].slice(0, 4),
          preInterviewId: preAnalysis?.id,
        };
      });

      // Sort by most recent activity
      result.sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());
      setProfiles(result);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30">
      <Header />
      <main className="container max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Building2 className="h-6 w-6 text-blue-600" />
          {t("title")}
        </h1>
        <p className="text-sm text-slate-500 mb-6">汇总每家公司的面试记录、AI 标签和分析报告</p>

        {loading ? (
          <div className="text-center py-12 text-slate-400">{t("loading")}</div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">{t("noCompany")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {profiles.map((profile) => (
              <Card key={profile.name} className="hover:shadow-md transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{profile.name}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <Badge variant="secondary" className="text-xs">
                          {profile.interviews.length} 次面试
                        </Badge>
                        <span>{profile.resultSummary}</span>
                        <span>· 均{profile.avgRating}⭐</span>
                        <span>· 最近 {new Date(profile.latestDate).toLocaleDateString(locale)}</span>
                      </div>
                    </div>
                    <Link href={`/interviews?search=${encodeURIComponent(profile.name)}`}>
                      <ChevronRight className="h-5 w-5 text-slate-300 hover:text-blue-500" />
                    </Link>
                  </div>

                  {/* Red flags */}
                  {profile.redFlags.length > 0 && (
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                      <div className="flex gap-1 flex-wrap">
                        {profile.redFlags.map((f) => (
                          <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Green flags */}
                  {profile.greenFlags.length > 0 && (
                    <div className="flex items-start gap-2 mb-2">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <div className="flex gap-1 flex-wrap">
                        {profile.greenFlags.map((f) => (
                          <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Link to pre-interview analysis */}
                  {profile.preInterviewId && (
                    <Link
                      href={`/pre-interview/${profile.preInterviewId}`}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                    >
                      <ExternalLink className="h-3 w-3" /> 查看面试前分析报告
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
