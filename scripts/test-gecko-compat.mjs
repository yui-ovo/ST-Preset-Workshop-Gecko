import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const read=name=>readFile(new URL('../'+name,import.meta.url),'utf8');
const entry=await read('dist/index.js'),workshop=await read('dist/workshop-v3.08.js'),world=await read('dist/worldbook-stitch-gecko.js'),bridge=await read('dist/worldbook-preset-drop-bridge-gecko.js');
assert.ok(entry.includes('iframe.hidden = false') && entry.includes("left: '-10000px'"));
assert.ok(entry.indexOf('<script src="${schedulerUrl}"></script>')<entry.indexOf('vue.runtime.global.prod.min.js'));
for(const marker of ['PMM_GECKO_FAST_RESPONSE_V277','PMM_GECKO_SPLIT_EDGE_V299','const MOBILE_SPLIT_SAFE_ZONE = 36','function captureMobileSplitSafeZone(event)','pmm-split-handle--pressed','function panelContentIsVisible(panel)','complete:true'])assert.ok(workshop.includes(marker),marker);
assert.ok(world.includes('if (!hasVerifiedLivePresetDraft(target))'));
assert.ok(world.includes('未能识别手指所在的目标条目，已取消拖入'));
for(const name of ['touchstart','touchmove','touchend','touchcancel']) {assert.ok(world.includes("addEventListener('"+name+"', onGeckoWorldTouch"));assert.ok(world.includes("removeEventListener('"+name+"', onGeckoWorldTouch"));}
assert.ok(world.includes('function restoreGeckoThemeToggle('));
let receivedDrop = null;
let mountedHook = null;
let staleDropCalls = 0;
let liveDropCalls = 0;
const staleDrop = async (...args) => {
  staleDropCalls += 1;
  receivedDrop = args;
};
const liveDrop = async (...args) => {
  liveDropCalls += 1;
  receivedDrop = args;
};
const initialProps = {
  prompts: [{ id: 'old-target', name: '旧世界书条目' }],
  side: 'left',
  onCrossPanelDrop: staleDrop,
};
const promptPanel = {
  vnode: { props: initialProps },
  props: initialProps,
  attrs: {},
  subTree: null,
};
const app = {
  _instance: {
    vnode: { props: {} },
    props: {},
    attrs: {},
    subTree: { component: promptPanel, props: initialProps, children: [] },
  },
  mount() { return null; },
  mixin(options) { mountedHook = options?.mounted || null; },
};
const titleSelect = { value: '连续草稿预设', selectedOptions: [] };
const bridgeMainPanel = {
  querySelector(selector) {
    return selector === '.title-select' ? titleSelect : null;
  },
};
const bridgeDocument = {
  querySelector(selector) {
    return selector.startsWith('#preset-manager-main-panel') ? bridgeMainPanel : null;
  },
};
const bridgeWindow = { document: bridgeDocument, console, Vue: { createApp: () => app } };
bridgeWindow.parent = bridgeWindow;
bridgeWindow.top = bridgeWindow;
const bridgeContext = { window: bridgeWindow, document: bridgeDocument, console, Set, Object, Array, String, Boolean, Promise };
vm.runInNewContext(bridge, bridgeContext);
bridgeWindow.Vue.createApp().mount();
assert.equal(typeof mountedHook, 'function', 'Gecko Vue 应用桥必须注册组件挂载捕获器');
mountedHook.call({ $: promptPanel });

// Reproduce the reported sequence: the first worldbook has already inserted
// entries without saving, then a lower-worldbook switch replaces the current
// PromptPanel props. The bridge must use the live handler and live IDs.
const liveProps = {
  prompts: [
    { id: 'user-first', name: 'user设定补充' },
    { id: 'user-target', name: 'user设定补充' },
    { id: 'glade-target', name: 'glade' },
  ],
  side: 'left',
  onCrossPanelDrop: liveDrop,
};
promptPanel.vnode.props = liveProps;
promptPanel.props = liveProps;
const liveSnapshot = bridgeWindow.__PMM_WORLDBOOK_PRESET_DROP_BRIDGE__.snapshot();
assert.equal(liveSnapshot?.name, '连续草稿预设', 'Gecko 桥必须读取当前预设名称');
assert.equal(liveSnapshot?.prompts?.some(prompt => prompt.id === 'user-target'), true, 'Gecko 桥必须读取未保存的新条目');
assert.equal(liveSnapshot?.complete, true, 'Gecko 桥必须标记已读取到完整实时草稿');
const bridgeResult = await bridgeWindow.__PMM_WORLDBOOK_PRESET_DROP_BRIDGE__.drop({
  entries: [{ id: 'world-entry' }],
  targetId: 'user-target',
  targetName: 'user设定补充',
  position: 'before',
  targetSectionId: 'baibai_group',
});
assert.equal(bridgeResult.ok, true, 'Gecko Vue 应用桥必须能找到原生拖入处理器');
assert.equal(staleDropCalls, 0, 'Gecko 桥不得调用切换前捕获的旧拖入处理器');
assert.equal(liveDropCalls, 1, 'Gecko 桥必须只调用一次当前拖入处理器');
assert.equal(receivedDrop?.[1], 'user-target', 'Gecko Vue 应用桥必须传递未保存目标条目的稳定 ID');
assert.equal(receivedDrop?.[3], 'baibai_group', 'Gecko Vue 应用桥必须传递柏宝箱目标分组');
const ambiguousResult = await bridgeWindow.__PMM_WORLDBOOK_PRESET_DROP_BRIDGE__.drop({
  entries: [{ id: 'world-entry-2' }],
  targetName: 'user设定补充',
  targetSectionId: 'baibai_group',
});
assert.equal(ambiguousResult?.ok, false, '同名条目缺少稳定 ID 时必须安全取消');
assert.equal(ambiguousResult?.reason, 'target-not-resolved', '同名条目缺少稳定 ID 时必须保留安全取消原因');

// Empty is a valid preset, but an unreadable Vue component must never be
// reported as an empty, saveable draft.
const emptyProps = { prompts: [], side: 'left', onCrossPanelDrop: liveDrop };
promptPanel.vnode.props = emptyProps;
promptPanel.props = emptyProps;
const emptySnapshot = bridgeWindow.__PMM_WORLDBOOK_PRESET_DROP_BRIDGE__.snapshot();
assert.equal(emptySnapshot?.complete, true, 'Gecko 桥必须把可读取的空预设视为完整草稿');
assert.equal(emptySnapshot?.prompts?.length, 0, 'Gecko 桥必须保留真实的空预设');
const unreadableProps = { side: 'left', onCrossPanelDrop: liveDrop };
promptPanel.vnode.props = unreadableProps;
promptPanel.props = unreadableProps;
assert.equal(bridgeWindow.__PMM_WORLDBOOK_PRESET_DROP_BRIDGE__.snapshot(), null, 'Gecko 桥读不到 prompts 时不得伪造空草稿');

console.log('Gecko compatibility: renderable frame, scheduler, touch/split adapters, live Vue bridge and incomplete-draft protection passed');

assert.ok(workshop.includes('((window.parent && window.parent.innerWidth) || window.innerWidth || 9999) <= 768'));
