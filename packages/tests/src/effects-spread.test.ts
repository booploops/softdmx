/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import { computeSpreadPhase, waveformValue } from '../../frontend/src/engine/effects/spread.ts';

assert.ok(computeSpreadPhase(0, 4, 1) >= 0);
assert.ok(computeSpreadPhase(3, 4, 1, 2) !== computeSpreadPhase(0, 4, 1, 2));
assert.equal(waveformValue('square', 0), 1);
assert.equal(waveformValue('square', 0.6), 0);
assert.ok(waveformValue('sine', 0.25) > 0.9);

console.log('effects-spread tests passed');
