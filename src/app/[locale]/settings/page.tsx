"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, Check, Loader2, Key, Globe, Wifi, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { normalizeAIUrl } from "@/lib/ai-url";

interface AIConfigItem {
  id: string;
  provider: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  useFor: string;
  enabled: boolean;
  hasApiKey?: boolean;
  proxy?: string;
}

const PROVIDER_PRESETS: Record<string, { name: string; baseUrl: string; model: string; models: string[] }> = {
  dashscope: {
    name: "阿里百炼",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
    models: ["qwen-turbo", "qwen-plus", "qwen-max", "qwen3.6-plus"],
  },
  deepseek: {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
  openai: {
    name: "OpenAI 兼容",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"],
  },
  custom: {
    name: "自定义",
    baseUrl: "",
    model: "",
    models: [],
  },
};

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const [configs, setConfigs] = useState<AIConfigItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string; debug?: { requestUrl: string; normalizedBaseUrl: string; requestModel: string; method: string; apiKeyMasked: string } } | null>(null);
  const [editingId, setEditingId] = useState<string>(""); // 当前编辑中的 config id，空 = 新建
  const [webSearchKey, setWebSearchKey] = useState("");
  const [webSearchSaving, setWebSearchSaving] = useState(false);
  const [webSearchSaved, setWebSearchSaved] = useState(false);
  const [webSearchHasKey, setWebSearchHasKey] = useState(false);
  const [webSearchTesting, setWebSearchTesting] = useState(false);
  const [webSearchTestResult, setWebSearchTestResult] = useState<{ success: boolean; message?: string; error?: string; debug?: any } | null>(null);
  const [form, setForm] = useState({
    provider: "dashscope",
    name: "",
    apiKey: "",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
    useFor: "text",
  });

  const fetchConfigs = async () => {
    try {
      const res = await fetch("/api/settings/ai");
      const data = await res.json();
      if (data.success) {
        setConfigs(data.configs || []);
        setActiveId(data.activeId || "");
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchConfigs();
    // Load existing WebSearch key
    fetch("/api/settings/ai")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const wsConfig = (d.configs || []).find((c: any) => c.id === "websearch");
          if (wsConfig?.hasApiKey) setWebSearchHasKey(true);
        }
      });
  }, []);

  // 切换 provider 时自动填 baseUrl 和 model
  const handleProviderChange = (provider: string) => {
    const preset = PROVIDER_PRESETS[provider];
    if (preset && provider !== "custom") {
      setForm((prev) => ({
        ...prev,
        provider,
        baseUrl: preset.baseUrl,
        model: preset.models[0] || preset.model,
      }));
    } else {
      setForm((prev) => ({ ...prev, provider }));
    }
  };

  // 点击已有配置 → 加载到编辑器
  const handleEditConfig = (config: AIConfigItem) => {
    setEditingId(config.id);
    setForm({
      provider: config.provider,
      name: config.name,
      apiKey: "", // API key 不传回前端
      baseUrl: config.baseUrl,
      model: config.model,
      useFor: config.useFor || "text",
    });
    setTestResult(null);
  };

  // 新建配置
  const handleNewConfig = () => {
    setEditingId("");
    const preset = PROVIDER_PRESETS.dashscope;
    setForm({
      provider: "dashscope",
      name: "",
      apiKey: "",
      baseUrl: preset.baseUrl,
      model: preset.model,
      useFor: "text",
    });
    setTestResult(null);
  };

  // 保存（新建 or 更新）
  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId || `${form.provider}-${Date.now()}`,
          provider: form.provider,
          name: form.name,
          apiKey: form.apiKey,
          baseUrl: form.baseUrl,
          model: form.model,
          useFor: form.useFor,
          enabled: editingId ? undefined : configs.length === 0,
          ...(editingId && !form.apiKey ? {} : {}), // 空 key 时后端保留原 key
        }),
      });
      const data = await res.json();
      if (data.success) {
        setForm((prev) => ({ ...prev, name: "", apiKey: "" }));
        setEditingId("");
        setTestResult(null);
        fetchConfigs();
      }
    } catch (e) {}
    setSaving(false);
  };

  const handleSetActive = async (id: string) => {
    try {
      const res = await fetch("/api/settings/ai", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeId: id }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveId(id);
        // 同步更新编辑器（如果正在编辑当前激活的 config）
        const config = configs.find((c) => c.id === id);
        if (config) {
          setEditingId(config.id);
          setForm({
            provider: config.provider,
            name: config.name,
            apiKey: "",
            baseUrl: config.baseUrl,
            model: config.model,
            useFor: config.useFor || "text",
          });
        }
      }
    } catch (e) {}
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "delete" }),
      });
      const data = await res.json();
      if (data.success) {
        if (editingId === id) handleNewConfig();
        fetchConfigs();
      }
    } catch (e) {}
  };

  const handleSaveWebSearch = async () => {
    if (!webSearchKey.trim()) return;
    setWebSearchSaving(true);
    try {
      await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "websearch",
          provider: "websearch",
          name: "WebSearch",
          apiKey: webSearchKey,
          baseUrl: "",
          model: "",
          useFor: "text",
          enabled: true,
        }),
      });
      setWebSearchKey("");
      setWebSearchHasKey(true);
      setWebSearchSaved(true);
      setTimeout(() => setWebSearchSaved(false), 3000);
    } catch (e) {}
    setWebSearchSaving(false);
  };

  const handleTestWebSearch = async () => {
    setWebSearchTesting(true);
    setWebSearchTestResult(null);
    try {
      const res = await fetch("/api/settings/websearch/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: webSearchKey || undefined,
        }),
      });
      const data = await res.json();
      setWebSearchTestResult(data);
    } catch {
      setWebSearchTestResult({ success: false, error: "连接失败，请检查网络" });
    } finally {
      setWebSearchTesting(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: form.apiKey || undefined,
          baseUrl: form.baseUrl,
          model: form.model,
          provider: form.provider,
          configId: editingId || activeId || undefined,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, error: "连接失败，请检查网络" });
    } finally {
      setIsTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30">
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
        <h1 className="text-2xl font-bold text-slate-900 mb-6">{t("title")}</h1>

        {/* Saved configs list */}
        {configs.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">已保存的配置</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {configs.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleEditConfig(c)}
                    className={`cursor-pointer flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-sm ${
                      editingId === c.id
                        ? "border-blue-400 bg-blue-50 ring-1 ring-blue-200"
                        : c.id === activeId
                          ? "border-emerald-300 bg-emerald-50/50"
                          : "border-slate-200 hover:border-blue-200"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{c.name}</span>
                        <span className="text-xs text-slate-400">{c.provider}</span>
                        <span className="text-xs text-slate-400">{c.model}</span>
                        {c.id === activeId && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">启用中</span>
                        )}
                        {editingId === c.id && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">编辑中</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{c.baseUrl} · {c.useFor === "text" ? "文字分析" : "通用"}</div>
                    </div>
                    <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                      {c.id !== activeId && (
                        <Button size="sm" variant="ghost" onClick={() => handleSetActive(c.id)} title="设为启用">
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={handleNewConfig} className="mt-3 border-dashed w-full">
                <Plus className="h-4 w-4 mr-1" />新建配置
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Config Editor */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-600" />
              {editingId ? "编辑配置" : "添加 AI 配置"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Provider + Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("provider")}</Label>
                <Select value={form.provider} onValueChange={handleProviderChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROVIDER_PRESETS).map(([key, preset]) => (
                      <SelectItem key={key} value={key}>{preset.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("name")} *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例如：我的千问"
                />
              </div>
            </div>

            {/* API Key */}
            <div>
              <Label>
                {t("apiKey")} {!editingId && "*"}
                {editingId && <span className="text-xs text-slate-400 font-normal ml-1">（留空则保留已保存的 Key）</span>}
              </Label>
              <Input
                type="password"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                placeholder={editingId ? "留空保留原 Key，或输入新 Key" : "sk-..."}
              />
            </div>

            {/* Base URL + Model */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("baseUrl")}</Label>
                <Input value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} />
              </div>
              <div>
                <Label>{t("model")}</Label>
                {(() => {
                  const preset = PROVIDER_PRESETS[form.provider];
                  const presetModels = preset?.models || [];
                  const isCustomModel = presetModels.length > 0 && form.model && !presetModels.includes(form.model);

                  if (presetModels.length > 0) {
                    return (
                      <>
                        <Select
                          value={isCustomModel ? "__custom__" : form.model}
                          onValueChange={(v) => {
                            if (v === "__custom__") {
                              setForm({ ...form, model: "" });
                            } else {
                              setForm({ ...form, model: v });
                            }
                          }}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {presetModels.map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                            <SelectItem value="__custom__">自定义...</SelectItem>
                          </SelectContent>
                        </Select>
                        {isCustomModel && (
                          <Input
                            value={form.model}
                            onChange={(e) => setForm({ ...form, model: e.target.value })}
                            placeholder="输入自定义模型名"
                            className="mt-2"
                          />
                        )}
                      </>
                    );
                  }

                  return (
                    <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="输入模型名" />
                  );
                })()}
              </div>
            </div>

            {/* SDK URL Preview — full width below the grid */}
            {form.baseUrl && (
              <div className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded border">
                <span className="text-slate-400">SDK 调用地址：</span>
                <code className="text-blue-600 font-mono break-all">
                  {normalizeAIUrl(form.baseUrl, form.provider)}/chat/completions
                </code>
              </div>
            )}

            {/* Use For */}
            <div>
              <Label>{t("useFor")}</Label>
              <Select value={form.useFor} onValueChange={(v) => setForm({ ...form, useFor: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">文字分析</SelectItem>
                  <SelectItem value="all">通用</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Test result */}
            {testResult && (
              <div className={`text-sm p-3 rounded-lg space-y-2 ${
                testResult.success
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                <div className="font-medium">
                  {testResult.success
                    ? `✅ 连接成功：${testResult.message || ""}`
                    : `❌ 连接失败：${testResult.error || ""}`}
                </div>
                {testResult.debug && (
                  <div className="text-xs text-slate-500 space-y-0.5 pt-1 border-t border-current/10">
                    <div>🔗 请求地址：<code className="text-slate-600 bg-white/50 px-1 rounded">{testResult.debug.requestUrl}</code></div>
                    <div>📋 模型：<code className="text-slate-600 bg-white/50 px-1 rounded">{testResult.debug.requestModel}</code></div>
                    <div>🔑 API Key：<code className="text-slate-600 bg-white/50 px-1 rounded">{testResult.debug.apiKeyMasked}</code></div>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || (!editingId && !form.apiKey.trim())}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" />保存中...</>
                ) : (
                  <><Save className="h-4 w-4 mr-1" />{editingId ? "更新配置" : t("addConfig")}</>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={isTesting}
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                {isTesting ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" />测试中...</>
                ) : (
                  <><Wifi className="h-4 w-4 mr-1" />测试连接</>
                )}
              </Button>
              {editingId && (
                <Button variant="ghost" size="sm" onClick={handleNewConfig} className="text-slate-400">
                  <X className="h-4 w-4 mr-1" />取消编辑
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* WebSearch Config */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5 text-emerald-600" />
              WebSearch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <Label>{t("webSearchApiKey")}</Label>
                <p className="text-xs text-slate-400 mb-2">
                  {t("webSearchApiKeyDesc")}
                  <span className="ml-1">
                    <a href="https://tavily.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Tavily</a>
                    <span className="mx-1">·</span>
                    <a href="https://exa.ai" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Exa</a>
                  </span>
                </p>
                {webSearchHasKey && !webSearchKey && (
                  <p className="text-xs text-emerald-600 font-medium mb-1">✅ 已配置 API Key</p>
                )}
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder={webSearchHasKey ? "留空保留原 Key，或输入新 Key" : "tvly-... 或 exa-..."}
                    value={webSearchKey}
                    onChange={(e) => setWebSearchKey(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveWebSearch}
                    disabled={webSearchSaving || !webSearchKey.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {webSearchSaving ? (
                      <><Loader2 className="h-4 w-4 mr-1 animate-spin" />保存中</>
                    ) : webSearchSaved ? (
                      <><Check className="h-4 w-4 mr-1" />已保存</>
                    ) : (
                      <><Save className="h-4 w-4 mr-1" />保存</>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTestWebSearch}
                    disabled={webSearchTesting}
                    className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  >
                    {webSearchTesting ? (
                      <><Loader2 className="h-4 w-4 mr-1 animate-spin" />测试中</>
                    ) : (
                      <><Wifi className="h-4 w-4 mr-1" />测试</>
                    )}
                  </Button>
                </div>

                {/* WebSearch test result */}
                {webSearchTestResult && (
                  <div className={`text-xs p-2.5 rounded-lg ${
                    webSearchTestResult.success
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                    <div className="font-medium">
                      {webSearchTestResult.success
                        ? `✅ ${webSearchTestResult.message || "连接成功"}`
                        : `❌ 连接失败：${webSearchTestResult.error || ""}`}
                    </div>
                    {webSearchTestResult.debug && (
                      <div className="text-slate-500 mt-1 space-y-0.5">
                        <div>🔗 {webSearchTestResult.debug.requestUrl}</div>
                        <div>🏷 {webSearchTestResult.debug.provider}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("dataManagement")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full" onClick={() => window.location.href = "/api/export/xlsx"}>
              {t("exportAll")}
            </Button>
            <Button variant="outline" className="w-full text-red-600 hover:bg-red-50" onClick={() => {
              if (confirm(t("confirmDeleteAll"))) {
                fetch("/api/interviews", { method: "DELETE" });
              }
            }}>
              {t("deleteAllData")}
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
