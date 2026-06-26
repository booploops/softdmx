/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import {
  formatSmpte,
  msToSeconds,
  parseSmpteInput,
  secondsToMs,
  smpteToSeconds,
} from '../../frontend/src/utils/timecode-format.ts';

console.log('Running test: SMPTE round-trip');
const seconds = smpteToSeconds({ hours: 1, minutes: 2, seconds: 3, frames: 15 }, 30);
assert.ok(Math.abs(seconds - (3723.5)) < 0.001);
assert.equal(formatSmpte(seconds, 30), '01:02:03:15');

console.log('Running test: parse SMPTE input');
assert.equal(parseSmpteInput('01:02:03:15', 30), seconds);
assert.equal(parseSmpteInput('12.5', 30), 12.5);

console.log('Running test: ms/seconds helpers');
assert.equal(secondsToMs(2), 2000);
assert.equal(msToSeconds(2000), 2);

console.log('All timecode format tests passed!');
