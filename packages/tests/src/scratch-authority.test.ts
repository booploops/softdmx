/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from "node:assert/strict";
import { ScratchAuthority } from "../../client/src-electron/server/scratch-authority.ts";

console.log("Running test: scratch authority assigns monotonic seq");

const authority = new ScratchAuthority();
const clientA = authority.registerClient({ clientId: "a", operatorLabel: "Op A" });
const clientB = authority.registerClient({ clientId: "b", operatorLabel: "Op B" });

const ack1 = authority.apply({
  kind: "set",
  clientId: clientA.clientId,
  path: "show://Light/1",
  value: 100,
  attributeType: "intensity",
});
const ack2 = authority.apply({
  kind: "set",
  clientId: clientB.clientId,
  path: "show://Light/1",
  value: 200,
  attributeType: "intensity",
});

assert.ok(ack2.seq > ack1.seq);

console.log("Running test: scratch authority merges layers and detects conflicts");

const snapshot = authority.getSnapshot();
assert.equal(snapshot.layers.length, 2);
assert.equal(snapshot.merged.length, 1);
assert.ok(snapshot.conflicts.length >= 1);
assert.equal(snapshot.merged[0]?.value, 200);

console.log("Running test: scratch authority clear-client removes one layer");

authority.clear(clientA.clientId);
const afterClear = authority.getSnapshot();
assert.equal(afterClear.layers.find((layer) => layer.clientId === clientA.clientId)?.entries.length ?? 0, 0);
assert.equal(afterClear.merged[0]?.value, 200);

console.log("Running test: scratch authority applySetPayload handles channel batches");

authority.applySetPayload("a", {
  channels: [
    { path: "show://Light/2", value: 64, attributeType: "intensity" },
    { path: "show://Light/3", value: 32, attributeType: "intensity" },
  ],
});
const batchSnapshot = authority.getSnapshot();
const layerA = batchSnapshot.layers.find((layer) => layer.clientId === "a");
assert.equal(layerA?.entries.length, 2);

console.log("scratch-authority.test.ts: all tests passed");
