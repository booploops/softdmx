/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
