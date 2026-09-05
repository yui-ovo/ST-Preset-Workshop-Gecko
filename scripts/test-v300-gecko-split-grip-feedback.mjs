import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v3.07.js', import.meta.url), 'utf8');
const entry = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');

assert.ok(entry.includes("const EXTENSION_VERSION = '3.1.11'"), 'Gecko 扩展版本号不是 3.1.11');
assert.ok(entry.includes("new URL('./workshop-v3.07.js', import.meta.url)"), '启动器没有指向 v3.05 业务入口');

const grip = source.match(/#preset-manager-main-panel \.pmm-split-handle--top::before\{([\s\S]*?)\n  \}/)?.[1] || '';
assert.ok(grip.includes('height:3px!important'), '底边横条没有加粗到 3px');
assert.ok(grip.includes('opacity:.30!important'), '底边横条静止时没有保留浅色');
assert.ok(source.includes('.pmm-split-handle--top:active::before'), '按住底边时没有即时聚焦反馈');
assert.ok(source.includes('opacity:.68!important'), '按住底边时加深程度不正确');
assert.ok(source.includes('pmm-layout-resizing .pmm-split-handle--top::before'), '上下拖动时没有持续高亮');
assert.ok(source.includes('opacity:.82!important'), '拖动中的高亮程度不正确');
assert.ok(source.includes('width:100%!important;height:18px!important'), '视觉横条调整时误缩小了整宽触摸区');
assert.ok(source.includes('V3.00 Gecko 已加载：底边横条加粗，按下与拖动时分级加深。'), '缺少 v3.00 加载标记');

console.log('v3.00 Gecko 底边反馈测试通过：静止浅色，按下加深，拖动持续高亮。');
