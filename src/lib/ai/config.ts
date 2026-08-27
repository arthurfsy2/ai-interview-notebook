/**
 * AI 配置管理工具
 *
 * 从数据库动态读取 AI 配置，支持环境变量 fallback
 * 带内存缓存，避免每次都查数据库
 */

import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { normalizeAIUrl } from '@/lib/ai-url';
import { decryptSafe } from '@/lib/crypto';
import { getCache, setCache, deleteCache } from '@/lib/cache';

export interface AIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  provider?: string;
  proxy?: string;
}

export interface AIConfigWithMeta extends AIConfig {
  id: string;
  name: string;
  useFor?: 'all' | 'text' | 'ocr';
  enabled?: boolean;
  tier?: 'free' | 'paid';
}

export { normalizeAIUrl } from '@/lib/ai-url';

/**
 * 从数据库获取 AI 配置（带缓存）
 *
 * @returns AI 配置对象
 */
export async function getAIConfigFromDB(): Promise<AIConfig> {
  const cacheKey = 'ai_config_active';

  // 1. 尝试从缓存获取
  const cached = getCache<AIConfig>(cacheKey);
  if (cached) {
    return cached;
  }

  const defaultConfig: AIConfig = {
    apiKey: process.env.DASHSCOPE_API_KEY || '',
    baseUrl: process.env.AI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: process.env.AI_MODEL || 'qwen3.6-plus',
  };

  try {
    // 2. 读取多配置和激活配置
    const [configsSetting, activeSetting] = await Promise.all([
      prisma.settings.findUnique({ where: { key: 'ai_configs' } }),
      prisma.settings.findUnique({ where: { key: 'ai_active_config' } }),
    ]);

    let config: AIConfig = defaultConfig;

    if (configsSetting?.value) {
      const configs = JSON.parse(configsSetting.value);
      const activeId = activeSetting?.value;
      const activeConfig = configs.find((c: any) => c.id === activeId) || configs[0];

      if (activeConfig) {
        config = {
          apiKey: decryptSafe(activeConfig.apiKey) || defaultConfig.apiKey,
          baseUrl: activeConfig.baseUrl || defaultConfig.baseUrl,
          model: activeConfig.model || defaultConfig.model,
          provider: activeConfig.provider,
          proxy: activeConfig.proxy || undefined,
        };
      }
    } else {
      // 兼容旧版：ai_config JSON
      const aiConfigSetting = await prisma.settings.findUnique({
        where: { key: 'ai_config' },
      });

      if (aiConfigSetting?.value) {
        const parsed = JSON.parse(aiConfigSetting.value);
        config = {
          apiKey: decryptSafe(parsed.apiKey) || defaultConfig.apiKey,
          baseUrl: parsed.baseUrl || defaultConfig.baseUrl,
          model: parsed.model || defaultConfig.model,
          provider: parsed.provider,
          proxy: parsed.proxy || undefined,
        };
      }
    }

    // 3. 缓存结果（5分钟）
    setCache(cacheKey, config, 5 * 60 * 1000);

    return config;
  } catch (error) {
    console.error('[getAIConfigFromDB] 读取数据库配置失败:', error);
    // 降级到环境变量
    return defaultConfig;
  }
}

/**
 * 清除所有 AI 配置缓存
 * 在更新 AI 配置后调用
 */
export function clearAIConfigCache(): void {
  deleteCache('ai_config_active');
  deleteCache('ai_config_ocr');
  deleteCache('ai_config_text');
  deleteCache('ai_tier_ocr');
  deleteCache('ai_tier_text');
}

/**
 * 获取 AI 模型名称（快捷方法）
 * 
 * @returns 模型名称
 */
export async function getAIModel(): Promise<string> {
  const config = await getAIConfigFromDB();
  return config.model;
}

/**
 * 创建 OpenAI 客户端（使用动态配置）
 */
export async function createOpenAIClient(): Promise<OpenAI> {
  const config = await getAIConfigFromDB();

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: normalizeAIUrl(config.baseUrl, config.provider),
    timeout: 120000,
  });
}

/**
 * 根据用途获取 AI 配置（带缓存）
 *
 * @param purpose - 'ocr'（图片识别）或 'text'（文字分析）
 * @returns 匹配的 AI 配置，优先级：专用配置 > all 配置 > 激活配置
 */
