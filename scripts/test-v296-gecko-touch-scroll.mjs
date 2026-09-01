import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v2.96.js', import.meta.url), 'utf8');
const entry = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');

assert.ok(entry.includes("const EXTENSION_VERSION = '2.96.0'"), 'Gecko 扩展版本号不是 2.96.0');
assert.ok(entry.includes("new URL('./workshop-v2.96.js', import.meta.url)"), '启动器没有指向 v2.96 业务入口');
assert.ok(source.includes('PMM_GECKO_TOUCH_SCROLL_V296'), '缺少 Gecko 手机滚动模块');
assert.ok(source.includes("const IS_GECKO = /(?:Firefox|Fennec|GeckoView)/i"), '滚动修复没有限制到 Gecko 浏览器');
assert.ok(source.includes("const LIST_SELECTOR = `${ROOT_SELECTOR} .prompt-panel__list`"), '没有绑定真正的条目滚动容器');
assert.ok(source.includes('width:12px!important'), '右侧触摸滚动轨宽度不正确');
assert.ok(source.includes('list.scrollTop = gesture.startScrollTop + deltaY * gesture.ratio'), '滚动轨没有按手指位移更新列表');
assert.ok(source.includes('touch-action:pan-x pan-y!important'), '名称框仍只允许单一方向手势');
assert.ok(source.includes("gesture.mode = 'horizontal'"), '名称框没有按方向识别横滑');
assert.ok(source.includes("if(event.pointerType==='touch')return;"), '条目快速绘制仍会抢占触摸滚动起点');
assert.ok(source.includes("if (/(?:Firefox|Fennec|GeckoView)/i.test(_pmmRangeUserAgent)) return null;"), 'Firefox 仍会启用安卓滑杆误触保护');
assert.ok(source.includes('Firefox 使用原生布局滑杆，不再叠加安卓误触保护'), '缺少 Firefox 原生滑杆说明');

console.log('v2.96 Gecko 触摸滚动测试通过：右侧滚动轨、名称横滑和 Firefox 原生滑杆已隔离。');
