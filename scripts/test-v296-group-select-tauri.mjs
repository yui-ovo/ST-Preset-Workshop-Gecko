import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/workshop-v2.96.js', import.meta.url), 'utf8');
const entry = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');

assert.ok(entry.includes("const EXTENSION_VERSION = '2.96.0'"), '正式版扩展版本号不是 2.96.0');
assert.ok(entry.includes("new URL('./workshop-v2.96.js', import.meta.url)"), '启动器没有指向 v2.96 业务入口');

for (const marker of [
  '_pmmSourceSection=t.sections.find(e=>m.every(n=>e.itemIds.includes(n)))',
  'parentSectionId:_pmmParentSectionId',
  "'data-parent-section-id':A.section.parentSectionId||''",
  "'data-selected-count':A.section.items.filter(e=>Y(e.id)).length",
  'PMM_GROUP_SELECT_NESTING_TEST24',
  'fa-solid fa-check-double',
  'dissolve.hidden = isNativeGroup(group)',
  'const targets = [group, ...descendants(group, children)]',
  'pmm-nested-section-slot',
]) {
  assert.ok(source.includes(marker), `分组内全选或原位子分组缺少实现：${marker}`);
}

for (const marker of [
  'PMM_TAURI_EDITOR_OVERFLOW_TEST28',
  'for (const scope of [TOP, window])',
  'if (!tauriDetected || !isIOS) return;',
  'width: calc(100% - 20px) !important',
  '.prompt-item--expanded .prompt-item__main',
  'white-space: pre-wrap !important',
  'grid-template-areas:',
  'header.clientWidth + 1',
]) {
  assert.ok(source.includes(marker), `Tauri iOS 编辑器防溢出缺少实现：${marker}`);
}

const addedCode = source.slice(source.indexOf('/* ===== PMM_GROUP_SELECT_NESTING_TEST24'));
assert.ok(addedCode.length > 0, '无法定位本次新增代码');
assert.ok(!/worldbook|data-wb|pmm-wb/iu.test(addedCode), '本次移植不应包含世界书功能或标记');

console.log('v2.96 回归通过：已移植分组内全选、原位子分组和 Tauri iOS 防溢出，且未加入世界书功能。');
