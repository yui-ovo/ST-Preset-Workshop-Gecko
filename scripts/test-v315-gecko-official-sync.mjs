import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const entry = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');
const snapshots = await readFile(new URL('../dist/worldbook-snapshots.js', import.meta.url), 'utf8');
const stitch = await readFile(new URL('../dist/worldbook-stitch-gecko.js', import.meta.url), 'utf8');
const bridge = await readFile(new URL('../dist/worldbook-preset-drop-bridge-gecko.js', import.meta.url), 'utf8');
const toolbar = await readFile(new URL('../dist/worldbook-toolbar-entry-gecko.js', import.meta.url), 'utf8');

assert.match(entry, /const worldbookSnapshotsUrl = appendRuntimeVersion\(new URL\('\.\/worldbook-snapshots\.js', import\.meta\.url\)\);/);
assert.ok(entry.includes('<script type="module" src="${worldbookSnapshotsUrl}"></script>'));
assert.ok(snapshots.includes('__PMM_WORLDBOOK_STITCH_TEST3__'));
assert.ok(snapshots.includes('refreshSnapshotBook'));
assert.ok(snapshots.includes('可一键全局挂载世界书分组；也可为分组世界书创建快照。'));
assert.ok(stitch.includes('async refreshSnapshotBook(name, data, skipNative = false)'));
assert.ok(bridge.includes("const API_KEY = '__PMM_WORLDBOOK_PRESET_DROP_BRIDGE__'"));
assert.ok(toolbar.includes('data-pmm-worldbook-placeholder'));

console.log('Gecko 正式版功能移植与专属世界书补丁兼容检查通过');