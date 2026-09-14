import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));
const entry = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');
const workshop = await readFile(new URL('../dist/workshop-v3.08.js', import.meta.url), 'utf8');
const worldbook = await readFile(new URL('../dist/worldbook-stitch-gecko.js', import.meta.url), 'utf8');
const toolbar = await readFile(new URL('../dist/worldbook-toolbar-entry-gecko.js', import.meta.url), 'utf8');
const bridge = await readFile(new URL('../dist/worldbook-preset-drop-bridge-gecko.js', import.meta.url), 'utf8');

assert.equal(manifest.version, '3.1.23', 'Gecko 世界书版必须更新 manifest 版本');
for (const marker of [
  "const appendRuntimeVersion = url =>",
  "url.searchParams.set('v', EXTENSION_VERSION)",
  "appendRuntimeVersion(new URL('./worldbook-stitch-gecko.js', import.meta.url))",
  "appendRuntimeVersion(new URL('./worldbook-preset-drop-bridge-gecko.js', import.meta.url))",
  "appendRuntimeVersion(new URL('./worldbook-toolbar-entry-gecko.js', import.meta.url))",
  "const worldbookLoaderKey = '__PMM_LOAD_WORLDBOOK_STITCH__'",
  '<script src="${schedulerUrl}"></script>',
  '<script src="${worldbookBridgeUrl}"></script>',
]) {
  assert.ok(entry.includes(marker), `Gecko 启动器缺少世界书或调度器入口：${marker}`);
}

for (const marker of [
  'function markWorldDraftDirty(side)',
  'function discardWorldDraft(side)',
  'async function reloadOpenNativeWorldbook(name)',
  'async function saveWorldSide(side)',
  'await reloadOpenNativeWorldbook(side.name);',
  'function reorderWorldEntries(sideName, keys, placement = null)',
  'async function duplicateWorldEntry(sideName, key)',
  'async function deleteWorldEntry(sideName, key)',
  'data-wb-action="duplicate-entry"',
  'data-wb-action="delete-entry"',
  'function worldToPreset(entry)',
  'SELF.top?.__PMM_WORLDBOOK_PRESET_DROP_BRIDGE__',
  'function currentNativePresetPanel()',
  'const panel = currentNativePresetPanel();',
  'bridge?.snapshot?.()',
  'async function transferWorldToWorld(fromName, move, forcedKeys = null, placement = null)',
  'const IS_GECKO = /(?:Firefox|Fennec|GeckoView)/i.test',
  'function restoreGeckoThemeToggle(',
  'toggles.forEach(toggle => { if (toggle !== primary) toggle.remove(); });',
  'function onGeckoWorldTouchStart(event)',
  'function onGeckoWorldTouchMove(event)',
  'function onGeckoWorldTouchEnd(event)',
  'function endNativePresetDragState()',
  "new TOP.DragEvent('dragend', { bubbles:true, cancelable:false })",
  'card.dispatchEvent(event);',
  'function scheduleDropIndicatorCleanup()',
  'for (const delay of [0, 80, 240])',
  '.finally(scheduleDropIndicatorCleanup)',
  'async function getLegacyWorldInfoNames()',
  'async function getWorldInfoNamesCompatible()',
  "await TOP.fetch('/api/settings/get'",
  'Array.isArray(data?.world_names) ? data.world_names : []',
  "DOC.addEventListener('touchmove', onGeckoWorldTouchMove, { capture:true, passive:false });",
]) {
  assert.ok(worldbook.includes(marker), `Gecko 世界书功能缺少实现：${marker}`);
}

