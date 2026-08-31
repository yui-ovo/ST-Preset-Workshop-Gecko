import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v2.80.js', import.meta.url), 'utf8');
const helperStart = source.indexOf('function _pmmTogglePromptEnabledImmutable');
const helperEnd = source.indexOf('function _pmmRecordCrossDrop', helperStart);

assert.ok(helperStart >= 0 && helperEnd > helperStart, '无法定位 Gecko 缝合开关同步函数');

const context = {};
vm.runInNewContext(
  `${source.slice(helperStart, helperEnd)};globalThis.toggleMerge=_pmmToggleMergePromptEnabled;`,
  context,
);

const original = [
  { id: 'grouped', name: '分组内条目', enabled: true },
  { id: 'ungrouped', name: '分组外条目', enabled: true },
];
const calls = { set: [], reconcile: [] };
const sectionStore = {
  setPromptsForPreset(items, presetName) {
    calls.set.push({ items, presetName });
  },
  async reconcileSectionDisabledForPrompt(id, presetName) {
    calls.reconcile.push({ id, presetName });
  },
};

const toggled = await context.toggleMerge(original, 'grouped', sectionStore, '下方预设');
assert.equal(toggled.changed, true, '刚打开 Gecko 缝合面板后普通条目必须能切换');
assert.equal(toggled.items[0].enabled, false, '目标条目应立即关闭');
assert.equal(original[0].enabled, true, '不能原地修改旧条目');
assert.equal(calls.set.length, 1, '必须同步 Gecko 分组渲染仓库');
assert.equal(calls.set[0].presetName, '下方预设', '必须同步到下方预设对应的分组状态');
assert.equal(calls.set[0].items[0].enabled, false, '分组内条目的渲染副本必须同步关闭');
assert.notEqual(calls.set[0].items[0], toggled.items[0], '同步时应复制条目，避免共享可变对象');
assert.deepEqual(calls.reconcile, [{ id: 'grouped', presetName: '下方预设' }], '必须重新校准分组开关状态');

await context.toggleMerge(toggled.items, 'ungrouped', sectionStore, '下方预设');
assert.equal(calls.set.at(-1).items[1].enabled, false, '分组外条目也必须同步到同一渲染仓库');

const beforeMissing = calls.set.length;
const missing = await context.toggleMerge(original, 'missing', sectionStore, '下方预设');
assert.equal(missing.changed, false, '不存在的条目不应误报更新');
assert.equal(calls.set.length, beforeMissing, '不存在的条目不能触发分组同步');

assert.ok(
  source.includes('toggleEnabled:async function(e){const n=await _pmmToggleMergePromptEnabled(a.value,e,ze(),A.value);return n.changed&&(a.value=n.items),n.changed}'),
  'Gecko 缝合 store 必须同时更新 rightPrompts 与分组渲染状态',
);
assert.ok(source.includes('V2.80 Gecko 开关同步已加载'), '缺少 v2.80 Gecko 加载标记');
assert.ok(source.includes('V2.79 Gecko 开关修复已加载'), '上一版不可变更新修复不能丢失');

console.log('v2.80 Gecko 缝合开关测试通过：刚打开下方面板时，分组内外普通条目均同步渲染状态。');
