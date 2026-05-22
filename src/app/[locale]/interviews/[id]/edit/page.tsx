"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
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
import type { Interview } from "@/types";

export default function EditInterviewPage() {
  const t = useTranslations("Interview");
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    position: "",
    interviewDate: "",
    interviewMode: "线下" as string,
    result: "待定" as string,
    experienceRating: 3,
    rounds: 1,
    salaryRange: "",
    commuteTime: "",
    notes: "",
  });

  useEffect(() => {
    fetch(`/api/interviews/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const item = d.data;
          setForm({
            companyName: item.companyName || "",
            position: item.position || "",
            interviewDate: item.interviewDate ? new Date(item.interviewDate).toISOString().split("T")[0] : "",
            interviewMode: item.interviewMode || "线下",
            result: item.result || "待定",
            experienceRating: item.experienceRating || 3,
            rounds: item.rounds || 1,
            salaryRange: item.salaryRange || "",
            commuteTime: item.commuteTime || "",
            notes: item.notes || "",
          });
        }
        setLoading(false);
      });
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/interviews/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/interviews/${id}`);
      }
    } catch (e) {
      console.error("Save failed:", e);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="container max-w-2xl mx-auto px-4 py-12 text-center text-slate-400">加载中...</main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30">
      <Header />
      <main className="container max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">{t("editRecord")}</h1>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("companyName")} *</Label>
                <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
              </div>
              <div>
                <Label>{t("position")} *</Label>
                <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("interviewDate")}</Label>
                <Input type="date" value={form.interviewDate} onChange={(e) => setForm({ ...form, interviewDate: e.target.value })} />
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
                <Select value={String(form.experienceRating)} onValueChange={(v) => setForm({ ...form, experienceRating: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((r) => (
                      <SelectItem key={r} value={String(r)}>{"⭐".repeat(r)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>{t("rounds")}</Label>
                <Input type="number" min={1} value={form.rounds} onChange={(e) => setForm({ ...form, rounds: Number(e.target.value) })} />
              </div>
              <div>
                <Label>{t("salaryRange")}</Label>
                <Input value={form.salaryRange} onChange={(e) => setForm({ ...form, salaryRange: e.target.value })} />
              </div>
              <div>
                <Label>{t("commuteTime")}</Label>
                <Input value={form.commuteTime} onChange={(e) => setForm({ ...form, commuteTime: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>{t("notes")}</Label>
              <Textarea
                className="min-h-[120px]"
                placeholder={t("notesPlaceholder")}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={saving} onClick={handleSave}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                {saving ? t("saving") : t("save")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
