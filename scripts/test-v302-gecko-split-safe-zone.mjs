import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v3.05.js', import.meta.url), 'utf8');
const entry = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');

assert.ok(entry.includes("const EXTENSION_VERSION = '3.1.2'"), 'Gecko 扩展版本号不是 3.1.2');
assert.ok(entry.includes("new URL('./workshop-v3.05.js', import.meta.url)"), '启动器没有指向 v3.05 业务入口');
assert.ok(source.includes('const MOBILE_SPLIT_SAFE_ZONE = 36'), '底边触摸安全带高度不是 36px');
assert.ok(source.includes('function captureMobileSplitSafeZone(event)'), '缺少底边捕获阶段拦截器');
assert.ok(source.includes("splitContainer?.querySelector(':scope > .pm-main-wrapper > .preset-panel')"), '安全带没有按上方卡片边界定位');
assert.ok(source.includes('clientY < rect.bottom - MOBILE_SPLIT_SAFE_ZONE'), '安全带没有限制到上方卡片底部');
assert.ok(source.includes('event.stopImmediatePropagation?.()'), '安全带没有阻止分组和条目继续接收触摸');
assert.ok(source.includes('currentTarget:handle'), '安全带触摸没有改交给原卡片比例抓手');
assert.ok(source.includes("DOC.addEventListener('pointerdown', captureMobileSplitSafeZone, { capture:true, passive:false })"), '安全带没有在捕获阶段监听触摸');
assert.ok(source.includes("DOC.removeEventListener('pointerdown', captureMobileSplitSafeZone, true)"), '清理流程没有移除安全带监听器');
assert.ok(source.includes("handle.classList.add('pmm-split-handle--pressed')"), '安全带触摸没有触发横条按压反馈');
assert.ok(source.includes('V3.02 Gecko 已加载：上方卡片底部安全带在捕获阶段屏蔽底层条目操作。'), '缺少 v3.02 加载标记');

console.log('v3.02 Gecko 底边安全带测试通过：圈定区域只调节卡片比例，不再触发底层分组与条目。');
