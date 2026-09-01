import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v2.89.js', import.meta.url), 'utf8');

assert.ok(!source.includes('function _pmmTogglePromptEnabledImmutable'), 'Gecko 当前运行版不应包含 v2.79 尝试性辅助函数');
assert.ok(!source.includes('function _pmmToggleMergePromptEnabled'), 'Gecko 当前运行版不应包含 v2.80 跨作用域辅助函数');

const mergeStart = source.indexOf("mn=n('merge'");
const mergeEnd = source.indexOf('var un=', mergeStart);
assert.ok(mergeStart >= 0 && mergeEnd > mergeStart, '无法定位 Gecko merge store');
const mergeStore = source.slice(mergeStart, mergeEnd);

assert.ok(
  mergeStore.includes("toggleEnabled:function(e){const n=a.value.find(n=>n.id===e);n&&(n.enabled=!n.enabled)}"),
  'Gecko 下方开关应恢复旧版同作用域直接更新链路',
);
assert.ok(!mergeStore.includes('_pmmToggleMergePromptEnabled'), 'Gecko merge store 不能调用组件内部函数');

const deStart = source.indexOf('function De(e)');
const deEnd = source.indexOf('function Ue(e)', deStart);
assert.ok(deStart >= 0 && deEnd > deStart, '无法定位 Gecko 分组视图同步逻辑');
const sectionSync = source.slice(deStart, deEnd);

assert.ok(
  sectionSync.includes("String(e.name||'')+'\\u0000'+(e.enabled===!1?'0':'1')"),
  'Gecko 分组视图签名必须监听名称与开关状态',
);
assert.ok(!sectionSync.includes('_pmmLiveNameTimer'), 'Gecko 分组刷新不能依赖后台计时器');
assert.ok(!sectionSync.includes('setTimeout('), 'Gecko 开关和拖入刷新应在 Vue post-flush 直接完成');
assert.ok(sectionSync.includes('o.setPromptsForPreset(n.value.map(e=>({...e})),e),r.value++'), 'Gecko 列表变化后必须立即同步分组副本');

const crossDropStart = source.indexOf('function qe(e)');
const crossDropEnd = source.indexOf('function Fe(e)', crossDropStart);
const crossDrop = source.slice(crossDropStart, crossDropEnd);
assert.ok(crossDrop.includes('m.splice(d,0,...p),n.value=m'), 'Gecko 跨预设拖入必须替换 rightPrompts 数组');
assert.ok(crossDrop.includes('o.setPromptsForPreset?.(n.value,A.value)'), 'Gecko 拖入后必须同步分组仓库');

assert.ok(source.includes('V2.82 Gecko 干净重建已加载'), '缺少 v2.82 Gecko 加载标记');

console.log('v2.82 Gecko 干净回归通过：撤销 v2.79–v2.81 workaround，旧版开关与即时拖入刷新均保留。');
