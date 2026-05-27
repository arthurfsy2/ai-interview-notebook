"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ArrowLeft, FileSearch, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { parseBossJD } from "@/lib/parsers/boss";

export default function NewPreInterviewPage() {
  const t = useTranslations("PreInterview");
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: "",
    position: "",
    workSchedule: "未提及",
    jdRawText: "",
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [step, setStep] = useState<"input" | "searching" | "analyzing" | "done">("input");
  const [result, setResult] = useState<any>(null);
  const [parsed, setParsed] = useState<any>(null);

  const handleJdChange = (text: string) => {
    setForm({ ...form, jdRawText: text });
    // Auto-detect BOSS format
    const parsed_ = parseBossJD(text);
    if (parsed_.detected) {
      setParsed(parsed_);
      setForm({
        ...form,
        companyName: parsed_.companyName || form.companyName,
        position: parsed_.position || form.position,
        jdRawText: text,
      });
    }
  };

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
      // Use cleaned JD text if BOSS format detected
      const jdToAnalyze = parsed?.detected && parsed?.jdText
        ? `岗位：${form.position}\n公司：${form.companyName}\n薪资：${parsed.salary}\n城市：${parsed.location}\n经验：${parsed.experience}\n学历：${parsed.education}\n状态：${parsed.listingStatus} ${parsed.companySize} ${parsed.industry}\n福利：${parsed.benefits.join("、")}\n${parsed.workAddress ? `工作地址：${parsed.workAddress}\n` : ""}\n职位描述：\n${parsed.jdText}\n\n公司介绍：\n${parsed.companyIntro}`
        : form.jdRawText;

      const res = await fetch("/api/pre-interview/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.companyName,
          position: form.position,
          jdRawText: jdToAnalyze,
          workSchedule: form.workSchedule !== "未提及" ? form.workSchedule : null,
          // 传递 BOSS 显示名用于二次搜索
          ...(parsed?.companyDisplayName && parsed.companyDisplayName !== form.companyName
            ? { searchAltName: parsed.companyDisplayName }
            : {}),
        }),
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

            {/* Work Schedule */}
            <div>
              <Label className="flex items-center gap-2">
                工作制度
                <span className="text-xs text-slate-400 font-normal">（约面时确认，未提及则留空）</span>
              </Label>
              <Select value={form.workSchedule} onValueChange={(v) => setForm({ ...form, workSchedule: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="未提及">未提及</SelectItem>
                  <SelectItem value="双休">双休</SelectItem>
                  <SelectItem value="大小周">大小周</SelectItem>
                  <SelectItem value="单休">单休</SelectItem>
                  <SelectItem value="996">996</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* JD Paste */}
            <div>
              <Label className="flex items-center justify-between">
                <span>{t("pasteJD")} *</span>
                {parsed?.detected && (
                  <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />BOSS直聘 已识别
                  </Badge>
                )}
              </Label>
              <Textarea
                className="min-h-[200px] max-h-[400px] text-sm"
                placeholder={t("jdPlaceholder")}
                value={form.jdRawText}
                onChange={(e) => handleJdChange(e.target.value)}
                disabled={analyzing}
              />
              {parsed?.detected && (
                <div className="mt-2 text-xs text-slate-500 bg-emerald-50 border border-emerald-100 rounded-lg p-3 space-y-1">
                  <p className="font-medium text-emerald-700 mb-1">自动提取信息：</p>
                  {parsed.companyName && <p>🏢 公司：{parsed.companyName}</p>}
                  {parsed.position && <p>💼 岗位：{parsed.position}</p>}
                  {parsed.salary && <p>💰 薪资：{parsed.salary}</p>}
                  {parsed.location && <p>📍 城市：{parsed.location} {parsed.experience && `· ${parsed.experience}`} {parsed.education && `· ${parsed.education}`}</p>}
                  {parsed.listingStatus && <p>📊 状态：{parsed.listingStatus} {parsed.companySize && `· ${parsed.companySize}`} {parsed.industry && `· ${parsed.industry}`}</p>}
                  {parsed.benefits.length > 0 && <p>🎁 福利：{parsed.benefits.join("、")}</p>}
                  {parsed.jdText && <p className="text-slate-400">📝 JD正文已提取（{parsed.jdText.length}字）</p>}
                </div>
              )}
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