export async function getConfigForPurpose(purpose: 'ocr' | 'text'): Promise<AIConfig> {
  const cacheKey = `ai_config_${purpose}`;

  // 1. 尝试从缓存获取
  const cached = getCache<AIConfig>(cacheKey);
  if (cached) {
    return cached;
  }

  const defaultConfig = await getAIConfigFromDB();

  try {
    const [configsSetting, activeSetting] = await Promise.all([
      prisma.settings.findUnique({ where: { key: 'ai_configs' } }),
      prisma.settings.findUnique({ where: { key: 'ai_active_config' } }),
    ]);
    if (!configsSetting?.value) return defaultConfig;

    const configs: AIConfigWithMeta[] = JSON.parse(configsSetting.value);
    const activeId = activeSetting?.value;

    // 过滤掉 websearch/amap 等非 AI 模型配置
    const aiOnly = (c: AIConfigWithMeta) => c.provider !== 'websearch' && c.provider !== 'amap';
    // 激活的配置视为已启用
    const isEnabled = (c: AIConfigWithMeta) => c.apiKey && (c.enabled !== false || c.id === activeId);

    let config: AIConfig = defaultConfig;

    // 1. 优先选激活的配置（无论 useFor）
    const activeConfig = configs.find(c => aiOnly(c) && c.id === activeId && isEnabled(c));
    if (activeConfig) {
      config = {
        apiKey: decryptSafe(activeConfig.apiKey),
        baseUrl: activeConfig.baseUrl,
        model: activeConfig.model,
        provider: activeConfig.provider,
        proxy: activeConfig.proxy || undefined,
      };
    } else {
      // 2. 找启用的专用配置（useFor === purpose）
      const dedicated = configs.find(c => aiOnly(c) && c.useFor === purpose && isEnabled(c));
      if (dedicated) {
        config = {
          apiKey: decryptSafe(dedicated.apiKey),
          baseUrl: dedicated.baseUrl,
          model: dedicated.model,
          provider: dedicated.provider,
          proxy: dedicated.proxy || undefined,
        };
      } else {
        // 3. 找启用的通用配置（useFor === 'all' 或未设置）
        const general = configs.find(c => aiOnly(c) && (c.useFor === 'all' || !c.useFor) && isEnabled(c));
        if (general) {
          config = {
            apiKey: decryptSafe(general.apiKey),
            baseUrl: general.baseUrl,
            model: general.model,
            provider: general.provider,
            proxy: general.proxy || undefined,
          };
        }
        // 4. fallback 到激活配置（已在 defaultConfig 中）
      }
    }

    // 5. 缓存结果（5分钟）
    setCache(cacheKey, config, 5 * 60 * 1000);

    return config;
  } catch {
    return defaultConfig;
  }
}

/**
 * 检查指定用途的配置是否为免费 tier（带缓存）
 * 用于批量上传时决定并发和限流策略
 */
export async function isFreeTier(purpose: 'ocr' | 'text'): Promise<boolean> {
  const cacheKey = `ai_tier_${purpose}`;

  // 1. 尝试从缓存获取
  const cached = getCache<boolean>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const [configsSetting, activeSetting] = await Promise.all([
      prisma.settings.findUnique({ where: { key: 'ai_configs' } }),
      prisma.settings.findUnique({ where: { key: 'ai_active_config' } }),
    ]);
    if (!configsSetting?.value) return true;

    const configs: AIConfigWithMeta[] = JSON.parse(configsSetting.value);
    const activeId = activeSetting?.value;

    const aiOnly = (c: AIConfigWithMeta) => c.provider !== 'websearch' && c.provider !== 'amap';
    const isEnabled = (c: AIConfigWithMeta) => c.apiKey && (c.enabled !== false || c.id === activeId);

    let isFree = true;

    // 找启用的专用配置
    const dedicated = configs.find(c => aiOnly(c) && c.useFor === purpose && isEnabled(c));
    if (dedicated) {
      isFree = dedicated.tier !== 'paid';
    } else {
      // 找启用的通用配置
      const general = configs.find(c => aiOnly(c) && (c.useFor === 'all' || !c.useFor) && isEnabled(c));
      if (general) {
        isFree = general.tier !== 'paid';
      }
    }

    // 2. 缓存结果（5分钟）
    setCache(cacheKey, isFree, 5 * 60 * 1000);

    return isFree;
  } catch {
    return true;
  }
}
