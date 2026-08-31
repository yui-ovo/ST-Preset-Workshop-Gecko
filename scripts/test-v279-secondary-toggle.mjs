import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v2.80.js', import.meta.url), 'utf8');
const helperStart = source.indexOf('function _pmmTogglePromptEnabledImmutable');
const helperEnd = source.indexOf('function _pmmRecordCrossDrop', helperStart);

assert.ok(helperStart >= 0 && helperEnd > helperStart, '无法定位下方面板开关更新函数');

const context = {};
vm.runInNewContext(
  `${source.slice(helperStart, helperEnd)};globalThis.togglePrompt=_pmmTogglePromptEnabledImmutable;`,
  context,
);

const original = [
  { id: 'detail-style', name: '细描特化', enabled: true },
  { id: 'main-prompt', name: 'Main Prompt', enabled: true },
];
const toggled = context.togglePrompt(original, 'detail-style');

assert.equal(toggled.changed, true, '找到条目后必须报告已更新');
assert.notEqual(toggled.items, original, '开关后必须替换下方 prompts 数组引用');
assert.notEqual(toggled.items[0], original[0], '被点击的条目必须替换为新对象');
assert.equal(toggled.items[1], original[1], '未点击条目应保留原对象，避免无谓重绘');
assert.equal(toggled.items[0].enabled, false, '细描特化应立即变为关闭');
assert.equal(original[0].enabled, true, '不能原地修改旧条目后等待下一次拖入才刷新');

const restored = context.togglePrompt(toggled.items, 'detail-style');
assert.equal(restored.items[0].enabled, true, '再次点击应立即恢复开启');

const missing = context.togglePrompt(original, 'missing');
assert.equal(missing.changed, false, '不存在的条目不应误报更新');
assert.equal(missing.items, original, '不存在的条目不应替换数组');

assert.ok(
  source.includes('toggleEnabled:async function(e){const n=await _pmmToggleMergePromptEnabled(a.value,e,ze(),A.value);return n.changed&&(a.value=n.items),n.changed}'),
  'Gecko 合并面板 store 必须通过同步函数把新数组写回 rightPrompts',
);
assert.ok(source.includes('V2.79 Gecko 开关修复已加载'), '缺少 v2.79 Gecko 加载标记');
assert.ok(source.includes('V2.78 Gecko 主题修复已加载'), 'Gecko 透明主题修复不能丢失');
assert.ok(source.includes('V2.77 Gecko 快速响应已加载'), 'Gecko 快速入口与即时展开补丁不能丢失');

console.log('v2.79 Gecko 下方面板开关测试通过：拖入后点击会立即替换数组与目标条目。');
