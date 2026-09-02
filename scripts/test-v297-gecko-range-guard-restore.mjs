import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v3.00.js', import.meta.url), 'utf8');
const start = source.indexOf('function _pmmBindAndroidRangeGestureGuard');
const end = source.indexOf('function makeControl(control)', start);
assert.ok(start >= 0 && end > start, '无法定位当前版滑杆防误触保护');

const helper = source.slice(start, end);
assert.ok(!helper.includes('_pmmRangeUserAgent'), '当前版仍会对 Firefox 绕过滑杆保护');
assert.ok(!helper.includes('Firefox|Fennec|GeckoView'), '当前版仍会按 Gecko 浏览器停用滑杆保护');
assert.ok(helper.includes("gesture.mode = 'vertical'"), '没有恢复纵向滚动识别');
assert.ok(helper.includes("gesture.mode = 'horizontal'"), '没有保留横向滑杆调节');
assert.ok(helper.includes('Date.now() + 160'), '没有恢复纵滑结束后的延迟 input 拦截');
assert.ok(source.includes('V2.97 Gecko 已加载：已恢复 Firefox 布局滑杆的纵向滚动防误触保护。'), '缺少 v2.97 恢复标记');
assert.ok(source.includes('PMM_GECKO_SPLIT_EDGE_V299'), '调整底边时误删了 Gecko 名称横滑');

console.log('v2.99 Gecko 滑杆回归通过：Firefox 防误触保护和名称横滑继续保留。');
