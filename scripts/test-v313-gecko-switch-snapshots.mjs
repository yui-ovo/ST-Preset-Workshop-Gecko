import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workshop = await readFile(new URL('../dist/workshop-v3.08.js', import.meta.url), 'utf8');
const entry = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');

const marker = 'PMM_SWITCH_SNAPSHOTS_GECKO_V313';
const start = workshop.indexOf(marker);
assert.ok(start >= 0, '找不到 Gecko 开关快照模块');
const snapshots = workshop.slice(start);

function section(startMarker, endMarker) {
  const sectionStart = snapshots.indexOf(startMarker);
  const sectionEnd = snapshots.indexOf(endMarker, sectionStart);
  assert.ok(sectionStart >= 0 && sectionEnd > sectionStart, `无法定位快照片段：${startMarker}`);
  return snapshots.slice(sectionStart, sectionEnd);
}

for (const required of [
  "const API_KEY = '__PMM_SWITCH_SNAPSHOTS_GECKO_V313__'",
  "const STORAGE_KEY = 'pmm.switch-snapshots.v1'",
  "const TRIGGER_CLASS = 'pmm-switch-snapshot-trigger'",
  'function saveDefaultSnapshot()',
  'function saveNewSnapshot(inputName, afterSave = null, promptsOverride = null)',
  'async function applySnapshot(id)',
  'async function resetSnapshotsForCurrentPreset()',
  'function bindSnapshotToCurrentCharacter(id)',
  'function bindSnapshotToCurrentChat(id)',
  'function openCharacterPicker(id)',
  'async function autoApplyBoundSnapshot()',
  'function syncChatBindingListener(store = readStore(), scheduleCurrent = false)',
]) {
  assert.ok(snapshots.includes(required), `Gecko 快照缺少最终测试版能力：${required}`);
}

const stateBuilder = section('function makeStates(prompts)', 'function defaultSnapshotName()');
assert.ok(stateBuilder.includes('id: text(prompt.id)'), '快照没有优先保存条目 UID');
assert.ok(stateBuilder.includes('name: text(prompt.name || prompt.id)'), '快照没有保留唯一名称兜底');
assert.ok(stateBuilder.includes('enabled: prompt.enabled === true'), '快照没有保存条目开关');
assert.ok(stateBuilder.includes('function makeGroupStates(presetName)'), '快照没有保存柏宝箱分组开关');
assert.ok(stateBuilder.includes('readGroupEnabledStates'), '快照没有读取原生柏宝箱分组状态');
assert.ok(stateBuilder.includes('syncGroupEnabledStates'), '快照没有写回原生柏宝箱分组状态');

const documentHosting = section('function visibleWorkshopDocument()', 'function isBranchMode()');
assert.ok(documentHosting.includes('normalPresetContainer()'), 'Gecko 快照没有优先定位真实主预设容器');
assert.ok(documentHosting.includes('container?.ownerDocument?.body'), 'Gecko 快照没有以主预设容器的 ownerDocument 作为宿主');
assert.ok(documentHosting.includes("currentDocument.getElementById?.('preset-manager-main-panel')"), 'Gecko 快照没有在跨 frame 时回退到可见工坊文档');
assert.ok(documentHosting.includes('return DOC?.body ? DOC : null'), 'Gecko 快照缺少后台文档的安全兜底');

const overlayHosting = section('function ensureOverlay()', 'function openOverlay()');
assert.ok(overlayHosting.includes('const targetDocument = visibleWorkshopDocument()'), '快照遮罩没有解析真实宿主文档');
assert.ok(overlayHosting.includes('targetDocument.createElement'), '快照遮罩没有在真实宿主文档创建');
assert.ok(overlayHosting.includes('targetDocument.body.appendChild(overlay)'), '快照遮罩没有挂到真实宿主文档 body');
assert.ok(overlayHosting.includes('overlayDocument = targetDocument'), '快照遮罩没有记录其宿主文档');
assert.ok(!overlayHosting.includes('DOC.body.appendChild(overlay)'), '快照遮罩仍可能被挂进后台 iframe');

const stylesheet = section('function installStyle(targetDocument)', 'function scheduleMount()');
assert.ok(stylesheet.includes('targetDocument.head.appendChild(style)'), '快照样式没有注入真实宿主文档');
assert.ok(stylesheet.includes('styledDocuments.add(targetDocument)'), '快照样式宿主未被记录用于清理');

const cleanupStart = snapshots.lastIndexOf('cleanup() {');
const cleanup = snapshots.slice(cleanupStart);
assert.ok(cleanupStart >= 0, '找不到 Gecko 快照清理逻辑');
assert.ok(cleanup.includes('for (const currentDocument of clickDocuments)'), '快照点击监听没有按宿主文档清理');
assert.ok(cleanup.includes('for (const currentDocument of cleanupDocuments)'), '快照样式与标题状态没有按宿主文档清理');
assert.ok(!snapshots.includes("DOC.addEventListener('click', handleDocumentClick, true)"), '快照点击监听仍被固定在后台 iframe');

const scope = section('function normalPresetContainer()', 'function normalTitleActions()');
for (const excluded of [
  "currentDocument.getElementById('pmm-preset-regex-transfer-overlay')",
  "root.classList.contains('pmm-worldbook-mode')",
  "root.querySelector('.side-panel-root .panel-btn.panel-btn--active')",
  "'.pm-panel-container--branch-mode, .pm-panel-container--merge-mode, .pm-panel-container--favorite-mode'",
]) {
  assert.ok(scope.includes(excluded), `快照入口没有排除特殊页面：${excluded}`);
}

