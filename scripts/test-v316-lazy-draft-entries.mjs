import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/worldbook-snapshots.js', import.meta.url), 'utf8');

assert.ok(source.includes('const isOpen=!!draft.expanded[name]'), 'draftMarkup 必须检查世界书展开状态');
assert.ok(
  !source.slice(source.indexOf('function draftMarkup()'),source.indexOf('\nfunction groupEditorMarkup')).includes('bookEntriesMarkup('),
  'draftMarkup 不应同步渲染任何世界书条目',
);
assert.ok(
  source.includes("if(draft)for(const bookBlock of overlay.querySelectorAll('[data-draft-book][data-open=\"true\"]'))ensureBookEntries(bookBlock)"),
  '重新渲染后，已展开分组必须进入渐进渲染流程',
);
assert.ok(source.includes('function ensureBookEntries(bookBlock)'), '必须有渐进条目渲染器');
assert.ok(source.includes('container.dataset.rendered || container.dataset.rendering'), '不得重复启动条目渲染');

{
  const fnStart = source.indexOf('function ensureBookEntries(bookBlock)');
  const fnBody = source.slice(fnStart, source.indexOf('\nfunction draftMarkup', fnStart));
  assert.ok(fnBody.includes('offset+batchSize'), '每帧必须只创建固定批量的世界书条目');
  assert.ok(fnBody.includes('scheduleBookEntryRender(()=>renderBatch(BOOK_ENTRY_RENDER_BATCH_SIZE))'), '剩余条目必须分散到后续帧');
  assert.ok(fnBody.includes("if(!draft.expanded[name]){stop();return;}"), '折叠时必须暂停后台生成');
  assert.ok(fnBody.includes("container.dataset.rendered='1'"), '全部完成后必须标记已渲染');
  assert.ok(fnBody.includes('filterDraft(name)'), '每批生成后必须应用搜索词');
}

assert.ok(source.includes('const BOOK_ENTRY_INITIAL_BATCH_SIZE=2'), '首次点击必须只同步生成两个轻量条目');
assert.ok(source.includes('const BOOK_ENTRY_RENDER_BATCH_SIZE=8'), '后续每帧批量上限应为 8');
assert.ok(source.includes('renderBatch(BOOK_ENTRY_INITIAL_BATCH_SIZE)'), '首批条目必须在点击处理内生成');
assert.ok(source.includes('container.dataset.renderedCount'), '重新展开必须从已生成数量继续');
assert.ok(
  source.includes("say('正在读取世界书开关…',true); engine.setCapturing(true);")
    && source.includes('await new Promise(resolve=>scheduleBookEntryRender(resolve));'),
  '读取完整数据前必须先绘制等待反馈',
);

const toggleStart = source.indexOf("if(action==='toggle-draft-book' && draft)");
const toggleHandler = source.slice(toggleStart, source.indexOf('\n  }', toggleStart) + 4);
assert.ok(toggleHandler.includes('entries.hidden=!expanded'), '点击标题后必须立即显示或隐藏框架');
assert.ok(toggleHandler.includes('if(expanded)ensureBookEntries(bookBlock)'), '展开时必须按需渲染条目');
assert.ok(toggleHandler.includes("target.setAttribute('aria-expanded',String(expanded))"), '受控按钮必须同步无障碍状态');
assert.ok(!source.includes("overlay.addEventListener('toggle'"), '不得依赖移动端响应较慢的原生 details toggle 事件');
assert.ok(
  !source.slice(source.indexOf('function draftMarkup()'),source.indexOf('\nfunction groupEditorMarkup')).includes('<details'),
  '编辑器不得生成原生 details 元素',
);

assert.ok(source.includes('preview.dataset.loaded'), '条目正文必须按需加载并避免重复加载');
{
  const fnStart = source.indexOf('function bookEntriesMarkup(name, entries)');
  const fnEnd = source.indexOf('\nfunction scheduleBookEntryRender', fnStart);
  const fnBody = source.slice(fnStart, fnEnd);
  assert.ok(fnBody.includes('entry-preview" hidden></div>'), '初始条目正文容器必须为空');
  assert.ok(!fnBody.includes('pmm-wbs-entry-preview-content'), '初始 DOM 不应包含正文内容');
}

assert.ok(source.includes('function updateBatchRow(name)'), '批量管理必须支持单行更新');
assert.ok(source.includes('function updateBatchFooter()'), '批量管理必须支持独立更新底栏');
{
  const toggleIdx = source.indexOf("action==='toggle')");
  const toggleLine = source.slice(toggleIdx, source.indexOf('\n', toggleIdx));
  assert.ok(toggleLine.includes('updateBatchRow(name)') && !toggleLine.includes('renderBatch'), '单选不得重绘整个批量列表');
}

assert.ok(source.includes('.pmm-wbs-entry-block { content-visibility:auto; contain-intrinsic-size:auto 50px; }'), '条目行必须启用离屏渲染优化');
assert.ok(source.includes('.pmm-wbs-batch-row { content-visibility:auto; contain-intrinsic-size:auto 44px; }'), '批量行必须启用离屏渲染优化');
assert.ok(source.includes('.pmm-wbs-row { content-visibility:auto; contain-intrinsic-size:auto 70px; }'), '快照卡片必须启用离屏渲染优化');
assert.ok(source.includes('backdrop-filter:blur'), '毛玻璃效果不得被删除');

console.log('v3.1.20 回归通过：世界书立即展开、条目渐进生成、正文按需加载和列表局部更新均已覆盖。');