const legacyNamesStart = worldbook.indexOf('  async function getLegacyWorldInfoNames()');
const compatibleNamesStart = worldbook.indexOf('  async function getWorldInfoNamesCompatible()', legacyNamesStart);
const refreshNamesStart = worldbook.indexOf('  async function refreshWorldNames()', compatibleNamesStart);
const compatibleNames = worldbook.slice(compatibleNamesStart, refreshNamesStart);
const refreshNames = worldbook.slice(refreshNamesStart, worldbook.indexOf('  function helperFunction(', refreshNamesStart));
assert.ok(compatibleNames.includes("if (typeof context?.getWorldInfoNames === 'function')"), 'Gecko 1.18 必须继续使用原生世界书枚举接口');
assert.ok(compatibleNames.includes('return await context.getWorldInfoNames();'), 'Gecko 1.18 原生枚举调用缺失');
assert.ok(compatibleNames.includes('return await getLegacyWorldInfoNames();'), 'Gecko 1.14 旧版枚举兜底缺失');
assert.ok(!compatibleNames.includes('worldNames.length'), 'Gecko 不得因 1.18 暂时返回空列表而误切换旧版接口');
assert.equal(refreshNames.match(/await getWorldInfoNamesCompatible\(\)/g)?.length, 2, 'Gecko 初次读取和原生刷新后都必须使用兼容入口');
assert.ok(!worldbook.includes('fallbackBaiBaiGroupedPresetDrop'), 'Gecko 的柏宝箱分组桥失败时不得直接写入局部预设数据');
assert.ok(worldbook.includes("notify('error', '目标分组已识别，但未取得工坊拖入处理器；已取消拖入以避免条目掉到组外');"), 'Gecko 分组桥不可用时必须安全取消');
const nativeSnapshotStart = worldbook.indexOf('  function nativePresetSnapshot()');
const nativeSnapshotEnd = worldbook.indexOf('  async function emitNativePresetDrop(', nativeSnapshotStart);
const nativeSnapshot = worldbook.slice(nativeSnapshotStart, nativeSnapshotEnd);
assert.ok(nativeSnapshot.includes('const panel = currentNativePresetPanel();'), 'Gecko 必须从当前左侧预设面板读取拖入目标');
assert.ok(nativeSnapshot.includes('const draft = bridge?.snapshot?.();'), 'Gecko 必须读取工坊当前未保存草稿');
assert.ok(nativeSnapshot.includes('draft?.complete === true'), 'Gecko 只能把已验证完整的实时草稿用于保存兜底');
assert.ok(nativeSnapshot.includes('liveDraftAvailable = true;'), 'Gecko 必须明确记录实时完整草稿可用性');
const nativeTransferStart = worldbook.indexOf('  async function transferToNativeTop(');
const nativeTransferEnd = worldbook.indexOf('  async function transferWorldToWorld(', nativeTransferStart);
const nativeTransfer = worldbook.slice(nativeTransferStart, nativeTransferEnd);
assert.ok(nativeTransfer.indexOf('await enqueue(') < nativeTransfer.indexOf('const target = nativePresetSnapshot();'), 'Gecko 必须在排队操作执行时重新读取拖入目标');
const fallbackGuard = nativeTransfer.indexOf('if (!hasVerifiedLivePresetDraft(target))');
const directPresetSave = nativeTransfer.indexOf('await savePresetEntries(target.name');
assert.ok(fallbackGuard >= 0, 'Gecko 直接保存预设前必须验证实时完整草稿');
assert.ok(directPresetSave > fallbackGuard, 'Gecko 不得在实时草稿未验证时直接保存预设');
assert.ok(nativeTransfer.includes("notify('error', '未取得当前预设的实时完整内容，已取消拖入以保护原预设');"), 'Gecko 无法验证草稿时必须取消拖入并保留原预设');

for (const marker of [
  "const API_KEY = '__PMM_WORLDBOOK_PRESET_DROP_BRIDGE__'",
  'function findDispatcher()',
  'const PARENT = (() => { try { return window.parent || window; } catch (_) { return window; } })();',
  'function ownerWindows()',
  'function installVueAppTracker()',
  'function findVueDispatcher()',
  'app.mixin({',
  'mounted() {',
  'unmounted() {',
  'dispatcherFromComponent(this.$)',
  'function componentHandlers(component)',
  'function dispatcherPriority(dispatcher, panel)',
  'function currentPromptDraft(dispatcher)',
  'function snapshot()',
  'complete: true,',
  'const bridge = { drop, snapshot, cleanup: () => {',
  'const vueTracker = installVueAppTracker();',
  'for (const owner of ownerWindows())',
  'source.onCrossPanelDrop',
  "reason: 'target-not-resolved'",
  'await dispatcher.drop(...args);',
]) {
  assert.ok(bridge.includes(marker), `Gecko 世界书拖入预设桥缺少实现：${marker}`);
}

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

for (const marker of [
  'data-pmm-worldbook-placeholder',
  "button.title = '世界书'",
  "button.setAttribute('aria-label', '打开世界书缝合')",
  'SELF[LOADER_KEY]',
]) {
  assert.ok(toolbar.includes(marker), `Gecko 世界书工具栏入口缺少实现：${marker}`);
}

const floatingStart = workshop.indexOf('/* ===== PMM_FLOATING_PANEL_BATCH_V1：悬浮预设与批量管理 ===== */');
const floatingEnd = workshop.indexOf('/* ===== PMM_GECKO_TOUCH_SCROLL_V296', floatingStart);
assert.ok(floatingStart >= 0 && floatingEnd > floatingStart, '无法定位 Gecko 悬浮入口补丁');
const floating = workshop.slice(floatingStart, floatingEnd);
for (const marker of [
  "TOP.matchMedia?.('(max-width: 768px)')",
  'const view = TOP || SELF;',
  '@media screen and (min-width:769px)',
  'width:342px!important',
  'flex:0 0 30px!important;width:30px!important;height:26px!important',
  '.panel-section:has(.panel-select--preset)',
]) {
  assert.ok(floating.includes(marker), `Gecko 桌面悬浮入口修复缺少实现：${marker}`);
}

console.log('Gecko v3.1.20 世界书拖入回归通过：连续换书后的未保存条目仍可作为稳定落点，旧处理器不会被复用。');
