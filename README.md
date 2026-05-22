# AI 面试全流程助手

面试前反向背调 + 面试后记录复盘，覆盖面试全流程的 AI 驱动助手。

## 功能

- **面试前分析** — 粘贴 JD，AI 自动分析公司背景、JD 风险信号、薪资换算、简历匹配度，给出决策报告
- **快速录入** — 面试后手机一句话速记 + 语音转文字，零门槛记录
- **面试记录** — 完整的面试历史，AI 自动提取标签（面试官风格、核心考点、风险/正面信号）
- **分析面板** — 跨记录模式发现：高频考点、被拒原因分布、高风险公司
- **公司画像** — 按公司聚合面试记录和 AI 标签
- **AI 连接测试** — 设置页内置测试连接功能，实时显示 SDK 调用地址

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 16 (App Router) |
| 语言 | TypeScript |
| 数据库 | SQLite + Prisma ORM |
| AI | OpenAI SDK（支持阿里百炼 / DeepSeek / OpenAI 兼容） |
| 搜索 | Tavily / Exa（公司背景实时搜索） |
| UI | React 19 + Tailwind CSS 4 + shadcn/ui |
| 状态 | TanStack React Query + Zustand |
| 国际化 | next-intl (中文 / English) |
| 图表 | Recharts |
| 测试 | Playwright E2E |

## 快速开始

```bash
# 安装依赖
npm install

# 初始化数据库
npx prisma db push

# 启动开发服务器
npm run dev
```

访问 http://localhost:3003

## 配置 AI

1. 打开 http://localhost:3003/zh/settings
2. 添加 AI 配置（支持阿里百炼、DeepSeek、OpenAI 兼容、自定义）
3. 点击"测试连接"验证配置
4. 可选：配置 WebSearch API Key（Tavily 或 Exa），用于公司背景搜索

## 项目结构

```
src/
├── app/
│   ├── [locale]/                  # 页面（i18n 路由）
│   │   ├── page.tsx               # 首页
│   │   ├── interviews/            # 面试记录 CRUD
│   │   ├── pre-interview/         # 面试前分析
│   │   ├── analytics/             # 分析面板
│   │   ├── companies/             # 公司画像
│   │   ├── profile/               # 个人档案
│   │   └── settings/              # AI 配置 / WebSearch / 数据管理
│   └── api/                       # API 路由
│       ├── interviews/            # 面试记录 API
│       ├── pre-interview/         # 面试前分析 API
│       ├── stats/                 # 统计 API
│       ├── profile/               # 档案 API
│       └── settings/              # AI 配置 + 连接测试 API
├── components/
│   ├── ui/                        # shadcn/ui 组件
│   └── layout/                    # Header / Footer
├── lib/
│   └── ai/                        # AI 调用封装
├── stores/                        # Zustand stores
├── hooks/                         # React hooks
├── types/                         # TypeScript 类型
└── i18n/                          # 国际化配置
prisma/
├── schema.prisma                  # 数据模型
└── dev.db                         # SQLite 数据库
e2e/                               # Playwright E2E 测试
scripts/                           # 工具脚本
```

## 数据模型

- **Interview** — 面试记录（公司、岗位、日期、轮次、薪资、备注、AI标签）
- **PreInterviewAnalysis** — 面试前分析（JD原文、分析结果、决策建议）
- **UserProfile** — 用户档案（简历、当前薪资、目标岗位）
- **Settings** — 配置存储（AI Key、WebSearch Key 加密存储）

## 测试

```bash
# 运行所有 E2E 测试
npx playwright test

# 仅桌面端
npx playwright test --project=chromium-desktop

# 仅移动端
npx playwright test --project=chromium-mobile
```

## License

MIT
