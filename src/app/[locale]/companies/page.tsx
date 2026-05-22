"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Building2, ChevronRight, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import type { Interview } from "@/types";

export default function CompaniesPage() {
  const t = useTranslations("Companies");
  const [groups, setGroups] = useState<Record<string, Interview[]>>({});

  useEffect(() => {
    fetch("/api/interviews")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const grouped: Record<string, Interview[]> = {};
          d.data.forEach((i: Interview) => {
            if (!grouped[i.companyName]) grouped[i.companyName] = [];
            grouped[i.companyName].push(i);
          });
          setGroups(grouped);
        }
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30">
      <Header />
      <main className="container max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Building2 className="h-6 w-6 text-blue-600" />
          {t("title")}
        </h1>

        {Object.keys(groups).length === 0 ? (
          <div className="text-center py-12 text-slate-400">{t("noCompany")}</div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groups).map(([company, interviews]) => {
              const allTags: string[] = [];
              interviews.forEach((i) => {
                if (i.aiTags) {
                  try {
                    const tags = JSON.parse(i.aiTags as unknown as string);
                    if (tags.redFlags) allTags.push(...tags.redFlags);
                    if (tags.greenFlags) allTags.push(...tags.greenFlags);
                  } catch {}
                }
              });
              const uniqueTags = [...new Set(allTags)].slice(0, 4);

              return (
                <Link key={company} href={`/interviews?search=${encodeURIComponent(company)}`}>
                  <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900">{company}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {interviews.length} {t("totalInterviews")}
                          </Badge>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {uniqueTags.map((tag) => (
                            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              <Tag className="h-3 w-3 inline mr-0.5" />{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
