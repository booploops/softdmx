import assert from 'node:assert/strict';
import { createEmptyShow } from '../../frontend/src/show/document.ts';
import {
  ensureDefaultPresetPool,
  resolvePresetIdFromPoolSlot,
} from '../../frontend/src/utils/preset-pool.ts';

const show = createEmptyShow('Pool Test');
show.presets.push({ id: 'p1', name: 'Red', targets: [] });
show.presets.push({ id: 'p2', name: 'Blue', targets: [] });

const pools = ensureDefaultPresetPool(show);
assert.equal(pools.length, 1);
assert.equal(pools[0]?.slots.length, 2);
assert.equal(pools[0]?.slots[0], 'p1');

show.presetPools = pools;
assert.equal(resolvePresetIdFromPoolSlot(show, 'default-pool', 1), 'p2');
assert.equal(resolvePresetIdFromPoolSlot(show, 'default-pool', 99), null);

console.log('preset-pool tests passed');
