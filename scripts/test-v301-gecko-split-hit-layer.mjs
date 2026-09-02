import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v3.02.js', import.meta.url), 'utf8');
const entry = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');

assert.ok(entry.includes("const EXTENSION_VERSION = '3.0.2'"), 'Gecko 扩展版本号不是 3.0.2');
assert.ok(entry.includes("new URL('./workshop-v3.02.js', import.meta.url)"), '启动器没有指向 v3.02 业务入口');

const handle = source.match(/#preset-manager-main-panel \.pmm-split-handle--top\{([\s\S]*?)\n  \}/)?.[1] || '';
assert.ok(handle.includes('width:100%!important'), '底边触摸层没有保持整宽');
assert.ok(handle.includes('z-index:10000!important'), '底边触摸层没有提升到分组和条目之上');
assert.ok(handle.includes('pointer-events:auto!important'), '底边触摸层没有优先接收触摸');
assert.ok(handle.includes('touch-action:none!important'), '底边触摸层仍可能交给列表滚动');
assert.ok(handle.includes('isolation:isolate!important'), '底边触摸层没有建立独立层叠上下文');
assert.ok(source.includes('.pmm-split-handle--top > *{pointer-events:none!important}'), '横条内部元素仍可能截走触摸');
assert.ok(source.includes('V3.01 Gecko 已加载：底边透明触摸层提升至分组与条目上方。'), '缺少 v3.01 加载标记');

console.log('v3.01 Gecko 底边命中测试通过：视觉不变，透明触摸层优先于分组与条目。');
