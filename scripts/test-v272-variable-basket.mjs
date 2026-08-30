import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../dist/workshop-v2.72.js', import.meta.url), 'utf8');

assert.ok(!source.includes('收集本条已有变量'), 'S 菜单仍会整条收集旧变量');
assert.ok(!source.includes("action === 'collect'"), 'S 菜单仍保留旧变量收集分支');
assert.ok(source.includes('已从拖入的变量条目收集'), '拖入变量条目后不再自动记录本次带入的变量');
assert.ok(source.includes('function liveSetVariablesInPanel(panel)'), '缺少当前面板变量扫描');
assert.ok(source.includes('function reconcileBasket(panel)'), '缺少新增变量清单校准');
assert.ok(source.includes('queueBasketReconcile();'), '撤销或删除后的界面变化不会触发清单校准');

const blockStart = source.indexOf('/* ===== PMM_VARIABLE_MACRO_ASSISTANT_V263');
const blockEnd = source.indexOf('\n;(()=>{\n  /* 预设工坊 V2.58', blockStart);
assert.ok(blockStart >= 0 && blockEnd > blockStart, '无法隔离变量助手运行块');

let runnable = source.slice(blockStart, blockEnd);
runnable = runnable.replace(
  "  console.info('[预设工坊] V2.72 已加载：S/G 只保留当前仍存在的本次新增变量，不再整条收集旧变量。');\n})();",
  '  globalThis.__variableBasketTest = { addVariables, basketFor, reconcileBasket };\n})();',
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
  setTimeout,
  clearTimeout,
};
sandbox.window = { top: { document: fakeDocument } };
sandbox.globalThis = sandbox;
vm.runInNewContext(runnable, sandbox);

const helper = sandbox.__variableBasketTest;
let contents = [
  '{{setvar::文风框架::正文}}',
  '{{setvar::文风补丁7::正文}}',
];
const cards = () => contents.map(value => ({
  __vueParentComponent: null,
  querySelector(selector) {
    return selector === '.prompt-editor__textarea' ? { value } : null;
  },
}));
const panel = {
  querySelector(selector) {
    if (selector === '.title-select') return { value: '目标预设' };
    if (selector === '.empty-state' && contents.length === 0) return {};
    return null;
  },
  querySelectorAll(selector) {
    if (selector === '.prompt-card[data-prompt-id], .prompt-item[data-prompt-id]') return cards();
    return [];
  },
};

helper.addVariables(panel, ['文风框架', '水白誓'], { quiet: true });
assert.deepEqual(Array.from(helper.basketFor(panel)), ['文风框架', '水白誓']);

assert.equal(helper.reconcileBasket(panel), 1, '撤销后没有移除已消失的变量名');
assert.deepEqual(
  Array.from(helper.basketFor(panel)),
  ['文风框架'],
  '校准没有按正文中的真实 setvar 名称保留变量',
);
assert.ok(
  !helper.basketFor(panel).includes('文风补丁7'),
  '面板原有变量被错误自动加入本次新增变量',
);

contents = [];
assert.equal(helper.reconcileBasket(panel), 1, '条目全部撤销后没有清空对应新增变量');
assert.deepEqual(Array.from(helper.basketFor(panel)), []);

assert.ok(source.includes('V2.72 已加载'), '缺少 v2.72 运行标记');
console.log('v2.72 变量清单测试通过：只记录本次新增，撤销后按真实 setvar 名称自动清理。');
