import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v3.05.js', import.meta.url), 'utf8');
const entry = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');

assert.ok(entry.includes("const EXTENSION_VERSION = '3.1.5'"), 'Gecko 扩展版本号不是 3.1.5');
assert.ok(entry.includes("new URL('./workshop-v3.05.js', import.meta.url)"), '启动器没有指向 v3.05 业务入口');
assert.ok(source.includes('PMM_GECKO_SPLIT_EDGE_V299'), '缺少 Gecko 整宽底边比例抓手模块');
assert.ok(source.includes('TOP.__PMM_GECKO_TOUCH_SCROLL_V296__?.cleanup?.()'), '更新时没有清理误加的内容滚动轨');

const mobileTopHandle = source.match(/#preset-manager-main-panel \.pmm-split-handle--top\{([\s\S]*?)\n  \}/)?.[1] || '';
assert.ok(mobileTopHandle.includes('justify-self:stretch!important'), '上方卡片底边没有横向铺满');
assert.ok(mobileTopHandle.includes('width:100%!important'), '上方卡片底边触摸区不是整宽');
assert.ok(mobileTopHandle.includes('cursor:row-resize!important'), '底边没有保持比例调节语义');
assert.ok(source.includes('.pmm-split-handle--top::before'), '没有保留底边小横条提示');
assert.ok(source.includes("handle.addEventListener('pointerdown', beginSplitResize)"), '整宽底边没有复用原卡片比例调节逻辑');
assert.ok(source.includes('resizeFromPoint(point.clientX, point.clientY, splitContainer, edge)'), '拖动底边没有更新上下卡片比例');
assert.ok(source.includes('V2.97 Gecko 已加载：已恢复 Firefox 布局滑杆的纵向滚动防误触保护。'), '改底边时误删了滑杆防误触');
assert.ok(source.includes('V2.99 Gecko 已加载：底边横条改为整宽卡片比例抓手，已移除内容滚动轨。'), '缺少 v2.99 加载标记');

console.log('v2.99 Gecko 卡片底边测试通过：小横条保留，整条底边复用原上下卡片比例调节。');
