"use client";

import { usePathname, useRouter, Link } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import {
  FileSearch,
  FileText,
  BarChart3,
  Building2,
  Settings,
  Languages,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

export function Header() {
  const t = useTranslations("Navigation");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: t("preInterview"), href: "/pre-interview", icon: FileSearch },
    { name: t("interviews"), href: "/interviews", icon: FileText },
    { name: t("companies"), href: "/companies", icon: Building2 },
    { name: t("analytics"), href: "/analytics", icon: BarChart3 },
  ];

  const switchLocale = () => {
    const nextLocale = locale === "en" ? "zh" : "en";
    // Strip any existing locale prefix to prevent double-prefixing
    // (usePathname() may not strip the prefix if useLocale() mismatches the URL locale)
    const cleanPath = pathname.replace(/^\/(zh|en)(\/|$)/, "/$2");
    router.replace(cleanPath, { locale: nextLocale });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center pl-4 sm:pl-6">
          <Link href="/" className="mr-6 flex items-center space-x-2 group">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg hidden sm:inline">
              面试复盘
            </span>
          </Link>

          <nav className="hidden lg:flex items-center space-x-1 text-sm font-medium">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-1 px-3 py-2 rounded-lg transition-all",
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 pr-4">
          <Link
            href="/profile"
            className={cn(
              "hidden lg:flex items-center space-x-1 px-3 py-2 rounded-lg transition-all text-sm font-medium",
              pathname === "/profile"
                ? "bg-blue-100 text-blue-700"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Settings className="h-4 w-4" />
            <span>{t("profile")}</span>
          </Link>

          <Link
            href="/settings"
            className={cn(
              "hidden lg:flex items-center space-x-1 px-3 py-2 rounded-lg transition-all text-sm font-medium",
              pathname === "/settings"
                ? "bg-blue-100 text-blue-700"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Settings className="h-4 w-4" />
            <span>{t("settings")}</span>
          </Link>

          <button
            onClick={switchLocale}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all border border-transparent hover:border-border"
          >
            <Languages className="h-4 w-4" />
            <span>{locale === "en" ? "中文" : "English"}</span>
          </button>

          <button
            className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t bg-white shadow-lg">
          <nav className="container py-3 flex flex-col space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium",
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            <div className="border-t my-2" />
            <Link
              href="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <Settings className="h-4 w-4" />
              <span>{t("profile")}</span>
            </Link>
            <Link
              href="/settings"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <Settings className="h-4 w-4" />
              <span>{t("settings")}</span>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
