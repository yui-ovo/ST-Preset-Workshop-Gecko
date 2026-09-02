import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v2.98.js', import.meta.url), 'utf8');
const entry = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');

assert.ok(entry.includes("const EXTENSION_VERSION = '2.98.0'"), 'Gecko 扩展版本号不是 2.98.0');
assert.ok(entry.includes("new URL('./workshop-v2.98.js', import.meta.url)"), '启动器没有指向 v2.98 业务入口');
assert.ok(source.includes('pmm-gecko-scroll-bottom-v298'), '缺少面板底边滚动抓手');
assert.ok(source.includes('height:10px!important'), '底边抓手的触摸高度不正确');
assert.ok(source.includes('pointer-events:none!important'), '底边抓手没有默认释放点击');
assert.ok(source.includes('.pmm-gecko-scroll-bottom-v298.is-scrollable'), '底边抓手没有按可滚动状态启用');
assert.ok(source.includes("const rails = [rail, bottomRail]"), '右侧与底边抓手没有共用滚动手势');
assert.ok(source.includes("target.classList.toggle('is-scrollable', enabled)"), '抓手没有跟随实际滚动状态刷新');
assert.ok(source.includes('bottomRail?.remove?.()'), '清理流程没有移除底边抓手');
assert.ok(source.includes('V2.97 Gecko 已加载：已恢复 Firefox 布局滑杆的纵向滚动防误触保护。'), '新增抓手时误删了滑杆防误触保护');
assert.ok(source.includes('V2.98 Gecko 已加载：手机面板底边新增纵向滚动抓手，仅在列表可滚动时响应。'), '缺少 v2.98 加载标记');

console.log('v2.98 Gecko 底边滚动抓手测试通过：远离屏幕侧边缘，且仅在列表可滚动时接管触摸。');
