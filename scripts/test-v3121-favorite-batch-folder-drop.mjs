import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../dist/workshop-v3.08.js', import.meta.url), 'utf8');

for (const marker of [
  'function _pmmMoveFavoriteItemsToCategoryInState',
  'async function _pmmMoveManyFavoritesToCategory',
  'moveManyToCategory:async function',
  'Array.isArray(e)?await t.moveManyToCategory(e,n):await t.moveToCategory(e,n)',
  "s('move-to-category',[...E.draggedIds],A.category.id)",
  "s('move-to-category',[...E.draggedIds],n)",
  "s('move-to-category',[...E.draggedIds],void 0)",
]) {
  assert.ok(source.includes(marker), `缺少收藏批量拖入修复：${marker}`);
}

for (const obsolete of [
  "E.draggedIds.forEach(e=>s('move-to-category',e,A.category.id))",
  "if('into'===e)for(const e of E.draggedIds)s('move-to-category',e,n)",
  "else for(const e of E.draggedIds)s('move-to-category',e,void 0)",
]) {
  assert.equal(source.includes(obsolete), false, `仍在逐条并发保存收藏：${obsolete}`);
}

const helperStart = source.indexOf('function _pmmMoveFavoriteItemsToCategoryInState');
const helperEnd = source.indexOf('async function _pmmMoveManyFavoritesToCategory', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, '无法隔离收藏批量移动算法');

const sandbox = {};
vm.runInNewContext(
  `${source.slice(helperStart, helperEnd)};globalThis.moveBatch=_pmmMoveFavoriteItemsToCategoryInState;`,
  sandbox,
);

const state = {
  categories: [
    { id: 'source', name: '来源' },
    { id: 'target', name: '目标' },
  ],
  items: [
    { id: 'target-old', categoryId: 'target', sortIndex: 0 },
    { id: 'picked-1', categoryId: 'source', sortIndex: 0 },
    { id: 'left-behind', categoryId: 'source', sortIndex: 1 },
    { id: 'picked-2', categoryId: 'source', sortIndex: 2 },
  ],
};

assert.equal(sandbox.moveBatch(state, ['picked-2', 'picked-1'], 'target'), 2);
assert.deepEqual(
  state.items
    .filter(item => item.categoryId === 'target')
    .sort((left, right) => left.sortIndex - right.sortIndex)
    .map(item => item.id),
  ['target-old', 'picked-2', 'picked-1'],
  '多选条目没有在一次事务中全部进入目标文件夹或顺序被打乱',
);
assert.deepEqual(
  state.items
    .filter(item => item.categoryId === 'source')
    .map(item => item.sortIndex),
  [0],
  '来源文件夹的排序没有在批量移动后收紧',
);

assert.equal(sandbox.moveBatch(state, ['picked-2', 'picked-1'], undefined), 2);
assert.deepEqual(
  state.items
    .filter(item => item.categoryId === undefined)
    .sort((left, right) => left.sortIndex - right.sortIndex)
    .map(item => item.id),
  ['picked-2', 'picked-1'],
  '多选拖回收藏根目录没有一次完成',
);

console.log('v3.1.21 Gecko 回归通过：收藏多选拖入文件夹及拖回根目录均只保存一次，并保留选择顺序。');

