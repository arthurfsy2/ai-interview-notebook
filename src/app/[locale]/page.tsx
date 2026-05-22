"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileSearch,
  FileText,
  Zap,
  BarChart3,
  ArrowRight,
  Plus,
  Mic,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("Index");
  const [stats, setStats] = useState({ total: 0, passed: 0, good: 0, risk: 0 });

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setStats({
            total: d.data.totalInterviews || 0,
            passed: d.data.passRate || 0,
            good: d.data.goodExperience || 0,
            risk: d.data.highRiskCompanies || 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  const features = [
    {
      title: t("preInterview"),
      description: "粘贴 JD → AI 分析公司背景、薪资换算、简历匹配 → 决策报告",
      icon: FileSearch,
      color: "text-blue-600",
      bg: "bg-blue-100",
      href: "/pre-interview/new",
    },
    {
      title: "快速录入",
      description: "面试后手机一句话速记 + 语音转文字，零门槛记录",
      icon: Mic,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
      href: "/interviews/new?quick=1",
    },
    {
      title: "面试记录",
      description: "完整的面试历史、AI 自动提取标签、结构化对比",
      icon: FileText,
      color: "text-violet-600",
      bg: "bg-violet-100",
      href: "/interviews",
    },
    {
      title: "分析面板",
      description: "跨记录模式发现：高频风险信号、被拒原因分布、核心考察点",
      icon: BarChart3,
      color: "text-amber-600",
      bg: "bg-amber-100",
      href: "/analytics",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 via-white to-blue-50/30">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-20 pb-16 overflow-hidden">
          <div className="container mx-auto px-4 relative">
            <div className="mx-auto max-w-[56rem] text-center space-y-6">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
                <span className="block text-slate-900">{t("subTitle1")}</span>
                <span className="block text-xl sm:text-2xl mt-3 text-slate-400">
                  {t("subTitle2")}
                </span>
              </h1>

              <p className="mx-auto max-w-[40rem] text-base sm:text-lg text-slate-600 leading-relaxed">
                {t("heroDesc")}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link href="/pre-interview/new">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/25 h-14 px-8 text-base rounded-xl group"
                  >
                    <FileSearch className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                    {t("startAnalysis")}
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/interviews/new">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 px-8 text-base rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    {t("newRecord")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section className="py-8 bg-white/50">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: t("stats.totalInterviews"), value: stats.total, icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
                { label: t("stats.passRate"), value: `${stats.passed}%`, icon: Zap, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: t("stats.goodExperience"), value: stats.good, icon: BarChart3, color: "text-violet-600", bg: "bg-violet-50" },
                { label: t("stats.highRisk"), value: stats.risk, icon: FileSearch, color: "text-red-600", bg: "bg-red-50" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.label} className="text-center py-4">
                    <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center mx-auto mb-2`}>
                      <Icon className={`h-5 w-5 ${item.color}`} />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{item.value}</div>
                    <div className="text-xs text-slate-500">{item.label}</div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10 space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">核心功能</h2>
              <p className="text-slate-500">覆盖面试全流程，从收到邀请到复盘总结</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Link key={feature.title} href={feature.href}>
                    <Card className="group border border-blue-50 bg-white hover:border-blue-200 transition-all duration-300 hover:-translate-y-1 card-elevated h-full">
                      <CardHeader className="space-y-4 pb-4">
                        <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center`}>
                          <Icon className={`h-6 w-6 ${feature.color}`} />
                        </div>
                        <CardTitle className="text-base font-semibold text-slate-900">
                          {feature.title}
                        </CardTitle>
                        <CardDescription className="text-slate-500 leading-relaxed text-sm">
                          {feature.description}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
