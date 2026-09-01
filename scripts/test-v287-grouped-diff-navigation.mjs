import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v2.88.js', import.meta.url), 'utf8');

assert.ok(source.includes('async function _pmmRevealPromptForCompare(e)'), 'PresetPanel 缺少按名称揭示对比条目的方法');
assert.ok(
  source.includes('s.isSectionCollapsed(e,A.currentPresetName)&&await s.toggleSectionCollapse(e,A.currentPresetName)'),
  '对比条目所在分组折叠时没有自动展开',
);
assert.ok(source.includes('reveal:_pmmRevealPromptForCompare'), 'PresetPanel DOM 没有暴露对比揭示桥');
assert.ok(source.includes('compareRevealPrompt:_pmmRevealPromptForCompare'), 'PresetPanel Vue 接口没有暴露对比揭示方法');

const helperStart = source.indexOf('function compareRevealBridge(panel)');
const helperEnd = source.indexOf('function ensureExpanded(item)', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, '无法定位分组对比 DOM 桥');
const helperSource = source.slice(helperStart, helperEnd);

let renderedItem = null;
let revealedName = '';
const helpers = vm.runInNewContext(
  `(() => { ${helperSource}; return { compareRevealBridge, revealPromptForDiff }; })()`,
  {
    console,
    promptByName: () => renderedItem,
    waitForElement: async getter => getter(),
    Set,
  },
);

const panel = {
  __pmmBatchVariableBridge: {
    async reveal(name) {
      revealedName = name;
      renderedItem = { name };
      return { revealed: true, id: 'inside-group' };
    },
  },
};

const result = await helpers.revealPromptForDiff(panel, '分组内条目');
assert.equal(revealedName, '分组内条目');
assert.equal(result, renderedItem, '展开分组后应取得新渲染的 prompt-item');

const openStart = source.indexOf('async function openContentDiff(doc, name)');
const openEnd = source.indexOf('function fixDiffDetail(doc)', openStart);
assert.ok(openStart >= 0 && openEnd > openStart, '正文对比打开函数没有改为异步');
const openSource = source.slice(openStart, openEnd);
assert.ok(openSource.includes('await Promise.all(['), '没有同时等待上下两侧目标分组展开');
assert.ok(openSource.includes('revealPromptForDiff(panels[0], leftName)'), '上侧预设没有揭示分组条目');
assert.ok(openSource.includes('revealPromptForDiff(panels[1], rightName)'), '下侧预设没有揭示分组条目');
assert.ok(
  source.includes('V2.87 Gecko 已加载：手机对比分组条目时会自动展开目标分组并读取正文。'),
  '缺少 v2.87 Gecko 修复标记',
);

console.log('v2.87 Gecko 分组对比测试通过：点击差异会自动展开两侧目标分组，再读取正文。');
