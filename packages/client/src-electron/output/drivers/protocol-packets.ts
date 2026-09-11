/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const ACN_PID = Buffer.from([
  0x41, 0x53, 0x43, 0x2d, 0x45, 0x31, 0x2e, 0x31, 0x37, 0x00, 0x00, 0x00,
]);

function pduFlagsAndLength(length: number): Buffer {
  return Buffer.from([0x70 | ((length >> 8) & 0x0f), length & 0xff]);
}

export function packArtDmxPacket(options: {
  sequence: number;
  subUni: number;
  net: number;
  dmx: Uint8Array;
}): Buffer {
  const header = Buffer.from([
    0x41, 0x72, 0x74, 0x2d, 0x4e, 0x65, 0x74, 0x00,
    0x00, 0x50,
    0x00, 0x0e,
    options.sequence & 0xff,
    0x00,
    options.subUni & 0xff,
    options.net & 0xff,
    (options.dmx.length >> 8) & 0xff,
    options.dmx.length & 0xff,
  ]);
  return Buffer.concat([header, Buffer.from(options.dmx)]);
}

export function packSacnPacket(options: {
  cid: Uint8Array;
  sourceName: string;
  priority: number;
  sequence: number;
  universe: number;
  dmx: Uint8Array;
  syncAddress?: number;
}): Buffer {
  const dmxData = Buffer.concat([Buffer.from([0x00]), Buffer.from(options.dmx)]);
  const propertyValueCount = dmxData.length;
  const dmpPduLength = 2 + 1 + 1 + 2 + 2 + 2 + propertyValueCount;
  const framingPduLength = 2 + 4 + 64 + 1 + 2 + 1 + 1 + 2 + dmpPduLength;
  const rootPduLength = 2 + 4 + 16 + framingPduLength;
  const sync = options.syncAddress ?? 0;

  const sourceNameField = Buffer.alloc(64, 0);
  Buffer.from(options.sourceName, "utf8").subarray(0, 63).copy(sourceNameField);

  const rootLayer = Buffer.concat([
    pduFlagsAndLength(rootPduLength),
    Buffer.from([0x00, 0x00, 0x00, 0x04]),
    Buffer.from(options.cid),
  ]);

  const framingLayer = Buffer.concat([
    pduFlagsAndLength(framingPduLength),
    Buffer.from([0x00, 0x00, 0x00, 0x02]),
    sourceNameField,
    Buffer.from([
      Math.max(0, Math.min(200, options.priority)),
      (sync >> 8) & 0xff,
      sync & 0xff,
      options.sequence & 0xff,
      0x00,
      (options.universe >> 8) & 0xff,
      options.universe & 0xff,
    ]),
  ]);

  const dmpLayer = Buffer.concat([
    pduFlagsAndLength(dmpPduLength),
    Buffer.from([
      0x02, 0xa1, 0x00, 0x00, 0x00, 0x01,
      (propertyValueCount >> 8) & 0xff,
      propertyValueCount & 0xff,
    ]),
    dmxData,
  ]);

  return Buffer.concat([
    Buffer.from([0x00, 0x10, 0x00, 0x00]),
    ACN_PID,
    rootLayer,
    framingLayer,
    dmpLayer,
  ]);
}

export function packEnttecProPacket(dmx: Uint8Array): Buffer {
  const dataLength = dmx.length + 1;
  const packet = Buffer.alloc(dataLength + 5);
  packet[0] = 0x7e;
  packet[1] = 0x06;
  packet[2] = dataLength & 0xff;
  packet[3] = (dataLength >> 8) & 0xff;
  packet[4] = 0x00;
  Buffer.from(dmx).copy(packet, 5);
  packet[packet.length - 1] = 0xe7;
  return packet;
}
