import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v2.88.js', import.meta.url), 'utf8');
const start = source.indexOf('/* ===== PMM_COMPARE_DRAG_LINE_V288');
assert.ok(start >= 0, '缺少 Gecko 对比模式拖拽落点线补丁');
const patch = source.slice(start);

assert.ok(patch.includes('.prompt-card.prompt-card--drop-before::after'), 'Gecko 上方落点仍可能被差异卡片阴影覆盖');
assert.ok(patch.includes('.prompt-card.prompt-card--drop-after::after'), 'Gecko 下方落点仍可能被差异卡片阴影覆盖');
assert.ok(patch.includes('top: 0 !important'), 'Gecko 上方落点线没有贴在卡片顶部');
assert.ok(patch.includes('bottom: 0 !important'), 'Gecko 下方落点线没有贴在卡片底部');
assert.ok(patch.includes('background: #2688ff !important'), 'Gecko 落点线没有使用清晰的蓝色');
assert.ok(patch.includes('z-index: 90 !important'), 'Gecko 落点线层级不足');
assert.ok(
  patch.includes('V2.88 Gecko 已加载：对比着色条目拖拽时仍显示置顶的上方／下方蓝色落点线。'),
  '缺少 v2.88 Gecko 修复标记',
);

console.log('v2.88 Gecko 对比拖拽测试通过：差异卡片保留独立的上方／下方蓝色落点线。');
