"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { ArrowLeft, Save, Mic, MicOff } from "lucide-react";
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
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

function useVoiceInput() {
  const [listening, setListening] = useState(false);

  const startListening = useCallback((onResult: (text: string) => void) => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("您的浏览器不支持语音识别，请使用 Chrome 或 Edge");
      return () => {};
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = locale === "en" ? "en-US" : "zh-CN";
    recognition.interimResults = false;
    recognition.continuous = true;

    setListening(true);
    recognition.start();

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      onResult(transcript);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    return () => {
      recognition.stop();
      setListening(false);
    };
  }, []);

  return { listening, startListening };
}

export default function NewInterviewPage() {
  const t = useTranslations("Interview");
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { listening, startListening } = useVoiceInput();

  const [form, setForm] = useState({
    companyName: "",
    position: "",
    interviewDate: new Date().toISOString().split("T")[0],
    interviewMode: "线下" as string,
    result: "待定" as string,
    experienceRating: 3,
    rounds: 1,
    salaryRange: "",
    commuteTime: "",
    workSchedule: "双休",
    notes: "",
  });

  // Pre-fill from query params (from pre-interview link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const company = params.get("company");
    const position = params.get("position");
    const salary = params.get("salary");
    const workSchedule = params.get("workSchedule");
    if (company || position || salary || workSchedule) {
      setForm((prev) => ({
        ...prev,
        ...(company ? { companyName: company } : {}),
        ...(position ? { position } : {}),
        ...(salary ? { salaryRange: salary } : {}),
        ...(workSchedule ? { workSchedule } : {}),
      }));
    }
  }, []);

  const handleVoiceInput = () => {
    startListening((text) => {
      setForm((prev) => ({ ...prev, notes: prev.notes + text }));
    });
  };

  const handleSave = async () => {
    if (!form.companyName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/interviews/${data.data.id}`);
      }
    } catch (e) {
      console.error("Save failed:", e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30">
      <Header />
      <main className="container max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">{t("newRecord")}</h1>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            {/* Company + Position */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("companyName")} *</Label>
                <Input
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  placeholder="公司名称"
                />
              </div>
              <div>
                <Label>{t("position")} *</Label>
                <Input
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  placeholder="岗位名称"
                />
              </div>
            </div>

            {/* Date + Mode */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("interviewDate")}</Label>
                <Input
                  type="date"
                  value={form.interviewDate}
                  onChange={(e) => setForm({ ...form, interviewDate: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("interviewMode")}</Label>
                <Select value={form.interviewMode} onValueChange={(v) => setForm({ ...form, interviewMode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="线下">线下</SelectItem>
                    <SelectItem value="线上">线上</SelectItem>
                    <SelectItem value="混合">混合</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Result + Rating */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("result")}</Label>
                <Select value={form.result} onValueChange={(v) => setForm({ ...form, result: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="待定">待定</SelectItem>
                    <SelectItem value="通过">通过</SelectItem>
                    <SelectItem value="被拒">被拒</SelectItem>
                    <SelectItem value="主动放弃">主动放弃</SelectItem>
                    <SelectItem value="无消息">无消息</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("experienceRating")}</Label>
                <Select
                  value={String(form.experienceRating)}
                  onValueChange={(v) => setForm({ ...form, experienceRating: Number(v) })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((r) => (
                      <SelectItem key={r} value={String(r)}>{"⭐".repeat(r)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Rounds + Salary + Commute + Work Schedule */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>{t("rounds")}</Label>
                <Input type="number" min={1} value={form.rounds} onChange={(e) => setForm({ ...form, rounds: Number(e.target.value) })} />
              </div>
              <div>
                <Label>{t("salaryRange")}</Label>
                <Input value={form.salaryRange} onChange={(e) => setForm({ ...form, salaryRange: e.target.value })} placeholder="如 15-20K" />
              </div>
              <div>
                <Label>{t("commuteTime")}</Label>
                <Input value={form.commuteTime} onChange={(e) => setForm({ ...form, commuteTime: e.target.value })} placeholder="如 30分钟" />
              </div>
              <div>
                <Label>工作制度</Label>
                <Select value={form.workSchedule} onValueChange={(v) => setForm({ ...form, workSchedule: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="双休">双休</SelectItem>
                    <SelectItem value="大小周">大小周</SelectItem>
                    <SelectItem value="单休">单休</SelectItem>
                    <SelectItem value="996">996</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes + Voice */}
            <div>
              <Label className="flex items-center justify-between mb-1.5">
                <span>{t("notes")}</span>
                <button
                  onClick={handleVoiceInput}
                  className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${
                    listening
                      ? "bg-red-100 text-red-600 animate-pulse"
                      : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                  }`}
                >
                  {listening ? (
                    <><MicOff className="h-3 w-3" /> 聆听中...</>
                  ) : (
                    <><Mic className="h-3 w-3" /> 语音输入</>
                  )}
                </button>
              </Label>
              <Textarea
                className="min-h-[140px]"
                placeholder={t("notesPlaceholder")}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={loading || !form.companyName.trim()}
                onClick={handleSave}
              >
                <Save className="h-4 w-4 mr-1" />
                {loading ? t("saving") : t("save")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
