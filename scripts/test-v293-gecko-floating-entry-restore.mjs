import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v2.93.js', import.meta.url), 'utf8');
const start = source.indexOf('PMM_FLOATING_PANEL_BATCH_V1');
const end = source.indexOf('/* =====', start + 30);
const floatingPatch = source.slice(start, end > start ? end : undefined);

assert.ok(start >= 0, '缺少 Gecko 手机悬浮入口模块');
assert.ok(floatingPatch.includes('pmmFloatingNativeMouseBound'), '没有恢复入口单状态绑定标记');
assert.ok(floatingPatch.includes("edge.addEventListener('mousedown'"), '没有恢复阻止原组件二次切换的 mousedown 捕获');
assert.ok(floatingPatch.includes('event.stopImmediatePropagation();'), 'mousedown 捕获没有隔离原组件的第二套状态');
assert.ok(floatingPatch.includes("edge.addEventListener('click'"), '手机入口自身的 click 展开链路被误删');
assert.ok(floatingPatch.includes("root.classList.add('pmm-floating-mobile-open')"), '入口 click 不会展开悬浮工具栏');
assert.ok(source.includes('PMM_GECKO_FAST_RESPONSE_V277'), 'Gecko 快速响应适配被误删');
assert.ok(source.includes('PMM_EDIT_UNDO_GECKO_V290'), '编辑撤销修复被误删');
assert.ok(source.includes('contain-intrinsic-size:none!important;'), '安卓自定义高度修复被误删');

console.log('v2.93 Gecko 手机入口回归通过：二次闪烁抑制已恢复，其他后续修复均保留。');
