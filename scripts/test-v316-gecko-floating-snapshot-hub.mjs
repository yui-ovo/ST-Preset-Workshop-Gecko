import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workshop = await readFile(new URL('../dist/workshop-v3.08.js', import.meta.url), 'utf8');
const worldbook = await readFile(new URL('../dist/worldbook-snapshots.js', import.meta.url), 'utf8');

assert.match(workshop, /pmm-floating-snapshot-trigger/);
assert.match(workshop, /openHub\('preset'\)/);
assert.match(workshop, /pmm-preset-batch-tabs/);
assert.match(workshop, /data-pmm-batch-tab="worldbook"/);
assert.match(workshop, /api\.openBatch\(true\)/);
assert.match(workshop, /pmm:fab-visibility-change/);
assert.match(workshop, /function unbindMobileDrag\(root\)/);
assert.match(workshop, /function stopRuntime\(\)/);
assert.match(workshop, /function startRuntime\(\)/);
assert.match(workshop, /DOC\.addEventListener\('pmm:fab-visibility-change',visibilityListener\)/);
assert.match(workshop, /decoratePreset\?\.\(existing, TOP\.__PMM_SNAPSHOT_HUB_PENDING__ === 'preset'\)/);

assert.match(worldbook, /const tabLabels = \{ preset: '预设', character: '角色世界书', global: '全局世界书' \}/);
assert.match(worldbook, /function tabs\(active, locked = false, includePreset = false\)/);
assert.match(worldbook, /async function openPresetHub\(\)/);
assert.match(worldbook, /openHub: scope => scope==='preset' \? openPresetHub\(\) : open\(scope,'',false,true\)/);
assert.match(worldbook, /tabs\(page, !!editing, hubMode\)/);
assert.match(worldbook, /data-batch-hub-tab="preset"/);
assert.match(worldbook, /closest\('\[data-batch-action\],\[data-batch-hub-tab\]'\)/);
assert.match(worldbook, /TOP\[FLOATING_BATCH_API\]\?\.open\?\.\(\)/);

console.log('v3.1.20 Gecko floating snapshot hub and dormant-entry lifecycle checks passed.');
