# Gecko 版本同步记录

## 3.2.1

原版提交从 2.98.61 的后台扫描优化同步至 2.98.63（fd6bf2e），并补入 2.98.60 的兼容拖拽修复。火狐专用运行容器、帧调度和世界书拖入沿用 Gecko 实现。[完整模式性能回归](performance-regressions.md)覆盖聊天输出和 400 条预设打开时的页面更新。

## 3.2.0

同步基准：主仓库 2.98.58，提交 8535cde。此前 Gecko 3.1.24 的功能基准约为主版 2.98.12；本次同步整个当前实现，并非仅移植快照外观补丁。

## 文件对应

- 主业务入口：主版 workshop-v3.02.js → Gecko workshop-v3.08.js；文件名延续火狐版原入口，内容已更新。
- 世界书：worldbook-stitch-test3.js → worldbook-stitch-gecko.js；保留火狐长按拖拽、主题按钮位置及完整草稿安全检查。
- index.js：同步启动、运行模式和清理流程，保留火狐版扩展身份、屏幕外运行容器和 gecko-frame-scheduler.js。
- snapshot-only.js：由火狐当前主业务入口重新生成。
- 其余 18 个共用模块逐文件校验，与主版一致：

- compare-actions-core.js
- compare-inline.js
- preset-content-editor.js
- preset-snapshot-storage.js
- regex-manager-core.js
- regex-manager.js
- runtime-resources.js
- shared-favorites.js
- snapshot-backup-core.js
- snapshot-backup.js
- snapshot-name-dialog.js
- snapshot-preset-links.js
- touch-action-guard.js
- workshop-editing-core.js
- workshop-editing.js
- workshop-mode.js
- worldbook-snapshot-core.js
- worldbook-snapshots.js

## 兼容处理

保留 Firefox / GeckoView 的顶层帧调度、入口首帧检查、展开绘制、名称横滑、双卡片底边安全带、滑杆纵滑保护，以及世界书长按触摸桥。新增监听和计时器纳入运行实例清理；卡片底边手势不拦截覆盖在上方的弹窗。世界书无法取得完整实时预设草稿或准确落点时取消写入，避免用局部条目覆盖整份预设。

## 验证

- npm run check：当前共用功能的静态与逻辑回归，加上 Gecko 启动、手势入口、Vue 实时草稿桥和不完整草稿保护。
- Firefox 浏览器夹具：生产入口启动、完整／快照三轮切换与清理、对比替换插入筛选、收藏和正则、深浅主题、防误触、双卡片调节、世界书长按拖入与滚动取消。
- 浏览器夹具使用模拟酒馆数据；不等同于在实体 Android 手机或所有第三方 GeckoView 浏览器中完成验证。

后续同步须重新生成 snapshot-only.js，并运行 Firefox 回归；不要用普通版 hidden iframe 方式覆盖火狐启动器。旧版本 test-v* 脚本中未列入当前检查命令的保留作历史记录，当前行为以 package.json 的检查和浏览器测试为准。
