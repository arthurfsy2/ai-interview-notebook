"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { Plus, FileSearch, ChevronRight, Trash2, Search, X, SlidersHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const verdictColors: Record<string, string> = {
  "建议去": "bg-emerald-100 text-emerald-700",
  "可考虑": "bg-blue-100 text-blue-700",
  "谨慎": "bg-amber-100 text-amber-700",
  "不建议": "bg-red-100 text-red-700",
};

export default function PreInterviewListPage() {
  const t = useTranslations("PreInterview");
  const locale = useLocale();
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [verdictFilter, setVerdictFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showFilters, setShowFilters] = useState(false);

  const fetchAnalyses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (verdictFilter) params.set("verdict", verdictFilter);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);

      const res = await fetch(`/api/pre-interview?${params.toString()}`);
      const d = await res.json();
      if (d.success) setAnalyses(d.data || []);
    } catch (e) {}
    finally {
      setLoading(false);
    }
  }, [search, verdictFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const clearFilters = () => {
    setSearch("");
    setVerdictFilter("");
    setSortBy("createdAt");
    setSortOrder("desc");
  };

  const hasActiveFilters = search || verdictFilter || sortBy !== "createdAt" || sortOrder !== "desc";

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("确定要删除这条评估记录吗？关联的面试记录将自动解绑。")) return;
    try {
      await fetch(`/api/pre-interview/${id}`, { method: "DELETE" });
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30">
      <Header />
      <main className="container max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileSearch className="h-6 w-6 text-blue-600" />
            {t("title")}
          </h1>
          <Link href="/pre-interview/new">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-1" />
              {t("newAnalysis")}
            </Button>
          </Link>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 pr-4"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "bg-blue-50 border-blue-200" : ""}
            >
              <SlidersHorizontal className="h-4 w-4 mr-1" />
              {t("filter")}
            </Button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <Card className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">{t("verdict")}</label>
                  <Select value={verdictFilter} onValueChange={setVerdictFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("all")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("all")}</SelectItem>
                      <SelectItem value="建议去">建议去</SelectItem>
                      <SelectItem value="可考虑">可考虑</SelectItem>
                      <SelectItem value="谨慎">谨慎</SelectItem>
                      <SelectItem value="不建议">不建议</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">{t("sortBy")}</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt">{t("createdAt")}</SelectItem>
                      <SelectItem value="score">{t("score")}</SelectItem>
                      <SelectItem value="companyName">Company</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">{t("sortOrder")}</label>
                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">{t("descending")}</SelectItem>
                      <SelectItem value="asc">{t("ascending")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500">
                      {t("clearFilters")}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">{t("loading")}</div>
        ) : analyses.length === 0 ? (
          <div className="text-center py-20">
            <FileSearch className="h-16 w-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">{t("noAnalyses")}</p>
            <Link href="/pre-interview/new">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-1" />
                {t("newAnalysis")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {analyses.map((item) => (
              <div key={item.id} className="relative group/item">
                <Link href={`/pre-interview/${item.id}`}>
                  <Card className="group hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900">{item.companyName}</h3>
                          {item.verdict && (
                            <Badge className={`text-xs ${verdictColors[item.verdict] || "bg-slate-100"}`}>
                              {item.verdict}
                            </Badge>
                          )}
                          {item.score != null && (
                            <span className="text-xs text-slate-400">{item.score}分</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">{item.position}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(item.createdAt).toLocaleDateString(locale)}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500 flex-shrink-0 ml-2" />
                    </CardContent>
                  </Card>
                </Link>
                <button
                  onClick={(e) => handleDelete(item.id, e)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/item:opacity-100 transition-all"
                  title="删除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
