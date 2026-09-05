import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const entry = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');
const source = await readFile(new URL('../dist/workshop-v3.08.js', import.meta.url), 'utf8');

assert.ok(!entry.includes('iframe.hidden = true'), 'Gecko 版仍把后台 iframe 标记为 hidden');
assert.ok(entry.includes("left: '-10000px'"), 'Gecko 版缺少屏幕外可渲染 iframe 补丁');
assert.ok(entry.includes("new URL('./workshop-v3.08.js', import.meta.url)"), '启动器没有指向当前 v3.06 Gecko');
assert.ok(source.includes('function keepRuntimeFrameRenderable()'), 'Gecko 业务入口缺少后台 iframe 自修复');
assert.ok(source.includes('function panelContentIsVisible(panel)'), 'Gecko 入口没有检查工坊主体首帧');

for (const snippet of [
  "branchWidth: 0",
  "branchWidth: [0, 128]",
  "branchWidth: 'pmm-layout-custom-branch-width'",
  "{ key:'branchWidth', label:'分支名称框长度', unit:'px', step:1 }",
  "target.style.setProperty('--pmm-user-branch-width-offset', `${current.values.branchWidth}px`)",
]) {
  assert.ok(source.includes(snippet), `分支名称长度缺少独立状态：${snippet}`);
}

const captureStart = source.indexOf('  function capturePresetViewportWidths()');
const captureEnd = source.indexOf('  function refreshHeaderWrapping()', captureStart);
assert.ok(captureStart >= 0 && captureEnd > captureStart, '无法隔离标题宽度测量函数');
const capture = source.slice(captureStart, captureEnd);
assert.ok(
  capture.includes('.pm-panel-container > .pm-main-wrapper .pm-header,.pm-panel-container--merge-mode > .preset-panel .pm-header'),
  '缝合上下两张预设卡片没有共用预设宽度测量',
);
assert.ok(
  capture.includes(".pm-panel-container--branch-mode > .preset-panel .pm-header"),
  '分支卡片没有独立测量标题宽度',
);
assert.ok(capture.includes("customKey:'presetWidth'"), '预设名称框没有使用独立样式状态');
assert.ok(capture.includes("customKey:'branchWidth'"), '分支名称框没有使用独立样式状态');
assert.ok(!capture.includes("valueKey:'presetWidth'"), '预设宽度测量仍会改写滑杆值');
assert.ok(!capture.includes("valueKey:'branchWidth'"), '分支宽度测量仍会改写滑杆值');

const presetCssStart = source.indexOf('/* 外层标题视窗始终固定；默认时只让内部名称缩短，以保证搜索和铅笔可见。 */');
const branchCssStart = source.indexOf('/* 分支卡片使用独立的“分支名称框长度”', presetCssStart);
const cssEnd = source.indexOf('#preset-manager-main-panel.pmm-layout-custom-split-ratio', branchCssStart);
assert.ok(presetCssStart >= 0 && branchCssStart > presetCssStart && cssEnd > branchCssStart, '无法隔离双标题宽度样式');
const presetCss = source.slice(presetCssStart, branchCssStart);
const branchCss = source.slice(branchCssStart, cssEnd);
assert.ok(presetCss.includes('.pm-main-wrapper .pm-header .title-row'), '预设滑杆未命中上方原生标题');
assert.ok(presetCss.includes('.pm-panel-container--merge-mode > .preset-panel .pm-header .title-row'), '预设滑杆未命中缝合下方原生预设标题');
assert.ok(presetCss.includes('.pmm-wb-inline-panel[data-pmm-wb-panel="top"] .pmm-wb-source-select'), '预设滑杆未命中上方世界书标题');
assert.ok(!presetCss.includes('.pm-panel-container--merge-mode > .preset-panel .title-row'), '存在未限定 pm-header 的宽泛下方卡片规则');
assert.ok(!presetCss.includes('data-pmm-wb-panel="bottom"'), '预设滑杆仍会改变下方世界书标题');
assert.ok(!presetCss.includes('.pm-panel-container--branch-mode'), '预设滑杆仍会改变分支标题');
assert.ok(branchCss.includes('.pm-panel-container--branch-mode > .preset-panel .title-row'), '分支滑杆未命中分支标题');
assert.ok(!branchCss.includes('.pm-panel-container--merge-mode'), '分支滑杆仍会改变缝合标题');
assert.ok(branchCss.includes('+ 16px)!important'), '分支标题行没有收窄到必要的操作区宽度');
assert.ok(
  branchCss.includes("flex:0 0 calc(var(--pmm-native-branch-width,84px) + var(--pmm-user-branch-width-offset))!important"),
  '分支名称框没有随滑杆真正改变 flex 宽度',
);
assert.ok(branchCss.includes('.title-row .title-edit-btn'), '分支标题没有固定铅笔按钮宽度');
assert.ok(branchCss.includes('margin-left:0!important'), '新建按钮前仍可能保留自动空白');
assert.ok(!branchCss.includes('+ 50px)!important'), '仍保留会拉开铅笔与加号的旧整行扩宽');

assert.ok(source.includes('V2.71 已加载'), '缺少 v2.71 运行标记');
console.log('v2.71 分支标题测试通过：名称框独立伸缩，铅笔与新建按钮保持紧邻。');
