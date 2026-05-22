"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, FileSearch, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function NewPreInterviewPage() {
  const t = useTranslations("PreInterview");
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: "",
    position: "",
    jdRawText: "",
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [step, setStep] = useState<"input" | "searching" | "analyzing" | "done">("input");
  const [result, setResult] = useState<any>(null);

  // Pre-fill profile if available
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          // Profile loaded, could pre-fill resume
        }
      });
  }, []);

  const handleAnalyze = async () => {
    if (!form.jdRawText.trim() || !form.companyName.trim()) return;

    setAnalyzing(true);
    setStep("searching");

    try {
      const res = await fetch("/api/pre-interview/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        setStep("done");
        if (data._error) {
          alert(`分析过程中出现问题：${data._error}`);
        }
        // Navigate to report
        router.push(`/pre-interview/${data.data.id}`);
      } else {
        setStep("input");
        alert(data.error || "分析失败，请检查 AI 配置");
      }
    } catch (e) {
      console.error("Analysis failed:", e);
      setStep("input");
      alert("分析请求失败，请检查网络或 AI 配置");
    }
    setAnalyzing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30">
      <Header />
      <main className="container max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">{t("newAnalysis")}</h1>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            {/* Company & Position */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("companyName")} *</Label>
                <Input
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  placeholder="公司名称"
                  disabled={analyzing}
                />
              </div>
              <div>
                <Label>{t("position")} *</Label>
                <Input
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  placeholder="岗位名称"
                  disabled={analyzing}
                />
              </div>
            </div>

            {/* JD Paste */}
            <div>
              <Label>{t("pasteJD")} *</Label>
              <Textarea
                className="min-h-[200px] text-sm"
                placeholder={t("jdPlaceholder")}
                value={form.jdRawText}
                onChange={(e) => setForm({ ...form, jdRawText: e.target.value })}
                disabled={analyzing}
              />
            </div>

            {/* Analyze Button */}
            <Button
              className="w-full h-12 text-base bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25"
              onClick={handleAnalyze}
              disabled={analyzing || !form.companyName.trim() || !form.jdRawText.trim()}
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {step === "searching" ? t("webSearching") : t("analyzing")}
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  {t("analyze")}
                </>
              )}
            </Button>

            {/* Progress indicator */}
            {analyzing && (
              <div className="space-y-2">
                <div className={`flex items-center gap-2 text-sm ${step === "searching" ? "text-blue-600" : "text-slate-400"}`}>
                  <span className={step === "searching" ? "animate-pulse" : ""}>🔍 {t("webSearching")}</span>
                </div>
                <div className={`flex items-center gap-2 text-sm ${step === "analyzing" ? "text-blue-600" : "text-slate-400"}`}>
                  <span className={step === "analyzing" ? "animate-pulse" : ""}>🤖 {t("analyzing")}</span>
                </div>
                <div className={`flex items-center gap-2 text-sm ${step === "done" ? "text-emerald-600" : "text-slate-400"}`}>
                  <span>✅ 分析完成</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
