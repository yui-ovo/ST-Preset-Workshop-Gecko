import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));
const entry = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');
const workshop = await readFile(new URL('../dist/workshop-v2.77.js', import.meta.url), 'utf8');
const migrationBase = await readFile(new URL('../dist/workshop-v2.53.js', import.meta.url), 'utf8');
const bridge = await readFile(new URL('../bridge/predefine.js', import.meta.url), 'utf8');
const scheduler = await readFile(new URL('../bridge/gecko-frame-scheduler.js', import.meta.url), 'utf8');
const legacy = JSON.parse(await readFile(new URL('../legacy/🧩预设工坊｜双端适配v2.53.json', import.meta.url), 'utf8'));
const expectedWorkshopHash = '35a0f76b35d8fea5bedcf5b266e1baad5bbec5aedadc00a6c8a1560bc12efa6d';

const required = ['display_name', 'loading_order', 'js', 'author', 'version'];
for (const key of required) {
  if (manifest[key] === undefined || manifest[key] === '') {
    throw new Error(`manifest.json 缺少必填字段：${key}`);
  }
}

if (manifest.js !== 'dist/index.js') {
  throw new Error('manifest.json 的入口文件不是 dist/index.js');
}

if (!entry.includes('startPresetWorkshop') || !entry.includes('waitForTavernHelper')) {
  throw new Error('扩展启动器不完整');
}

if (workshop.length < 1_000_000 || !workshop.includes('V2.77 Gecko 快速响应已加载')) {
  throw new Error(`v2.77 Gecko 业务入口不完整：${workshop.length} 字符`);
}

if (!entry.includes('workshop-v2.77.js') || !entry.includes("const EXTENSION_VERSION = '2.77.1'")) {
  throw new Error('扩展启动器没有指向 v2.77 Gecko');
}

if (!workshop.includes('readPresetExtensionField?.({name:requested,path:PATH})')) {
  throw new Error('v2.77 Gecko 没有按指定预设读取柏宝箱分组');
}

if (!workshop.includes('writePresetExtensionField({name:presetName,path:PATH')) {
  throw new Error('v2.77 Gecko 没有按指定预设写入柏宝箱分组');
}

if (!workshop.includes("String(n).startsWith('branch:')") ||
    !workshop.includes('分支直接使用已保存的柏宝箱分组快照')) {
  throw new Error('v2.77 Gecko 缺少分支快照读取隔离修复');
}

if (legacy.content !== migrationBase) {
  throw new Error('dist/workshop-v2.53.js 与原始 v2.53 JSON 内容不一致');
}

const workshopHash = createHash('sha256').update(migrationBase).digest('hex');
if (workshopHash !== expectedWorkshopHash) {
  throw new Error(`v2.53 业务入口校验失败：${workshopHash}`);
}

if (!bridge.includes('TavernHelper') || !bridge.includes('_bind')) {
  throw new Error('酒馆助手兼容桥不完整');
}

if (!scheduler.includes('__PMM_GECKO_FRAME_SCHEDULER_V277__') || !entry.includes('gecko-frame-scheduler.js')) {
  throw new Error('v2.77 Gecko 顶层帧调度桥不完整');
}

console.log(`扩展检查通过：${manifest.display_name} v${manifest.version}，业务入口 ${workshop.length} 字符。`);
