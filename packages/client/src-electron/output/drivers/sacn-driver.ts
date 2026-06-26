/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import dgram from "node:dgram";
import { randomBytes } from "node:crypto";
import { DmxOutputDriver } from "./dmx-output-driver";
import { initWasmEngine, type SoftDmxWasmExports } from "@softdmx/engine";

const ACN_PID = Buffer.from([
  0x41, 0x53, 0x43, 0x2d, 0x45, 0x31, 0x2e, 0x31, 0x37, 0x00, 0x00, 0x00,
]);

function pduFlagsAndLength(length: number): Buffer {
  return Buffer.from([0x70 | ((length >> 8) & 0x0f), length & 0xff]);
}

function getDefaultMulticastHost(universe: number): string {
  const uni = Math.max(1, Math.min(63999, universe));
  const high = (uni >> 8) & 0xff;
  const low = uni & 0xff;
  return `239.255.${high}.${low}`;
}

export class SacnDriver implements DmxOutputDriver {
  private socket?: dgram.Socket | undefined;
  private sequence = 0;
  private readonly cid = randomBytes(16);
  private wasmExports: SoftDmxWasmExports | null = null;
  private cachedWasmCidPtr = 0;
  private cachedWasmSourceNamePtr = 0;
  private cachedWasmSourceNameSize = 0;
  private cachedWasmDmxPtr = 0;
  private cachedWasmDmxSize = 0;
  private cachedWasmPacketPtr = 0;
  private cachedWasmPacketSize = 0;

  constructor(
    private config: {
      Host: string;
      Port: number;
      Universe: number;
      SourceName?: string;
    },
  ) {}

  async initialize(): Promise<void> {
    this.socket = dgram.createSocket("udp4");
    this.wasmExports = await initWasmEngine();
  }

