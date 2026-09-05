import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workshop = await readFile(new URL('../dist/workshop-v3.08.js', import.meta.url), 'utf8');
const worldbook = await readFile(new URL('../dist/worldbook-stitch-gecko.js', import.meta.url), 'utf8');
const toolbar = await readFile(new URL('../dist/worldbook-toolbar-entry-gecko.js', import.meta.url), 'utf8');
const entry = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');

const silentWorkshopCalls = [
  "toastr.success('预设已保存')",
  "toastr.success('预设已重命名')",
  'toastr.success(`已重命名为 "${q}"`)',
  "toastr.success('已切换回主预设')",
  "toastr.success('分类已删除')",
  "toastr.success('已取消收藏')",
  "toastr.success('已添加到收藏')",
  "toastr.success('已新建条目')",
  "toastr.success('已新建分类')",
  "toastr.success('分组创建成功')",
  "toastr.info('已取消框选分组')",
  "toastr.info(z.value?'已切换为平铺显示（分组数据仍保留）':'已恢复分组显示')",
  "toastr.success('已复制条目')",
  "toastr.success('分组已改名')",
  "toastr.success('分组已解散')",
  "toastr.info('悬浮面板已切换到自由悬浮模式，可拖拽移动','预设管家')",
  'notify(\'success\', `预设已切换：${abbreviatePresetName(name)}`)',
  'notify(\'success\', `已切换至分支：${abbreviatePresetName(name)}`)',
];
for (const call of silentWorkshopCalls) {
  assert.ok(!workshop.includes(call), `Gecko 仍会弹出日常通知：${call}`);
}

for (const call of [
  "notify('success', '已复制条目')",
  'notify(\'success\', `世界书已重命名为“${selectedName}”`)',
  "notify('success', '世界书已保存')",
]) {
  assert.ok(!worldbook.includes(call), `Gecko 世界书仍会弹出日常通知：${call}`);
}

for (const retained of [
  "toastr.warning('预设已保存，但无法连接分组接口')",
  "toastr.warning('预设已保存，但柏宝箱分组写入失败，请查看控制台')",
  'toastr.success(compactMessage)',
  "toastr.error('保存失败')",
  '已撤销：${entry.label',
  'MOBILE_SPLIT_SAFE_ZONE = 36',
  'V3.04 Gecko 已加载',
]) {
  assert.ok(workshop.includes(retained), `必要通知或 Gecko 独有补丁丢失：${retained}`);
}

for (const retained of [
  "notify('warning', '请先选择世界书')",
  "notify('error', `打开失败：${error?.message || error}`)",
]) {
  assert.ok(worldbook.includes(retained), `Gecko 世界书必要通知被误删：${retained}`);
}

const tunerStart = workshop.indexOf('PMM_MOBILE_LAYOUT_TUNER_V1');
const tunerEnd = workshop.indexOf('PMM_FLOATING_PANEL_BATCH_V1', tunerStart);
assert.ok(tunerStart >= 0 && tunerEnd > tunerStart, '无法隔离 Gecko 布局调节模块');
const tuner = workshop.slice(tunerStart, tunerEnd);
const footerIndex = tuner.indexOf('<footer class="pmm-layout-card__footer">');
const resetIndex = tuner.indexOf('data-pmm-layout-reset', footerIndex);
const dragIndex = tuner.indexOf('data-pmm-layout-dnd-compat', footerIndex);
const noticeIndex = tuner.indexOf('data-pmm-layout-top-notifications', footerIndex);
const doneIndex = tuner.indexOf('data-pmm-layout-done', footerIndex);
assert.ok(
  resetIndex >= 0 && resetIndex < dragIndex && dragIndex < noticeIndex && noticeIndex < doneIndex,
  'Gecko 底部按钮没有按“恢复默认、拖拽兼容、顶部通知、完成”排列',
);
for (const snippet of [
  '顶部通知：<span data-pmm-notice-state>开</span>',
  'setTopNotificationsEnabled(!pmmTopNotificationsEnabled())',
  'setTopNotificationsEnabled(true)',
  "button.querySelector('[data-pmm-notice-state]').textContent = enabled ? '开' : '关'",
  'grid-template-columns:1.15fr 1fr 1fr auto!important',
  '.pmm-layout-notice-btn.pmm-layout-notice-btn--active',
]) {
  assert.ok(tuner.includes(snippet), `Gecko 顶部通知开关缺少实现：${snippet}`);
}

