"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import {
  Plus,
  Search,
  MapPin,
  Calendar,
  Tag,
  ChevronRight,
  Upload,
  BriefcaseBusiness,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import type { Interview } from "@/types";

const RESULT_OPTIONS = [
  { key: "all", labelKey: "filterAll" },
  { key: "通过", labelKey: "filterPassed" },
  { key: "被拒", labelKey: "filterRejected" },
  { key: "无消息", labelKey: "filterNoResponse" },
];

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

const getExpStars = (rating: number) => "⭐".repeat(rating) + "  ".repeat(5 - rating);

export default function InterviewsPage() {
  const t = useTranslations("Interview");
  const locale = useLocale();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchInterviews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("result", filter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/interviews?${params}`);
      const data = await res.json();
      if (data.success) setInterviews(data.data);
    } catch (e) {
      console.error("Failed to fetch interviews", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInterviews();
  }, [filter]);

  const handleSearch = () => {
    fetchInterviews();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30">
      <Header />
      <main className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <div className="flex gap-2">
            <Link href="/interviews/new">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-1" />
                {t("newRecord")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder={t("search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {RESULT_OPTIONS.map((opt) => (
              <Button
                key={opt.key}
                size="sm"
                variant={filter === opt.key ? "default" : "outline"}
                className={filter === opt.key ? "bg-blue-600" : ""}
                onClick={() => setFilter(opt.key)}
              >
                {t(opt.labelKey)}
              </Button>
            ))}
          </div>
        </div>

        {/* Interview List */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">{t("loading")}</div>
        ) : interviews.length === 0 ? (
          <div className="text-center py-16">
            <BriefcaseBusiness className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">{t("noRecords")}</p>
            <Link href="/interviews/new">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-1" />
                {t("newRecord")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {interviews.map((item) => (
              <Link key={item.id} href={`/interviews/${item.id}`}>
                <Card className="group hover:shadow-md hover:border-blue-200 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900 truncate">
                            {item.companyName}
                          </h3>
                          <Badge className={`${getResultBadge(item.result)} text-xs`}>
                            {item.result}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500 mb-2">{item.position}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(item.interviewDate).toLocaleDateString(locale)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {item.interviewMode}
                          </span>
                          {item.salaryRange && (
                            <span className="text-slate-400">{item.salaryRange}</span>
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-sm text-slate-500 mt-2 line-clamp-1">
                            {item.notes}
                          </p>
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
                      <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500 flex-shrink-0 ml-2" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
