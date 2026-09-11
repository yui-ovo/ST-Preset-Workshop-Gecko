import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = (await readFile(new URL('../dist/workshop-v2.54.js', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const marker = ';(()=>{\n  /* 预设工坊 × 柏宝箱：原子分支切换与完整分组快照 V2.54 */';
const patchStart = source.lastIndexOf(marker);
assert.notEqual(patchStart, -1, '找不到 v2.54 柏宝箱兼容补丁');

const nativeState = {
  version: 1,
  groups: [
    { id: 'writing', name: '写作指导', order: 0, collapsed: true, enabled: true },
    { id: 'rules', name: '规则', order: 1, collapsed: false, enabled: false },
  ],
  prompts: {
    p1: { groupId: 'writing' },
    p2: { groupId: 'writing' },
    p3: { groupId: 'rules' },
  },
};

const prompts = [
  { id: 'p1', name: '创作基准', enabled: true },
  { id: 'p2', name: '角色塑造', enabled: false },
  { id: 'p3', name: '正文规则', enabled: true },
  { id: 'p4', name: '未分组', enabled: true },
];

const calls = [];
const preset = {
  prompts,
  extensions: { baibaiToolkit: { presetPromptGroups: nativeState } },
};
const manager = {
  getSelectedPresetName: () => '另一个预设',
  readPresetExtensionField: options => {
    calls.push(options);
    return options.name === '测试预设' ? nativeState : null;
  },
  getCompletionPresetByName: name => name === '测试预设' ? preset : null,
  writePresetExtensionField: async () => {},
};

const compat = { path: 'baibaiToolkit.presetPromptGroups' };
const sandbox = {
  console,
  structuredClone,
  __PMM_BAIBAI_COMPAT__: compat,
  SillyTavern: {
    getContext: () => ({
      getPresetManager: () => manager,
      chatCompletionSettings: { extensions: {} },
    }),
  },
  getPreset: name => name === '测试预设' ? preset : null,
  getVariables: () => ({}),
};
sandbox.window = sandbox;
sandbox.top = sandbox;

vm.runInNewContext(source.slice(patchStart), sandbox, { filename: 'workshop-v2.54.patch.js' });

const snapshot = sandbox.__PMM_BAIBAI_COMPAT__.snapshotBranchState({
  presetName: '测试预设',
  prompts,
  sectionGroupState: { sections: [] },
});

assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), {
  name: '测试预设',
  path: 'baibaiToolkit.presetPromptGroups',
});
assert.equal(snapshot.groupSource, 'baibai');
assert.equal(snapshot.sections.length, 2);
assert.deepEqual(
  JSON.parse(JSON.stringify(snapshot.sections)),
  [
    { id: 'baibai_writing', displayName: '写作指导', itemIds: ['p1', 'p2'] },
    { id: 'baibai_rules', displayName: '规则', itemIds: ['p3'] },
  ],
);
assert.deepEqual([...snapshot.collapsedSections], ['baibai_writing']);
assert.deepEqual([...snapshot.disabledSections], ['baibai_rules']);
assert.deepEqual(
  JSON.parse(JSON.stringify(snapshot.nativeBaiBaiState)),
  nativeState,
);

console.log('v2.54 新分支柏宝箱快照测试通过：分组、成员、折叠状态和组开关均已保留。');