const importIndex = workshop.indexOf('import{createPinia');
assert.ok(importIndex > 0, '无法定位 Gecko 通知代理');
const prelude = workshop.slice(0, importIndex);
const values = new Map();
const shown = [];
const logged = [];
const storage = {
  getItem: key => values.has(key) ? values.get(key) : null,
  setItem: (key, value) => values.set(key, String(value)),
};
const hostToastr = {
  success: (...args) => shown.push(['success', ...args]),
  info: (...args) => shown.push(['info', ...args]),
  warning: (...args) => shown.push(['warning', ...args]),
  error: (...args) => shown.push(['error', ...args]),
  options: {},
};
const fakeConsole = {
  debug: (...args) => logged.push(['debug', ...args]),
  info: (...args) => logged.push(['info', ...args]),
  warn: (...args) => logged.push(['warn', ...args]),
  error: (...args) => logged.push(['error', ...args]),
};
const policy = Function('globalThis', 'console', `${prelude}\nreturn { toastr, enabled:pmmTopNotificationsEnabled, set:pmmSetTopNotificationsEnabled };`)(
  { top:{ localStorage:storage, toastr:hostToastr }, localStorage:storage, toastr:hostToastr },
  fakeConsole,
);
assert.equal(policy.enabled(), true, 'Gecko 顶部通知默认没有开启');
policy.toastr.success('默认显示');
assert.equal(shown.length, 1, 'Gecko 默认开启时通知没有显示');
assert.equal(policy.set(false), false, 'Gecko 关闭状态没有持久化');
policy.toastr.error('应被静默');
assert.equal(shown.length, 1, 'Gecko 关闭后仍调用顶部通知');
assert.equal(logged.at(-1)?.[0], 'error', 'Gecko 静默错误没有写入控制台');
assert.equal(policy.set(true), true, 'Gecko 重新开启状态没有持久化');
policy.toastr.info('重新显示');
assert.equal(shown.length, 2, 'Gecko 重新开启后通知没有恢复');

for (const source of [entry, worldbook, toolbar]) {
  assert.ok(source.includes('pmm_top_notifications_enabled_v1'), 'Gecko 已加载模块没有共用顶部通知设置');
  assert.ok(source.includes("getItem(TOP_NOTIFICATION_STORAGE_KEY) !== '0'"), 'Gecko 已加载模块没有读取顶部通知设置');
}
for (const forcedSetting of ['toastr.options.timeOut=300', 'toastr.options.extendedTimeOut=100']) {
  assert.ok(!workshop.includes(forcedSetting), `Gecko 仍在改写酒馆通知时长：${forcedSetting}`);
}
assert.ok(workshop.includes('const toastr = new Proxy'), 'Gecko 工坊通知没有限制在自身作用域');
assert.ok(!workshop.includes('globalThis.toastr ='), 'Gecko 顶部通知开关不应替换全局 toastr');
assert.ok(workshop.includes('V3.06 Gecko 已加载：精简重复通知'), '缺少 Gecko v3.06 运行标记');
assert.ok(entry.includes("const EXTENSION_VERSION = '3.1.12'"), 'Gecko 启动器版本未更新');
assert.ok(entry.includes("new URL('./workshop-v3.08.js'"), 'Gecko 启动器没有加载 v3.06');

console.log('Gecko v3.1.12 通知移植测试通过：精简、开关、原生时长与独有补丁均已保留。');
