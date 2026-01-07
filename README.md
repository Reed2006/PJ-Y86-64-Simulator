# Attachments Frontend

基于 Vite + React 的可视化前端，主要负责展示 Y86-64 模拟器和 AI 助手等功能。项目默认部署到 GitHub Pages 的 `/PJ-Y86-64-Simulator/` 路径。

## 开发流程

```bash
pnpm install
pnpm dev
```

开发环境会读取根目录 `.env` 中的 Supabase 配置。构建命令为 `pnpm run build`，产物输出至 `dist/`。

## 环境变量

前端在初始化 Supabase 客户端时需要以下变量：

| 变量 | 说明 |
| ---- | ---- |
| `VITE_SUPABASE_URL` | Supabase 项目 URL，形如 `https://xxxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase Project API 页面中的 `anon public` key |

本地开发可在 `.env` 中声明；CI/CD 需在 GitHub 仓库 **Settings → Secrets and variables → Actions** 里创建同名 Secrets，供 `pnpm run build` 使用。

## 部署

项目使用 `.github/workflows/deploy.yml` 构建并推送至 `gh-pages` 分支。只要向 `visualization-frontend` 分支推送代码、且上述 Secrets 配置正确，Actions 就会自动：

1. 安装依赖并构建；
2. 通过 `peaceiris/actions-gh-pages` 部署 `dist` 到 GitHub Pages。
