# AI Interview Notebook — Claude Code 速查

## 技术栈
- Next.js 16 + TypeScript strict
- Prisma ORM (SQLite)
- Tailwind CSS + shadcn/ui
- next-intl（中英双语）
- 状态管理：Zustand + React Query
- 部署端口：3003

## 目录结构
```
src/app/[locale]/          — 页面组件（面试记录/面试前分析/个人资料/设置）
src/components/ui/         — shadcn 组件
src/components/interview/  — 面试相关组件
src/components/pre-interview/ — 面试前分析组件
src/components/analytics/  — 数据分析组件
src/lib/ai/                — AI 配置与调用（支持多配置切换）
src/lib/parsers/           — JD 解析器（BOSS直聘/猎聘）
src/lib/                   — 工具函数（加密/导出/日志/地图等）
prisma/                    — 数据库 Schema
messages/                  — 翻译文件（en.json/zh.json）
```

## 核心功能定位
- 面试记录管理（含 AI 洞察、模式分析）
- 面试前 JD 分析（支持 BOSS直聘/猎聘格式）
- 通勤距离计算（高德地图 API）
- 数据导出（Excel/JSON）

## 品牌调性
- 定位：专业面试助手
- 语气：专业但不冰冷，简洁但有温度
- 禁止：过度营销、虚假承诺、专业术语堆砌
- 允许：数据驱动的洞察、清晰的行动建议

## 国际化
- 翻译文件：messages/en.json, messages/zh.json
- 所有用户可见文本通过 useTranslations 接入
- 翻译键命名：CamelCase，按功能模块分组

```json
{
  "Interview": {
    "list": { "title": "面试记录", "addNew": "添加面试" },
    "detail": { "company": "公司名称", "result": "面试结果" }
  },
  "AI": {
    "insight": { "title": "AI 洞察", "tags": "AI 标签" }
  }
}
```

## 组件选择指南
```
你要展示什么？
│
├─ 面试记录列表 → ListItemCard（已有）
├─ 面试结果标记 → VerdictBadge（已有，语义化颜色）
├─ AI 洞察展示 → InsightCard（已有，支持 tags/summary/recommendation/warning）
├─ 评分展示 → ScoreIndicator（已有，星级评分）
├─ 状态指示 → StatusDot（已有，带脉冲动画）
├─ 空状态展示 → EmptyState（已有，统一空状态）
├─ 数据统计 → Recharts（已集成）
├─ 状态提示 → Alert（已集成）
└─ 以上都不匹配 → 评估是否需要新建组件
```

## 实用样式类
```css
.hover-lift        — 卡片悬浮上移效果
.text-gradient     — 文字渐变效果
.glass             — 玻璃态效果
.skeleton          — 骨架屏加载动画
.animate-fade-in   — 淡入动画
.animate-slide-in-up — 滑入动画
.animate-scale-in  — 缩放动画
```

## 代码规范
- 禁止 `any`，使用严格类型
- React 19 禁止 `forwardRef`，ref 作为 prop 传入
- className 用 `cn()` 拼接
- 数据库操作统一走 `src/lib/prisma.ts`
- AI 配置统一走 `src/lib/ai/config.ts`
- 颜色使用 CSS 变量（`text-success`、`bg-warning`），不用硬编码色值

## AI 配置管理
- 多配置支持：ocr/text 用途分离
- 智能 fallback：主配置失败时自动降级
- 健康检查：`checkAIConfigHealth()`

## 工作流
- 新增解析器：先写 `src/lib/parsers/xxx.ts`，再同步 API 和 UI
- 数据库变更：先改 `prisma/schema.prisma`，再 `pnpm db:generate`
- commit 前：`pnpm lint` + `pnpm build` 验证

## Commit 规范
格式：`[type] description`
- feat: 新功能
- fix: 修复
- refactor: 重构
- docs: 文档
- test: 测试
- chore: 构建/工具

## 常用命令
```bash
pnpm dev              # 启动开发服务器（端口 3003）
pnpm build            # 构建生产版本
pnpm lint             # 代码检查
pnpm db:studio        # 数据库可视化
pnpm db:push          # 推送 Schema 变更
pnpm import:xlsx      # 导入 Excel 数据
```

## 常见陷阱
1. Prisma Client 需要先运行 `pnpm db:generate`
2. AI API Key 存储在数据库，需通过 `getAIConfigFromDB()` 获取
3. 高德 API 需要配置 Web 服务 Key
4. 翻译文件修改后需重启 dev server

## 架构决策
- 数据库：SQLite（轻量级，适合个人工具）
- AI 配置：数据库存储 + 环境变量 fallback
- JD 解析：正则 + AI 混合模式
- 状态管理：Zustand（轻量）+ React Query（服务端状态）
