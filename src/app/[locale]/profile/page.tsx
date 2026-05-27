"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Save, User, ChevronUp, ChevronDown, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import type { PriorityKey } from "@/types";

const PRIORITY_OPTIONS: { key: PriorityKey; labelKey: string }[] = [
  { key: "salary", labelKey: "prioritySalary" },
  { key: "proximity", labelKey: "priorityProximity" },
  { key: "workSchedule", labelKey: "priorityWorkSchedule" },
  { key: "stability", labelKey: "priorityStability" },
  { key: "industry", labelKey: "priorityIndustry" },
];

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
    priorities: [] as PriorityKey[],
    residenceAddress: "",
  });

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          const p = d.data;
          let salary = { monthlyPreTax: 0, workSchedule: "双休" };
          try { salary = JSON.parse(p.currentSalary || "{}"); } catch {}

          let priorities: PriorityKey[] = [];
          try { priorities = JSON.parse(p.priorities || "[]"); } catch {}

          let residenceAddress = "";
          try {
            const residence = JSON.parse(p.residence || "{}");
            residenceAddress = typeof residence === "string" ? residence : (residence.address || residence.city || "");
          } catch {}

          setForm({
            resumeText: p.resumeText || "",
            currentTitle: p.currentTitle || "",
            yearsOfExperience: p.yearsOfExperience || 0,
            targetTitle: p.targetTitle || "",
            targetIndustry: Array.isArray(JSON.parse(p.targetIndustry || "[]")) ? JSON.parse(p.targetIndustry).join(", ") : "",
            monthlyPreTax: salary.monthlyPreTax || 0,
            workSchedule: salary.workSchedule || "双休",
            location: p.location || "",
            priorities,
            residenceAddress,
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
          priorities: form.priorities,
          residence: form.residenceAddress
            ? { address: form.residenceAddress }
            : {},
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) {}
  };

  const togglePriority = (key: PriorityKey) => {
    setForm((prev) => {
      if (prev.priorities.includes(key)) {
        return { ...prev, priorities: prev.priorities.filter((k) => k !== key) };
      }
      return { ...prev, priorities: [...prev.priorities, key] };
    });
  };

  const movePriority = (key: PriorityKey, direction: "up" | "down") => {
    setForm((prev) => {
      const idx = prev.priorities.indexOf(key);
      if (idx === -1) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.priorities.length) return prev;
      const next = [...prev.priorities];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return { ...prev, priorities: next };
    });
  };

  const getPriorityLabel = (key: PriorityKey) => {
    const opt = PRIORITY_OPTIONS.find((o) => o.key === key);
    return opt ? t(opt.labelKey) : key;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30">
      <Header />
      <main className="container max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <User className="h-6 w-6 text-blue-600" />
          {t("title")}
        </h1>

        {/* Basic Info */}
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
          </CardContent>
        </Card>

        {/* Priorities */}
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("priorities")}</CardTitle>
            <p className="text-xs text-slate-500">{t("prioritiesDesc")}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Available options to pick */}
            <div className="flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map((opt) => {
                const selected = form.priorities.includes(opt.key);
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => togglePriority(opt.key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                      selected
                        ? "bg-blue-50 text-blue-700 border-blue-300 shadow-sm"
                        : "bg-white text-slate-500 border-slate-200 hover:border-blue-200 hover:text-blue-600"
                    }`}
                  >
                    {selected && <X className="h-3 w-3" />}
                    {t(opt.labelKey)}
                  </button>
                );
              })}
            </div>

            {/* Ranked list */}
            {form.priorities.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-medium text-slate-500 mb-2">优先级排序</p>
                {form.priorities.map((key, idx) => (
                  <div
                    key={key}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <Badge className="bg-blue-600 text-white h-6 w-6 rounded-full flex items-center justify-center p-0 text-xs">
                      {idx + 1}
                    </Badge>
                    <span className="flex-1 text-sm font-medium text-slate-700">
                      {getPriorityLabel(key)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => movePriority(key, "up")}
                        className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        title={t("moveUp")}
                      >
                        <ChevronUp className="h-4 w-4 text-slate-500" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === form.priorities.length - 1}
                        onClick={() => movePriority(key, "down")}
                        className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        title={t("moveDown")}
                      >
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {form.priorities.length === 0 && (
              <p className="text-xs text-slate-400 py-2">{t("notSelected")}</p>
            )}
          </CardContent>
        </Card>

        {/* Residence */}
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("residence")}</CardTitle>
            <p className="text-xs text-slate-500">{t("residenceHint")}</p>
          </CardHeader>
          <CardContent>
            <Input
              value={form.residenceAddress}
              onChange={(e) => setForm({ ...form, residenceAddress: e.target.value })}
              placeholder={t("residencePlaceholder")}
            />
          </CardContent>
        </Card>

        <Button className="w-full bg-blue-600 hover:bg-blue-700 mt-6" onClick={handleSave}>
          <Save className="h-4 w-4 mr-1" />
          {saved ? t("saved") : t("save")}
        </Button>
      </main>
      <Footer />
    </div>
  );
}
