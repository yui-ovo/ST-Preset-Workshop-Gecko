import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));
const entry = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');
const workshop = await readFile(new URL('../dist/workshop-v3.06.js', import.meta.url), 'utf8');
const worldbook = await readFile(new URL('../dist/worldbook-stitch-gecko.js', import.meta.url), 'utf8');
const toolbar = await readFile(new URL('../dist/worldbook-toolbar-entry-gecko.js', import.meta.url), 'utf8');
const bridge = await readFile(new URL('../dist/worldbook-preset-drop-bridge-gecko.js', import.meta.url), 'utf8');

assert.equal(manifest.version, '3.1.10', 'Gecko 世界书版必须更新 manifest 版本');
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

for (const marker of [
  "const API_KEY = '__PMM_WORLDBOOK_PRESET_DROP_BRIDGE__'",
  'function findDispatcher()',
  'const PARENT = (() => { try { return window.parent || window; } catch (_) { return window; } })();',
  'function ownerWindows()',
  'function installVueAppTracker()',
  'function findVueDispatcher()',
  'app.mixin({',
  'mounted() {',
  'dispatcherFromComponent(this.$)',
  'const mountedDispatcher = vueTracker?.dispatchers?.[vueTracker.dispatchers.length - 1];',
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
const nativeDrop = async (...args) => { receivedDrop = args; };
const promptPanel = {
  vnode: { props: { prompts: [{ id: 'target', name: '目标条目' }], onCrossPanelDrop: nativeDrop } },
  props: { prompts: [{ id: 'target', name: '目标条目' }] },
  attrs: {},
  subTree: null,
};
const app = {
  _instance: {
    vnode: { props: {} },
    props: {},
    attrs: {},
    subTree: { component: promptPanel, props: { onCrossPanelDrop: nativeDrop }, children: [] },
  },
  mount() { return null; },
  mixin(options) { mountedHook = options?.mounted || null; },
};
const bridgeDocument = { querySelector: () => null };
const bridgeWindow = { document: bridgeDocument, console, Vue: { createApp: () => app } };
bridgeWindow.parent = bridgeWindow;
bridgeWindow.top = bridgeWindow;
const bridgeContext = { window: bridgeWindow, document: bridgeDocument, console, Set, Object, Array, String, Boolean, Promise };
vm.runInNewContext(bridge, bridgeContext);
bridgeWindow.Vue.createApp().mount();
assert.equal(typeof mountedHook, 'function', 'Gecko Vue 应用桥必须注册组件挂载捕获器');
mountedHook.call({ $: promptPanel });
const bridgeResult = await bridgeWindow.__PMM_WORLDBOOK_PRESET_DROP_BRIDGE__.drop({
  entries: [{ id: 'world-entry' }],
  targetId: 'target',
  targetName: '目标条目',
  position: 'before',
  targetSectionId: 'baibai_group',
});
assert.equal(bridgeResult.ok, true, 'Gecko Vue 应用桥必须能找到原生拖入处理器');
assert.equal(receivedDrop?.[1], 'target', 'Gecko Vue 应用桥必须传递目标条目');
assert.equal(receivedDrop?.[3], 'baibai_group', 'Gecko Vue 应用桥必须传递柏宝箱目标分组');

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

console.log('v3.05 回归通过：Gecko 保留自身调度与触控补丁，并接入世界书草稿、条目排序、复制删除、预设拖入和桌面入口修复。');
