/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from "node:assert/strict";
import { mergeClientScratchLayers } from "@softdmx/engine";

console.log("Running test: HTP merge for dimmer scratch layers");

const result = mergeClientScratchLayers(
  [
    {
      clientId: "a",
      entries: [
        { path: "show://L/1", value: 100, attributeType: "intensity", touchedAt: 1 },
      ],
    },
    {
      clientId: "b",
      entries: [
        { path: "show://L/1", value: 200, attributeType: "intensity", touchedAt: 2 },
      ],
    },
  ],
  "attribute-merge",
);

assert.equal(result.layer.channels.get("show://L/1")?.value, 200);
assert.ok(result.conflicts.length >= 1);

console.log("Running test: LTP merge for position uses latest seq");

const ltp = mergeClientScratchLayers(
  [
    {
      clientId: "a",
      entries: [
        { path: "show://L/2", value: 50, attributeType: "pan", touchedAt: 1, seq: 1 },
      ],
    },
    {
      clientId: "b",
      entries: [
        { path: "show://L/2", value: 150, attributeType: "pan", touchedAt: 2, seq: 5 },
      ],
    },
  ],
  "attribute-merge",
);

assert.equal(ltp.layer.channels.get("show://L/2")?.value, 150);

console.log("multi-scratch-merge.test.ts: all tests passed");
