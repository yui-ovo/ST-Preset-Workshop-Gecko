import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const entry = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');
const workshop = await readFile(new URL('../dist/workshop-v3.08.js', import.meta.url), 'utf8');
const scheduler = await readFile(new URL('../bridge/gecko-frame-scheduler.js', import.meta.url), 'utf8');

assert.ok(entry.includes("const EXTENSION_VERSION = '3.1.12'"), 'Gecko 扩展版本号不是 3.1.12');
assert.ok(entry.includes("new URL('./workshop-v3.08.js', import.meta.url)"), '启动器没有指向 v3.05 业务入口');
assert.ok(entry.indexOf('<script src="${schedulerUrl}"></script>') < entry.indexOf('vue.runtime.global.prod.min.js'), '顶层帧调度桥没有在 Vue 前加载');
assert.ok(scheduler.includes('globalThis.requestAnimationFrame = callback => hostRequestAnimationFrame'), '后台 iframe 的 rAF 没有委托给顶层窗口');

const fabStart = workshop.indexOf('function makeFab(doc)');
const fabEnd = workshop.indexOf('function visiblePanelContainer', fabStart);
assert.ok(fabStart >= 0 && fabEnd > fabStart, '无法隔离 Gecko 手机备用入口');
const fab = workshop.slice(fabStart, fabEnd);
for (const snippet of [
  'const FAST_OPEN_WAIT_MS = 240',
  'const FIRST_FRAME_WATCHDOG_MS = 1800',
  'new Promise(resolve => win.setTimeout(resolve, ms))',
  'async function waitForVisibleMainPanel(timeout = FAST_OPEN_WAIT_MS)',
  "if (typeof xo === 'function') xo()",
  'async function waitForOpenAttempt(stage)',
  'acceptOpeningShell(stage)',
]) {
  assert.ok(fab.includes(snippet), `Gecko 快速入口缺少关键行为：${snippet}`);
}
assert.ok(!fab.includes('timeout = 1400'), '入口仍保留单阶段 1.4 秒等待');

for (const snippet of [
  'PMM_GECKO_FAST_RESPONSE_V277',
  "const WAKE_CLASS='pmm-gecko-paint-now-v277'",
  'content-visibility:visible!important',
  'contain:none!important',
  "DOC.addEventListener('pointerdown',onPointerDown,true)",
  "DOC.addEventListener('click',onClick,true)",
  'TOP.Promise.resolve().then(()=>hostRaf',
  'V2.77 Gecko 快速响应已加载',
]) {
  assert.ok(workshop.includes(snippet), `条目即时绘制补丁缺少关键行为：${snippet}`);
}
assert.ok(workshop.includes("if(event.pointerType==='touch')return;"), '触摸滚动起点仍会立即触发强制绘制');

console.log('v2.77 Gecko 快速响应测试通过：入口不再串行长等，展开条目由顶层窗口即时唤醒。');
