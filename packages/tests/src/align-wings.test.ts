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
  alignValueForFixture,
  applyWingOffset,
  wingScaleForIndex,
} from '../../frontend/src/engine/align-wings.ts';

assert.equal(wingScaleForIndex(0, 4, 2, 'out'), 1);
assert.equal(wingScaleForIndex(1, 4, 2, 'in'), 0);

const show = createEmptyShow('Align');
show.fixtures.push({
  name: 'A',
  fixtureId: 'VRSL_Light5CH',
  position: { x: 10, y: 20, pan: 128, tilt: 64 },
});

assert.equal(alignValueForFixture(show, 'A', 'x'), 10);
assert.equal(alignValueForFixture(show, 'A', 'pan'), 128);
assert.equal(applyWingOffset(128, 0), 1);
assert.equal(applyWingOffset(128, 1), 256);

console.log('align-wings tests passed');
