import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));
const entry = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');
const workshop = await readFile(new URL('../dist/workshop-v3.05.js', import.meta.url), 'utf8');
const worldbook = await readFile(new URL('../dist/worldbook-stitch-gecko.js', import.meta.url), 'utf8');
const toolbar = await readFile(new URL('../dist/worldbook-toolbar-entry-gecko.js', import.meta.url), 'utf8');
const bridge = await readFile(new URL('../dist/worldbook-preset-drop-bridge-gecko.js', import.meta.url), 'utf8');

assert.equal(manifest.version, '3.1.4', 'Gecko 世界书版必须更新 manifest 版本');
for (const marker of [
  "new URL('./worldbook-stitch-gecko.js', import.meta.url)",
  "new URL('./worldbook-preset-drop-bridge-gecko.js', import.meta.url)",
  "new URL('./worldbook-toolbar-entry-gecko.js', import.meta.url)",
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
  'async function fallbackBaiBaiGroupedPresetDrop(target, additions, placement = null)',
  "targetSectionId.startsWith('baibai_')",
  'await compat.flushPreset?.(target.name);',
  'if (await fallbackBaiBaiGroupedPresetDrop(target, additions, placement))',
  'async function transferWorldToWorld(fromName, move, forcedKeys = null, placement = null)',
  'const IS_GECKO = /(?:Firefox|Fennec|GeckoView)/i.test',
  'function restoreGeckoThemeToggle(',
  'toggles.forEach(toggle => { if (toggle !== primary) toggle.remove(); });',
  'function onGeckoWorldTouchStart(event)',
  'function onGeckoWorldTouchMove(event)',
  'function onGeckoWorldTouchEnd(event)',
  "DOC.addEventListener('touchmove', onGeckoWorldTouchMove, { capture:true, passive:false });",
]) {
  assert.ok(worldbook.includes(marker), `Gecko 世界书功能缺少实现：${marker}`);
}

for (const marker of [
  "const API_KEY = '__PMM_WORLDBOOK_PRESET_DROP_BRIDGE__'",
  'function findDispatcher()',
  'source.onCrossPanelDrop',
  "reason: 'target-not-resolved'",
  'await dispatcher.drop(...args);',
]) {
  assert.ok(bridge.includes(marker), `Gecko 世界书拖入预设桥缺少实现：${marker}`);
}

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
