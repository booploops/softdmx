/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  packArtDmxPacket,
  packEnttecProPacket,
  packSacnPacket,
} from "../../client/src-electron/output/drivers/protocol-packets.ts";

test("Art-Net ArtDmx header uses opcode 0x5000 and Net/SubUni", () => {
  const dmx = Uint8Array.from({ length: 4 }, (_, i) => i + 1);
  const packet = packArtDmxPacket({ sequence: 7, subUni: 0x12, net: 3, dmx });
  assert.equal(packet.subarray(0, 7).toString(), "Art-Net");
  assert.equal(packet[7], 0);
  assert.equal(packet[8], 0x00);
  assert.equal(packet[9], 0x50);
  assert.equal(packet[10], 0x00);
  assert.equal(packet[11], 0x0e);
  assert.equal(packet[12], 7);
  assert.equal(packet[14], 0x12);
  assert.equal(packet[15], 3);
  assert.equal(packet[16], 0);
  assert.equal(packet[17], 4);
  assert.deepEqual(Array.from(packet.subarray(18)), [1, 2, 3, 4]);
});

test("sACN packet includes ACN PID, priority, and start code", () => {
  const cid = Uint8Array.from({ length: 16 }, (_, i) => i);
  const dmx = Uint8Array.from([10, 20, 30]);
  const packet = packSacnPacket({
    cid,
    sourceName: "SoftDMX",
    priority: 150,
    sequence: 4,
    universe: 7,
    dmx,
    syncAddress: 0,
  });
  assert.equal(packet.subarray(4, 13).toString(), "ASC-E1.17");
  assert.equal(packet[108], 150);
  assert.equal(packet[packet.length - 4], 0);
  assert.deepEqual(Array.from(packet.subarray(-3)), [10, 20, 30]);
});

test("Enttec Pro packet uses label 6 and delimiters", () => {
  const dmx = Uint8Array.from([1, 2, 255]);
  const packet = packEnttecProPacket(dmx);
  assert.equal(packet[0], 0x7e);
  assert.equal(packet[1], 0x06);
  assert.equal(packet[4], 0x00);
  assert.equal(packet[packet.length - 1], 0xe7);
  assert.deepEqual(Array.from(packet.subarray(5, 8)), [1, 2, 255]);
});
