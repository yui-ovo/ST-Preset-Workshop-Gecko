import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workshop = (await readFile(new URL('../dist/workshop-v3.08.js', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const start = workshop.indexOf('PMM_SWITCH_SNAPSHOTS_GECKO_V313');
assert.ok(start >= 0, '找不到 Gecko 开关快照模块');
const snapshots = workshop.slice(start);

for (const required of [
  'let snapshotViewportCleanup = null;',
  'function bindSnapshotToVisibleViewport(overlay, ownerDocument)',
  'const viewport = view.visualViewport',
  'view.scrollY || view.pageYOffset',
  'viewport?.offsetTop',
  "overlay.style.setProperty('position', 'absolute', 'important')",
  "overlay.style.setProperty('--pmm-switch-snapshot-visible-height'",
  "viewport?.addEventListener?.('resize', scheduleUpdate",
  "viewport?.addEventListener?.('scroll', scheduleUpdate",
  "view.addEventListener?.('orientationchange', onOrientationChange",
  'later?.(scheduleUpdate, 120)',
  'function closeOverlay() {\n    unbindSnapshotViewport();',
  'bindSnapshotToVisibleViewport(overlay, overlay.ownerDocument || DOC)',
  'DOC.body.appendChild(overlay)',
  '--pmm-switch-snapshot-safe-top',
  'var(--pmm-switch-snapshot-visible-height,100dvh)',
]) {
  assert.ok(snapshots.includes(required), `Gecko 手机快照可视区适配缺失：${required}`);
}

assert.ok(snapshots.includes('.pmm-switch-snapshot-overlay{position:fixed!important;inset:0!important'), '桌面与 Tauri 的原有固定居中方式不应改变');
assert.ok(workshop.includes('--pmm-title-viewport-width:150px!important'), '普通手机标题外框基准宽度丢失');
assert.ok(workshop.includes('@media (max-width:374px){'), '极窄屏标题适配媒体规则丢失');
assert.ok(workshop.includes('--pmm-title-viewport-width:130px!important'), '极窄屏没有为关闭键释放 20px');
assert.ok(workshop.includes('function keepRuntimeFrameRenderable()'), '快照移植误伤 Gecko 运行时兼容补丁');

console.log('Gecko v3.1.20 快照通过：手机浏览器跟随真实可视区，极窄屏为关闭键让出 20px，Gecko 补丁仍保留。');
