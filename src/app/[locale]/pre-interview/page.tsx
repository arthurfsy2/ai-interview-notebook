"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { Plus, FileSearch, ChevronRight, Sparkles, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

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

  useEffect(() => {
    fetch("/api/pre-interview")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setAnalyses(d.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
