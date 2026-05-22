"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Plus, FileSearch, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function PreInterviewListPage() {
  const t = useTranslations("PreInterview");

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
      </main>
      <Footer />
    </div>
  );
}
