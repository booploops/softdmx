/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import { phaseToTheta, thetaToLfoValue } from '../src/utils/link-helper.ts';

// Test phaseToTheta
console.log('Running test: phaseToTheta quantum mappings');
assert.equal(phaseToTheta(0.0), 0);
assert.ok(Math.abs(phaseToTheta(2.0) - Math.PI) < 1e-9);
assert.ok(Math.abs(phaseToTheta(1.0) - Math.PI / 2.0) < 1e-9);
assert.equal(phaseToTheta(4.0), 0); // Wraps around with modulo

// Test thetaToLfoValue
console.log('Running test: thetaToLfoValue ranges');
assert.equal(thetaToLfoValue(0), 128); // Math.sin(0) = 0 -> 128
assert.equal(thetaToLfoValue(Math.PI / 2.0), 255); // Math.sin(pi/2) = 1 -> 255
assert.equal(thetaToLfoValue(3.0 * Math.PI / 2.0), 0); // Math.sin(3pi/2) = -1 -> 0
assert.equal(thetaToLfoValue(Math.PI), 128); // Math.sin(pi) = 0 -> 128

console.log('All Ableton Link LFO sync tests passed successfully!');
