/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import * as flatbuffers from 'flatbuffers';
import { TestMessage } from '@softdmx/buffers';

console.log('Running test: FlatBuffers serialization and deserialization');

const builder = new flatbuffers.Builder(1024);

// Serialize
const nameOffset = builder.createString('FixtureController');
const valuesOffset = TestMessage.createValuesVector(builder, [1.0, 2.5, 3.14]);

TestMessage.startTestMessage(builder);
TestMessage.addId(builder, 42);
TestMessage.addName(builder, nameOffset);
TestMessage.addValues(builder, valuesOffset);
const messageOffset = TestMessage.endTestMessage(builder);
builder.finish(messageOffset);

const bytes = builder.asUint8Array();
assert.ok(bytes.length > 0, 'Buffer should have content');

// Deserialization
const buf = new flatbuffers.ByteBuffer(bytes);
const testMsg = TestMessage.getRootAsTestMessage(buf);

assert.equal(testMsg.id(), 42, 'ID should match');
assert.equal(testMsg.name(), 'FixtureController', 'Name should match');
assert.equal(testMsg.valuesLength(), 3, 'Values length should match');
assert.equal(testMsg.values(0), 1.0, 'First value should match');
assert.equal(testMsg.values(1), 2.5, 'Second value should match');
assert.equal(testMsg.values(2), 3.14, 'Third value should match');

console.log('FlatBuffers serialization/deserialization test passed.');
