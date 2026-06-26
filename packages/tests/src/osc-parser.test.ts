/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import { parseDirectOscAddress, parseOscValue } from '../../frontend/src/utils/osc-parser.ts';

// Test parseDirectOscAddress
console.log('Running test: parseDirectOscAddress fixture channel');
const fixtureRes = parseDirectOscAddress('/softdmx/fixture/Spot_1/channel/5');
assert.ok(fixtureRes);
assert.equal(fixtureRes.type, 'fixture_channel');
assert.equal(fixtureRes.fixtureName, 'Spot_1');
assert.equal(fixtureRes.channelIndex, 5);

console.log('Running test: parseDirectOscAddress group master');
const groupRes = parseDirectOscAddress('/softdmx/group/Backlight/master');
assert.ok(groupRes);
assert.equal(groupRes.type, 'group_master');
assert.equal(groupRes.groupName, 'Backlight');

console.log('Running test: parseDirectOscAddress cue go');
const cueRes = parseDirectOscAddress('/softdmx/cue/cue_intro_1/go');
assert.ok(cueRes);
assert.equal(cueRes.type, 'cue_trigger');
assert.equal(cueRes.cueId, 'cue_intro_1');
assert.equal(cueRes.action, 'go');

console.log('Running test: parseDirectOscAddress blackout');
const blackoutRes = parseDirectOscAddress('/softdmx/blackout');
assert.ok(blackoutRes);
assert.equal(blackoutRes.type, 'blackout');

console.log('Running test: parseDirectOscAddress invalid');
assert.equal(parseDirectOscAddress('/invalid/path'), null);
assert.equal(parseDirectOscAddress('/softdmx/invalid'), null);

// Test parseOscValue
console.log('Running test: parseOscValue floats');
assert.equal(parseOscValue(0.0), 0);
assert.equal(parseOscValue(0.5), 128); // 0.5 * 255 = 127.5 -> 128
assert.equal(parseOscValue(0.75), 191); // 0.75 * 255 = 191.25 -> 191
assert.equal(parseOscValue(0.99), 252); // 0.99 * 255 = 252.45 -> 252

console.log('Running test: parseOscValue integers');
assert.equal(parseOscValue(0), 0);
assert.equal(parseOscValue(1), 1); // Integer 1
assert.equal(parseOscValue(127), 127);
assert.equal(parseOscValue(255), 255);
assert.equal(parseOscValue(300), 255); // Caps at 255

console.log('All OSC parser tests passed successfully!');
