"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "@/i18n/routing";
import { Link } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import {
  Plus,
  Search,
  MapPin,
  Calendar,
  Tag,
  ChevronRight,
  BriefcaseBusiness,
  Edit,
  Trash2,
  ChevronLeft,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import type { Interview } from "@/types";

const RESULT_OPTIONS = [
  { key: "待定", labelKey: "filterPending" },
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

export default function InterviewsPage() {
  const t = useTranslations("Interview");
  const locale = useLocale();
  const router = useRouter();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [calendarDate, setCalendarDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

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
    // 静默检查并更新超过配置天数的"待定"记录
    fetch("/api/interviews/auto-update-pending", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.updatedCount > 0) {
          // 有记录被更新，刷新列表
          fetchInterviews();
        }
      })
      .catch(() => {}); // 静默失败，不影响用户体验
  }, [filter]);

  const handleSearch = () => {
    fetchInterviews();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      const res = await fetch(`/api/interviews/${id}`, { method: "DELETE" });
      if (res.ok) {
        setInterviews((prev) => prev.filter((i) => i.id !== id));
      }
    } catch (e) {
      console.error("Failed to delete interview", e);
    }
  };

  // Filtered list: only show interviews in the selected calendar month
  const filteredInterviews = useMemo(() => {
    const { year, month } = calendarDate;
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    return interviews.filter((item) => item.interviewDate.startsWith(prefix));
  }, [interviews, calendarDate]);

  // Calendar: map date string -> interview count
  const interviewDateMap = useMemo(() => {
    const map: Record<string, number> = {};
    interviews.forEach((item) => {
      const key = item.interviewDate.split("T")[0];
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [interviews]);

  // Calendar: build days for current month
  const calendarDays = useMemo(() => {
    const { year, month } = calendarDate;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay(); // 0=Sun
    const totalDays = lastDay.getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) days.push(d);
    return days;
  }, [calendarDate]);

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

        {/* Calendar View */}
        {interviews.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setCalendarDate((prev) => {
                      const m = prev.month - 1;
                      return m < 0
                        ? { year: prev.year - 1, month: 11 }
                        : { year: prev.year, month: m };
                    })
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-sm font-semibold text-slate-700">
                  {calendarDate.year}年{calendarDate.month + 1}月
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setCalendarDate((prev) => {
                      const m = prev.month + 1;
                      return m > 11
                        ? { year: prev.year + 1, month: 0 }
                        : { year: prev.year, month: m };
                    })
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
                  <div key={d} className="text-xs font-medium text-slate-400 py-1">
                    {d}
                  </div>
                ))}
                {calendarDays.map((day, i) => {
                  if (day === null) return <div key={`empty-${i}`} />;
                  const dateStr = `${calendarDate.year}-${String(calendarDate.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const count = interviewDateMap[dateStr] || 0;
                  return (
                    <div
                      key={day}
                      className={`relative py-1.5 rounded-lg text-sm transition-colors ${
                        count > 0
                          ? "bg-blue-50 text-blue-700 font-semibold cursor-pointer hover:bg-blue-100"
                          : "text-slate-600"
                      }`}
                      title={count > 0 ? `${count} 场面试` : ""}
                    >
                      {day}
                      {count > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-50" />
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-500 text-[8px] text-white items-center justify-center">
                            {count}
                          </span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Interview List */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">{t("loading")}</div>
        ) : filteredInterviews.length === 0 ? (
          <div className="text-center py-16">
            <BriefcaseBusiness className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">
              {interviews.length === 0 ? t("noRecords") : `${calendarDate.year}年${calendarDate.month + 1}月暂无面试记录`}
            </p>
            <Link href="/interviews/new">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-1" />
                {t("newRecord")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredInterviews.map((item) => (
              <Card
                key={item.id}
                className="group hover:shadow-md hover:border-blue-200 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                onClick={() => router.push(`/interviews/${item.id}`)}
              >
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
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          router.push(`/interviews/${item.id}/edit`);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={(e) => handleDelete(e, item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500" />
                    </div>
                  </div>
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