const trigger = section('function mountTrigger()', 'function handleDocumentClick(event)');
assert.ok(trigger.includes('const actionsHost = normalTitleActions()'), '快照没有只挂到主预设标题栏');
assert.ok(trigger.includes('const activeDocument = actionsHost?.ownerDocument || visibleWorkshopDocument()'), '快照标题没有跟随真实宿主文档');
assert.ok(trigger.includes('button = host.ownerDocument.createElement'), '快照相机按钮没有在标题宿主文档创建');
assert.ok(trigger.includes("const titleContent = actionsHost?.closest?.('.title-content') || null"), '快照没有定位主标题内容');
assert.ok(trigger.includes('titleContent?.classList.add(HOME_TITLE_CLASS)'), '快照没有标记主页标题');
assert.ok(trigger.includes('host.insertBefore(button, importButton)'), '快照没有放在主标题导入按钮之前');

const mobileStyleStart = snapshots.indexOf('@media (max-width:768px){#preset-manager-main-panel.pmm-mobile-layout-enabled:not(.pmm-layout-custom-preset-width)');
assert.notEqual(mobileStyleStart, -1, '缺少手机默认快照让位规则');
const mobileStyle = snapshots.slice(mobileStyleStart, mobileStyleStart + 1800);
assert.ok(mobileStyle.includes('.title-content.${HOME_TITLE_CLASS} .title-row'), '手机让位没有只缩短内部名称行');
assert.ok(mobileStyle.includes('var(--pmm-title-overflow-actions-width) - 22px'), '手机默认没有为搜索、铅笔和快照完整留位');
assert.ok(mobileStyle.includes(':not(.pmm-layout-custom-preset-width)'), '手动调节名称滑杆后仍被强制缩短');
assert.ok(!mobileStyle.includes('.pm-panel-container--merge-mode'), '手机快照让位误伤缝合页面');
assert.ok(!mobileStyle.includes('.pmm-wb-inline-panel'), '手机快照让位误伤世界书页面');

const desktopStyle = section('@media (min-width:769px){#preset-manager-main-panel .pm-panel-container.${DESKTOP_HOME_PANEL_CLASS}', 'function scheduleMount()');
assert.ok(desktopStyle.includes('flex:0 0 620px!important'), '桌面主页快照标题适配缺少最终主面板宽度');
assert.ok(desktopStyle.includes('flex:0 0 208px!important'), '桌面主页快照标题适配缺少最终标题卡片宽度');
assert.ok(desktopStyle.includes('justify-content:center!important;width:100%!important;margin-left:0!important;gap:7px!important'), '桌面录制态取消与保存没有居中');
assert.ok(desktopStyle.includes('flex:0 0 28px!important;width:28px!important'), '桌面录制态取消与保存不是同尺寸');

for (const forbidden of ['pmm-floating-snapshot-trigger', 'FLOATING_ENTRY_API_KEY', 'openWorkshopHome', 'pmm-desktop-title-width-handle']) {
  assert.ok(!snapshots.includes(forbidden), `Gecko 快照不应包含悬浮入口或已撤回的宽度手柄：${forbidden}`);
}
const openOverlay = section('function openOverlay()', 'function normalPresetContainer()');
assert.ok(openOverlay.includes('开关快照仅可在主预设页面使用'), '非主页仍可能从 API 打开快照');
const captureEntry = section('async function enterCaptureModeFromOverlay()', 'function renderCaptureSavePrompt()');
assert.ok(captureEntry.includes('快照仅可从主预设页面标题栏启动'), '录制入口仍能跨页面启动');

const notifier = section('function notify(kind, message)', 'function getContext()');
assert.ok(notifier.includes('pmmTopNotificationsEnabled'), '快照通知绕过 Gecko 顶部通知开关');
assert.ok(notifier.includes('顶部通知已关闭'), '快照通知关闭时没有降级到控制台');

const compatStart = workshop.indexOf('async function applyBranchState');
const compatEnd = workshop.indexOf('PMM_GECKO_FAST_RESPONSE_V277', compatStart);
assert.ok(compatStart >= 0 && compatEnd > compatStart, '无法定位 Gecko 柏宝箱兼容层');
const compat = workshop.slice(compatStart, compatEnd);
for (const required of [
  '__PMM_SWITCH_SNAPSHOTS_GECKO_V313__',
  'PMM_SNAPSHOT_BRANCH_CONFLICT',
  '__suspendGroupPowerSync',
  '__suppressNextSuccessMessage',
  'function readGroupEnabledStates',
  'async function syncGroupEnabledStates',
]) {
  assert.ok(compat.includes(required), `Gecko 柏宝箱／分支兼容层缺少：${required}`);
}

for (const geckoRequired of [
  'function keepRuntimeFrameRenderable()',
  'PMM_GECKO_FAST_RESPONSE_V277',
  'PMM_EDIT_UNDO_GECKO_V290',
  'PMM_GECKO_TOUCH_SCROLL_V296',
  'PMM_GECKO_SPLIT_EDGE_V299',
]) {
  assert.ok(workshop.includes(geckoRequired), `快照移植误伤 Gecko 专属补丁：${geckoRequired}`);
}
assert.ok(entry.includes('gecko-frame-scheduler.js'), 'Gecko 帧调度桥丢失');
assert.ok(entry.includes('iframe.hidden = false'), 'Gecko 后台 iframe 兼容设置丢失');

console.log('Gecko v3.1.14 开关快照通过：主页限定、宿主文档挂载、手机标题让位、分组状态、绑定自动应用、桌面录制态与 Gecko 兼容补丁均已验证。');
