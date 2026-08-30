# 🧩预设工坊（Gecko 兼容测试版）

这是专供 Firefox、雨见等 Gecko／GeckoView 手机浏览器测试的兼容版本。正常的 Chrome、Safari、WebView 用户请安装主仓库版本。

请勿与主仓库版同时安装；两个版本共用原有预设工坊数据。

## 依赖

本扩展继续使用酒馆助手提供的脚本运行环境，因此需要先安装并启用：

- [酒馆助手（JS-Slash-Runner）](https://github.com/N0VI028/JS-Slash-Runner)

安装扩展版前，请在酒馆助手中停用旧的 `🧩预设工坊｜双端适配v2.53` 脚本，避免重复运行。

## 安装

1. 打开 SillyTavern 的“扩展”。
2. 选择“安装扩展”。
3. 粘贴本仓库的 Git URL：`https://github.com/kooktaeru-oss/ST-Preset-Workshop-Gecko.git`。
4. 安装完成后刷新 SillyTavern。

## 当前版本

- 扩展版本：`2.70.1`
- 迁移基准：`🧩预设工坊｜双端适配v2.53`
- 第一阶段保持原脚本行为，不在迁移过程中重写业务逻辑。

## 目录

- `manifest.json`：SillyTavern 扩展清单。
- `dist/index.js`：标准 SillyTavern 扩展启动器。
- `dist/workshop-v2.70.js`：当前业务入口；保留 Gecko 首帧兼容，并同步支持缝合预设名称宽度与独立分支名称宽度。
- `dist/workshop-v2.53.js`：由 v2.53 JSON 的 `content` 原样提取的迁移基准。
- `bridge/`：复用酒馆助手运行环境所需的兼容桥。
- `legacy/`：迁移前的原始酒馆助手脚本，仅用于校验和回退。
- `scripts/validate.mjs`：发布前的基础完整性检查。

## 安全说明

第三方扩展能够在 SillyTavern 页面中运行代码。请只从本项目的正式仓库安装，并在更新前查看版本说明。
