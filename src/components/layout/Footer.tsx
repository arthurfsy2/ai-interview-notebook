"use client";

import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("Navigation");

  return (
    <footer className="border-t py-4 bg-gradient-to-b from-slate-50/50 to-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm">
          <span className="font-medium text-slate-700">AI 面试全流程助手</span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-500">本地优先 · 隐私安全 · AI 驱动</span>
          <span className="text-slate-300">·</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
            <span className="text-xs font-medium text-blue-600">v0.1 MVP</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
