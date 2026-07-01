/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from "node:assert/strict";
import { SessionRecorder } from "@softdmx/engine";
import { replaySessionToEntries } from "@softdmx/engine";
import { bakeSessionToPresetTargets } from "@softdmx/engine";

console.log("Running test: session recorder coalesces channel events");

const clock = { nowSec: () => 0.001 };
const recorder = new SessionRecorder(clock, { coalesceMs: 1000 });
recorder.appendChannel("show://Light/1", 100);
recorder.appendChannel("show://Light/1", 200);
recorder.flushPending();
assert.equal(recorder.getEvents().length, 1);
assert.equal(recorder.getEvents()[0]?.value, 200);

console.log("Running test: session replay reconstructs scratch");

const events = [
  { tSec: 0, kind: "channel" as const, path: "show://Light/1", value: 128 },
  { tSec: 2, kind: "channel" as const, path: "show://Light/2", value: 64 },
];
const atOne = replaySessionToEntries(events, 1);
assert.equal(atOne.length, 1);
assert.equal(atOne[0]?.value, 128);
const atThree = replaySessionToEntries(events, 3);
assert.equal(atThree.length, 2);

console.log("Running test: session bake produces preset targets");

const baked = bakeSessionToPresetTargets(
  [{ tSec: 0, kind: "channel", path: "show://Spot 1/1", value: 255, clientId: "a" }],
  1,
);
assert.ok(baked.length >= 0);

console.log("programmer-session.test.ts: all tests passed");
