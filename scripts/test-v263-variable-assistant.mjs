import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const workshop = (await readFile(new URL('../dist/workshop-v2.63.js', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');

for (const snippet of [
  'PMM_VARIABLE_MACRO_ASSISTANT_V263',
  "class=\"pmm-variable-btn pmm-variable-btn--s\"",
  "class=\"pmm-variable-btn pmm-variable-btn--g\"",
  '将本条转为变量',
  '将选中文字转为变量',
  '在光标处插入一个空变量',
  '从本次新增变量批量插入',
  '收集本条已有变量',
  '已从拖入的变量条目收集',
  '`{{setvar::${name}::${original}}}`',
  '`{{getvar::${name}}}`',
]) {
  assert.ok(workshop.includes(snippet), `v2.63 缺少变量助手能力：${snippet}`);
}

assert.ok(
  workshop.includes(".replace(/\\p{Extended_Pictographic}"),
  '普通条目生成变量名时没有移除 Emoji',
);
assert.ok(
  workshop.includes("title: String(nameInput?.value ?? '')")
    && workshop.includes('条目标题不会改变；这里只生成正文中的变量名。'),
  '变量转换没有保证条目标题保持不变',
);
assert.ok(
  workshop.includes('const unique = Array.from(new Set(selected))')
    && workshop.includes("hasVariableMacro(ctx.textarea.value, kind, name)"),
  '批量插入缺少去重或已有宏保护',
);
assert.ok(
  workshop.includes('textarea.setSelectionRange(caret, caret)')
    && workshop.includes('const start = Number.isFinite(textarea.selectionStart)'),
  'S/G 没有保存并恢复正文光标位置',
);

const blockStart = workshop.indexOf('/* ===== PMM_VARIABLE_MACRO_ASSISTANT_V263');
const blockEnd = workshop.indexOf('\n;(()=>{\n  /* 预设工坊 V2.58', blockStart);
assert.ok(blockStart >= 0 && blockEnd > blockStart, '无法隔离 v2.63 变量助手运行块');

let runnable = workshop.slice(blockStart, blockEnd);
runnable = runnable.replace(
  "  console.info('[预设工坊] V2.63 已加载：正文 S/G 变量助手、本次新增变量与批量插入已启用。');\n})();",
  "  globalThis.__variableAssistantTest = { extractSetVariables, cleanGeneratedVariableName, hasVariableMacro };\n})();",
);

const fakeDocument = {
  body: {},
  documentElement: {},
  head: { appendChild() {} },
  defaultView: { requestAnimationFrame(callback) { callback(); } },
  addEventListener() {},
  querySelector() { return null; },
  querySelectorAll() { return []; },
  getElementById() { return null; },
  createElement() { return { id: '', style: { setProperty() {} }, textContent: '' }; },
};
const sandbox = {
  console,
  document: fakeDocument,
  requestAnimationFrame(callback) { callback(); },
  MutationObserver: class { observe() {} },
};
sandbox.window = { top: { document: fakeDocument } };
sandbox.globalThis = sandbox;
vm.runInNewContext(runnable, sandbox);

const helper = sandbox.__variableAssistantTest;
assert.equal(helper.cleanGeneratedVariableName('🪐 文风补丁'), '文风补丁', '生成变量名时 Emoji 没有清理干净');
assert.deepEqual(
  Array.from(helper.extractSetVariables('{{setvar::🪐旧变量::正文}}{{setvar::文风补丁::内容}}{{setvar::文风补丁::重复}}')),
  ['🪐旧变量', '文风补丁'],
  '现有变量名没有原样收集或去重',
);
assert.equal(helper.hasVariableMacro('{{getvar::文风补丁}}', 'getvar', '文风补丁'), true);
assert.equal(helper.hasVariableMacro('{{setvar::文风补丁::}}', 'setvar', '文风补丁'), true);

console.log('v2.63 变量助手测试通过：S/G、Emoji 清理、现有变量收集、批量去重与光标插入均已覆盖。');
