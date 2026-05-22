"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Save, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function ProfilePage() {
  const t = useTranslations("Profile");
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    resumeText: "",
    currentTitle: "",
    yearsOfExperience: 0,
    targetTitle: "",
    targetIndustry: "",
    monthlyPreTax: 0,
    workSchedule: "双休",
    location: "",
  });

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          const p = d.data;
          let salary = { monthlyPreTax: 0, workSchedule: "双休" };
          try { salary = JSON.parse(p.currentSalary || "{}"); } catch {}
          setForm({
            resumeText: p.resumeText || "",
            currentTitle: p.currentTitle || "",
            yearsOfExperience: p.yearsOfExperience || 0,
            targetTitle: p.targetTitle || "",
            targetIndustry: Array.isArray(JSON.parse(p.targetIndustry || "[]")) ? JSON.parse(p.targetIndustry).join(", ") : "",
            monthlyPreTax: salary.monthlyPreTax || 0,
            workSchedule: salary.workSchedule || "双休",
            location: p.location || "",
          });
        }
      });
  }, []);

  const handleSave = async () => {
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: form.resumeText,
          currentTitle: form.currentTitle,
          yearsOfExperience: form.yearsOfExperience,
          targetTitle: form.targetTitle,
          targetIndustry: form.targetIndustry.split(",").map((s) => s.trim()).filter(Boolean),
          currentSalary: {
            monthlyPreTax: form.monthlyPreTax,
            workSchedule: form.workSchedule,
            monthsPerYear: 12,
          },
          location: form.location,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30">
      <Header />
      <main className="container max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <User className="h-6 w-6 text-blue-600" />
          {t("title")}
        </h1>
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div>
              <Label>{t("resumeText")}</Label>
              <Textarea
                className="min-h-[160px] font-mono text-sm"
                placeholder={t("resumePlaceholder")}
                value={form.resumeText}
                onChange={(e) => setForm({ ...form, resumeText: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t("currentTitle")}</Label><Input value={form.currentTitle} onChange={(e) => setForm({ ...form, currentTitle: e.target.value })} /></div>
              <div><Label>{t("yearsOfExperience")}</Label><Input type="number" value={form.yearsOfExperience} onChange={(e) => setForm({ ...form, yearsOfExperience: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t("targetTitle")}</Label><Input value={form.targetTitle} onChange={(e) => setForm({ ...form, targetTitle: e.target.value })} /></div>
              <div><Label>{t("targetIndustry")}</Label><Input value={form.targetIndustry} onChange={(e) => setForm({ ...form, targetIndustry: e.target.value })} placeholder="用逗号分隔" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t("monthlyPreTax")}</Label><Input type="number" value={form.monthlyPreTax} onChange={(e) => setForm({ ...form, monthlyPreTax: Number(e.target.value) })} /></div>
              <div>
                <Label>{t("workSchedule")}</Label>
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
            <div><Label>{t("location")}</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" />
              {saved ? t("saved") : t("save")}
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
