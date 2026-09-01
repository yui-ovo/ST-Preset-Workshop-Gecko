import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v2.92.js', import.meta.url), 'utf8');
const start = source.indexOf('PMM_FLOATING_PANEL_BATCH_V1');
const end = source.indexOf('/* =====', start + 30);
const floatingPatch = source.slice(start, end > start ? end : undefined);

assert.ok(start >= 0, '缺少 Gecko 手机悬浮入口模块');
assert.ok(!floatingPatch.includes('pmmFloatingNativeMouseBound'), '仍存在会吞掉 click 的 mousedown 状态标记');
assert.ok(!floatingPatch.includes("edge.addEventListener('mousedown'"), '仍存在会取消 Gecko 后续 click 的 mousedown 拦截');
assert.ok(floatingPatch.includes("edge.addEventListener('click'"), '原有手机入口 click 链路没有保留');
assert.ok(floatingPatch.includes("root.classList.add('pmm-floating-mobile-open')"), '轻点入口不会再展开悬浮工具栏');
assert.ok(source.includes('PMM_GECKO_FAST_RESPONSE_V277'), 'Gecko 快速入口适配被误删');
assert.ok(source.includes('PMM_EDIT_UNDO_GECKO_V290'), '编辑撤销修复被误删');
assert.ok(source.includes('contain-intrinsic-size:none!important;'), '安卓自定义高度修复被误删');

console.log('v2.92 Gecko 手机入口回归通过：撤销 mousedown 拦截并恢复原有 click 打开链路。');
