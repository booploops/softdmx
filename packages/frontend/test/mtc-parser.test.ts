/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import { MtcAssembler, parseMtcQuarterFrame } from '../src/engine/mtc-parser.ts';

console.log('Running test: parseMtcQuarterFrame detects 0xF1');
assert.equal(parseMtcQuarterFrame(new Uint8Array([0xf1, 0x03])), 0x03);
assert.equal(parseMtcQuarterFrame(new Uint8Array([0x90, 0x03])), null);

console.log('Running test: MtcAssembler assembles full frame');
const assembler = new MtcAssembler();

// 01:02:03:04 @ 30fps (rate bits = 3 -> index 3 -> 30)
const quarterFrames = [
  0x04, // piece 0: frames low nibble = 4
  0x10, // piece 1: frames high nibble = 0
  0x23, // piece 2: seconds low = 3
  0x30, // piece 3: seconds high = 0
  0x42, // piece 4: minutes low = 2
  0x50, // piece 5: minutes high = 0
  0x61, // piece 6: hours low = 1
  0x76, // piece 7: hours high bit + rate 3 (011)
];

let frame = null;
for (const byte of quarterFrames) {
  frame = assembler.feed(byte);
}

assert.ok(frame);
assert.equal(frame.hours, 1);
assert.equal(frame.minutes, 2);
assert.equal(frame.seconds, 3);
assert.equal(frame.frames, 4);
assert.equal(frame.frameRate, 30);
assert.equal(frame.dropFrame, false);

console.log('All mtc-parser tests passed.');
