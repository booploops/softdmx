/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import {
  applyOscMediaCompensation,
  applyTimecodeCompensation,
  compensateLinkPhase,
} from '../src/utils/sync-compensation.ts';

console.log('Running test: timecode compensation');
assert.equal(
  applyTimecodeCompensation(100, { latencyMs: 2000, globalOffsetMs: 500 }),
  98.5
);
assert.equal(
  applyTimecodeCompensation(10, { latencyMs: 0, globalOffsetMs: -1000 }),
  9
);

console.log('Running test: OSC media compensation');
assert.equal(
  applyOscMediaCompensation(60, { mediaLatencyMs: 1000, mediaOffsetMs: 250 }),
  59.25
);

console.log('Running test: Link phase compensation');
assert.ok(Math.abs(compensateLinkPhase(1, 0, 120, { phaseOffset: 0.25 }) - 0.25) < 0.001);

console.log('All sync compensation tests passed!');
