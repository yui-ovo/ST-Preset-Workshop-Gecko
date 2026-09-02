import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v3.00.js', import.meta.url), 'utf8');
const entry = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');

assert.ok(entry.includes("const EXTENSION_VERSION = '3.0.0'"), 'Gecko 扩展版本号不是 3.0.0');
assert.ok(entry.includes("new URL('./workshop-v3.00.js', import.meta.url)"), '启动器没有指向 v3.00 业务入口');
assert.ok(source.includes('PMM_GECKO_SPLIT_EDGE_V299'), '缺少当前 Gecko 卡片底边模块');
assert.ok(source.includes("const IS_GECKO = /(?:Firefox|Fennec|GeckoView)/i"), '名称横滑没有限制到 Gecko 浏览器');
assert.ok(source.includes('TOP.__PMM_GECKO_TOUCH_SCROLL_V296__?.cleanup?.()'), '旧的右侧/底部内容滚动轨没有被清理');
assert.ok(source.includes('touch-action:pan-x pan-y!important'), '名称框仍只允许单一方向手势');
assert.ok(source.includes("gesture.mode = 'horizontal'"), '名称框没有按方向识别横滑');
assert.ok(source.includes("if(event.pointerType==='touch')return;"), '条目快速绘制仍会抢占触摸滚动起点');
console.log('v2.99 Gecko 触摸回归通过：旧内容滚动轨已清理，名称横滑继续保留。');