  send(dmxBuffer: Uint8Array): void {
    if (!this.socket) return;

    const universe = Math.max(1, Math.min(63999, this.config.Universe || 1));
    const port = this.config.Port || 5568;
    const host = this.config.Host || getDefaultMulticastHost(universe);
    const sourceName = this.config.SourceName || "SoftDMX";

    if (this.wasmExports) {
      const wasm = this.wasmExports;

      // 1. Maintain cached CID in WASM
      if (!this.cachedWasmCidPtr) {
        this.cachedWasmCidPtr = wasm.alloc(16);
        const wasmCid = new Uint8Array(wasm.memory.buffer, this.cachedWasmCidPtr, 16);
        wasmCid.set(this.cid);
      }

      // 2. Maintain cached source name in WASM
      const sourceNameBytes = Buffer.from(sourceName, "utf8").subarray(0, 63);
      if (this.cachedWasmSourceNameSize < sourceNameBytes.length) {
        if (this.cachedWasmSourceNamePtr) {
          wasm.free(this.cachedWasmSourceNamePtr, this.cachedWasmSourceNameSize);
        }
        this.cachedWasmSourceNameSize = sourceNameBytes.length;
        this.cachedWasmSourceNamePtr = wasm.alloc(this.cachedWasmSourceNameSize);
      }
      const wasmSourceName = new Uint8Array(
        wasm.memory.buffer,
        this.cachedWasmSourceNamePtr,
        sourceNameBytes.length,
      );
      wasmSourceName.set(sourceNameBytes);

      // 3. Maintain cached DMX payload in WASM
      if (this.cachedWasmDmxSize < dmxBuffer.length) {
        if (this.cachedWasmDmxPtr) {
          wasm.free(this.cachedWasmDmxPtr, this.cachedWasmDmxSize);
        }
        this.cachedWasmDmxSize = dmxBuffer.length;
        this.cachedWasmDmxPtr = wasm.alloc(this.cachedWasmDmxSize);
      }
      const wasmDmxBuffer = new Uint8Array(
        wasm.memory.buffer,
        this.cachedWasmDmxPtr,
        dmxBuffer.length,
      );
      wasmDmxBuffer.set(dmxBuffer);

      // 4. Maintain cached packet buffer
      const packetSize = 126 + dmxBuffer.length;
      if (this.cachedWasmPacketSize < packetSize) {
        if (this.cachedWasmPacketPtr) {
          wasm.free(this.cachedWasmPacketPtr, this.cachedWasmPacketSize);
        }
        this.cachedWasmPacketSize = packetSize;
        this.cachedWasmPacketPtr = wasm.alloc(this.cachedWasmPacketSize);
      }

      // Pack packet inside WASM
      const totalLen = wasm.packSacnPacket(
        this.cachedWasmCidPtr,
        this.sequence,
        universe,
        this.cachedWasmSourceNamePtr,
        sourceNameBytes.length,
        this.cachedWasmDmxPtr,
        dmxBuffer.length,
        this.cachedWasmPacketPtr,
      );

      // Read packed bytes view directly from WASM memory
      const packedPacket = new Uint8Array(wasm.memory.buffer, this.cachedWasmPacketPtr, totalLen);

      this.socket.send(packedPacket, 0, totalLen, port, host, (err) => {
        if (err) {
          console.error("sACN WASM send error:", err);
        }
      });
    } else {
      // Pure JS fallback
      const dmxData = Buffer.alloc(513, 0);
      const source = Buffer.from(dmxBuffer.subarray(0, 512));
      source.copy(dmxData, 1);

      const propertyValueCount = dmxData.length;
      const dmpPduLength = 2 + 1 + 1 + 2 + 2 + 2 + propertyValueCount;
      const framingPduLength = 2 + 4 + 64 + 1 + 2 + 1 + 1 + 2 + dmpPduLength;
      const rootPduLength = 2 + 4 + 16 + framingPduLength;

      const rootLayer = Buffer.concat([
        pduFlagsAndLength(rootPduLength),
        Buffer.from([0x00, 0x00, 0x00, 0x04]),
        this.cid,
      ]);

      const sourceNameField = Buffer.alloc(64, 0);
      Buffer.from(sourceName, "utf8").subarray(0, 63).copy(sourceNameField);
      const framingLayer = Buffer.concat([
        pduFlagsAndLength(framingPduLength),
        Buffer.from([0x00, 0x00, 0x00, 0x02]),
        sourceNameField,
        Buffer.from([
          100, // Priority
          0x00,
          0x00, // Synchronization Address
          this.sequence & 0xff, // Sequence Number
          0x00, // Options
          (universe >> 8) & 0xff,
          universe & 0xff,
        ]),
      ]);

      const dmpLayer = Buffer.concat([
        pduFlagsAndLength(dmpPduLength),
        Buffer.from([
          0x02, // Set Property
          0xa1, // Address & data type
          0x00,
          0x00, // First property address
          0x00,
          0x01, // Address increment
          (propertyValueCount >> 8) & 0xff,
          propertyValueCount & 0xff,
        ]),
        dmxData,
      ]);

      const packet = Buffer.concat([
        Buffer.from([0x00, 0x10, 0x00, 0x00]),
        ACN_PID,
        rootLayer,
        framingLayer,
        dmpLayer,
      ]);

      this.socket.send(packet, 0, packet.length, port, host, (err) => {
        if (err) {
          console.error("sACN send error:", err);
        }
      });
    }

    this.sequence = (this.sequence + 1) % 256;
  }

  async destroy(): Promise<void> {
    if (this.socket) {
      this.socket.close();
      this.socket = undefined;
    }
    if (this.wasmExports) {
      const wasm = this.wasmExports;
      if (this.cachedWasmCidPtr) {
        wasm.free(this.cachedWasmCidPtr, 16);
        this.cachedWasmCidPtr = 0;
      }
      if (this.cachedWasmSourceNamePtr) {
        wasm.free(this.cachedWasmSourceNamePtr, this.cachedWasmSourceNameSize);
        this.cachedWasmSourceNamePtr = 0;
      }
      if (this.cachedWasmDmxPtr) {
        wasm.free(this.cachedWasmDmxPtr, this.cachedWasmDmxSize);
        this.cachedWasmDmxPtr = 0;
      }
      if (this.cachedWasmPacketPtr) {
        wasm.free(this.cachedWasmPacketPtr, this.cachedWasmPacketSize);
        this.cachedWasmPacketPtr = 0;
      }
      this.wasmExports = null;
    }
  }
}
