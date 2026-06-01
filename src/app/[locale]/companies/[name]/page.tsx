"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import {
  ArrowLeft,
  Building2,
  Calendar,
  MapPin,
  Tag,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  BriefcaseBusiness,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

const resultPriority: Record<string, number> = {
  "通过": 1, "待定": 2, "无消息": 3, "主动放弃": 4, "被拒": 5,
};

export default function CompanyDetailPage() {
  const t = useTranslations("Companies");
  const locale = useLocale();
  const params = useParams();
  const router = useRouter();
  const companyName = decodeURIComponent(params.name as string);

  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/interviews").then((r) => r.json()),
      fetch("/api/pre-interview").then((r) => r.json()),
    ]).then(([interviewsData, preData]) => {
      const interviews: Interview[] = interviewsData.success ? interviewsData.data : [];
      const preAnalyses: any[] = preData.success ? preData.data : [];

      const companyInterviews = interviews.filter((i) => i.companyName === companyName);
      if (companyInterviews.length === 0) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const redFlags: string[] = [];
      const greenFlags: string[] = [];
      let totalRating = 0;

      companyInterviews.forEach((i) => {
        totalRating += i.experienceRating || 0;
        if (i.aiTags) {
          try {
            const tags = JSON.parse(i.aiTags as unknown as string);
            if (tags.redFlags) redFlags.push(...tags.redFlags);
            if (tags.greenFlags) greenFlags.push(...tags.greenFlags);
          } catch {}
        }
      });

      const preAnalysis = preAnalyses.find(
        (p: any) => p.companyName === companyName && p.linkedInterviewId
      );

      const sorted = [...companyInterviews].sort(
        (a, b) => new Date(b.interviewDate).getTime() - new Date(a.interviewDate).getTime()
      );

      const resultCounts: Record<string, number> = {};
      sorted.forEach((i) => { resultCounts[i.result] = (resultCounts[i.result] || 0) + 1; });
      const summaryParts = Object.entries(resultCounts)
        .sort(([a], [b]) => (resultPriority[a] || 99) - (resultPriority[b] || 99))
        .map(([r, c]) => `${r}${c}次`);

      setProfile({
        name: companyName,
        interviews: sorted,
        latestDate: sorted[0]?.interviewDate || "",
        resultSummary: summaryParts.join("，"),
        avgRating: Math.round(totalRating / companyInterviews.length),
        redFlags: [...new Set(redFlags)],
        greenFlags: [...new Set(greenFlags)],
        preInterviewId: preAnalysis?.id,
      });
      setLoading(false);
    });
  }, [companyName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="container max-w-3xl mx-auto px-4 py-12 text-center text-slate-400">{t("loading")}</main>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="container max-w-3xl mx-auto px-4 py-12 text-center text-slate-400">{t("noCompany")}</main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30">
      <Header />
      <main className="container max-w-3xl mx-auto px-4 py-8">
        {/* Back */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-700"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">{t("detailBack")}</span>
          </button>
        </div>

        {/* Company Header */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-900 mb-1">{profile.name}</h2>
                <div className="flex items-center gap-2 text-sm text-slate-500 flex-wrap">
                  <Badge variant="secondary">{t("interviewCount", { count: profile.interviews.length })}</Badge>
                  <span>{profile.resultSummary}</span>
                  <span>· 均{profile.avgRating}⭐</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Red Flags */}
        {profile.redFlags.length > 0 && (
          <Card className="mb-4 border-red-200 bg-red-50/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-700 mb-1">风险信号</p>
                  <div className="flex gap-1 flex-wrap">
                    {profile.redFlags.map((f) => (
                      <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Green Flags */}
        {profile.greenFlags.length > 0 && (
          <Card className="mb-4 border-emerald-200 bg-emerald-50/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-700 mb-1">正面信号</p>
                  <div className="flex gap-1 flex-wrap">
                    {profile.greenFlags.map((f) => (
                      <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pre-Interview Analysis Link */}
        {profile.preInterviewId && (
          <Card className="mb-6 border-blue-200 bg-blue-50/30">
            <CardContent className="p-4">
              <Button
                variant="ghost"
                className="w-full justify-start text-blue-700 hover:bg-blue-100"
                onClick={() => router.push(`/pre-interview/${profile.preInterviewId}`)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                查看面试前分析报告
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Interview Timeline */}
        <h3 className="text-base font-semibold text-slate-700 mb-3">{t("allInterviews")}</h3>
        <div className="space-y-3">
          {profile.interviews.map((item) => (
            <Card
              key={item.id}
              className="hover:shadow-md transition-all cursor-pointer group"
              onClick={() => router.push(`/interviews/${item.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-slate-900 truncate">{item.position}</h4>
                      <Badge className={`${getResultBadge(item.result)} text-xs`}>{item.result}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(item.interviewDate).toLocaleDateString(locale)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {item.interviewMode}
                      </span>
                      {item.salaryRange && <span>{item.salaryRange}</span>}
                      <span>{"⭐".repeat(item.experienceRating)}</span>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-slate-500 mt-2 line-clamp-1">{item.notes}</p>
                    )}
                    {/* AI tags preview */}
                    {item.aiTags && (() => {
                      try {
                        const tags = JSON.parse(item.aiTags as string);
                        return (tags.redFlags?.length > 0 || tags.keyTopics?.length > 0) && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {tags.redFlags?.slice(0, 2).map((f: string) => (
                              <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                                ⚠ {f}
                              </span>
                            ))}
                            {tags.keyTopics?.slice(0, 2).map((t: string) => (
                              <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                                <Tag className="h-3 w-3 inline mr-0.5" />{t}
                              </span>
                            ))}
                          </div>
                        );
                      } catch { return null; }
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
