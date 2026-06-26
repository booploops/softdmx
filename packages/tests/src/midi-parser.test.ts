/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import { parseMidiMessage, parseMidiShowControl, scaleMidiToDmx } from '../../frontend/src/utils/midi-parser.ts';

// Test parseMidiMessage
console.log('Running test: parseMidiMessage note-on');
const noteOn = parseMidiMessage(new Uint8Array([0x90, 60, 100]));
assert.ok(noteOn);
assert.equal(noteOn.command, 0x90);
assert.equal(noteOn.channel, 1);
assert.equal(noteOn.control, 60);
assert.equal(noteOn.value, 100);

console.log('Running test: parseMidiMessage CC channel 2');
const ccMessage = parseMidiMessage(new Uint8Array([0xB1, 73, 127]));
assert.ok(ccMessage);
assert.equal(ccMessage.command, 0xB0);
assert.equal(ccMessage.channel, 2);
assert.equal(ccMessage.control, 73);
assert.equal(ccMessage.value, 127);

console.log('Running test: parseMidiMessage invalid data');
const invalid = parseMidiMessage(new Uint8Array([0x90, 60]));
assert.equal(invalid, null);

// Test parseMidiShowControl
console.log('Running test: parseMidiShowControl GO');
const mscGo = parseMidiShowControl(new Uint8Array([0xf0, 0x7f, 0x7f, 0x02, 0x01, 0x31, 0x2e, 0x35, 0x00, 0xf7]));
assert.ok(mscGo);
assert.equal(mscGo.command, 'go');
assert.equal(mscGo.cueNumber, '1.5');

console.log('Running test: parseMidiShowControl STOP');
const mscStop = parseMidiShowControl(new Uint8Array([0xf0, 0x7f, 0x7f, 0x02, 0x02, 0xf7]));
assert.ok(mscStop);
assert.equal(mscStop.command, 'stop');
assert.equal(mscStop.cueNumber, undefined);

console.log('Running test: parseMidiShowControl invalid payload');
const mscInvalid = parseMidiShowControl(new Uint8Array([0x90, 60, 127]));
assert.equal(mscInvalid, null);

// Test scaleMidiToDmx
console.log('Running test: scaleMidiToDmx scaling ranges');
assert.equal(scaleMidiToDmx(0), 0);
assert.equal(scaleMidiToDmx(127), 255);
assert.equal(scaleMidiToDmx(64), 129); // 64 / 127 * 255 = 128.5039 -> 129
assert.equal(scaleMidiToDmx(32), 64);   // 32 / 127 * 255 = 64.25 -> 64

console.log('All MIDI parser tests passed successfully!');
