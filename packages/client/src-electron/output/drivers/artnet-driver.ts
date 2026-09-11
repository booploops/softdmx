/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import dgram from "node:dgram";
import { DmxOutputDriver } from "./dmx-output-driver";
import { initWasmEngine, type SoftDmxWasmExports } from "@softdmx/engine";
import { packArtDmxPacket } from "./protocol-packets";

export class ArtNetDriver implements DmxOutputDriver {
  private socket?: dgram.Socket | undefined;
  private sequence = 0;
  private lastBuffer = new Uint8Array(512);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private wasmExports: SoftDmxWasmExports | null = null;
  private cachedWasmDmxPtr = 0;
  private cachedWasmDmxSize = 0;
  private cachedWasmPacketPtr = 0;
  private cachedWasmPacketSize = 0;

  constructor(
    private config: {
      Host: string;
      Port: number;
      Universe: number;
      Net: number;
      Subnet: number;
    },
  ) {}

  async initialize(): Promise<void> {
    this.socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
    await new Promise<void>((resolve, reject) => {
      this.socket!.once("error", reject);
      this.socket!.bind(0, () => {
        try {
          this.socket!.setBroadcast(true);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
    this.wasmExports = await initWasmEngine();
    this.refreshTimer = setInterval(() => {
      this.send(this.lastBuffer);
    }, 25);
  }

  send(dmxBuffer: Uint8Array): void {
    if (!this.socket) return;
    this.lastBuffer = dmxBuffer;

    // SubUni byte contains subnet (4 bits) and universe (4 bits)
    const subUni = ((this.config.Subnet & 0x0f) << 4) | (this.config.Universe & 0x0f);
    // Net byte contains net (7 bits)
    const net = this.config.Net & 0x7f;

    if (this.wasmExports) {
      const wasm = this.wasmExports;

      // 1. Maintain cached DMX buffer in WASM memory
      if (this.cachedWasmDmxSize < dmxBuffer.length) {
        if (this.cachedWasmDmxPtr) {
          wasm.free(this.cachedWasmDmxPtr, this.cachedWasmDmxSize);
        }
        this.cachedWasmDmxSize = dmxBuffer.length;
        this.cachedWasmDmxPtr = wasm.alloc(this.cachedWasmDmxSize);
      }

      // Write DMX data to WASM memory
      const wasmDmxBuffer = new Uint8Array(
        wasm.memory.buffer,
        this.cachedWasmDmxPtr,
        dmxBuffer.length,
      );
      wasmDmxBuffer.set(dmxBuffer);

      // 2. Maintain cached packet buffer in WASM memory (header is 18 bytes)
      const packetSize = 18 + dmxBuffer.length;
      if (this.cachedWasmPacketSize < packetSize) {
        if (this.cachedWasmPacketPtr) {
          wasm.free(this.cachedWasmPacketPtr, this.cachedWasmPacketSize);
        }
        this.cachedWasmPacketSize = packetSize;
        this.cachedWasmPacketPtr = wasm.alloc(this.cachedWasmPacketSize);
      }

      // Pack packet inside WASM
      const totalLen = wasm.packArtNetPacket(
        this.sequence,
        subUni,
        net,
        this.cachedWasmDmxPtr,
        dmxBuffer.length,
        this.cachedWasmPacketPtr,
      );

      // Read packed bytes view directly from WASM memory
      const packedPacket = new Uint8Array(wasm.memory.buffer, this.cachedWasmPacketPtr, totalLen);

      this.socket.send(packedPacket, 0, totalLen, this.config.Port, this.config.Host, (err) => {
        if (err) {
          console.error("Art-Net WASM send error:", err);
        }
      });
    } else {
      // Pure JS fallback
      const packet = packArtDmxPacket({
        sequence: this.sequence,
        subUni,
        net,
        dmx: dmxBuffer,
      });

      this.socket.send(packet, 0, packet.length, this.config.Port, this.config.Host, (err) => {
        if (err) {
          console.error("Art-Net send error:", err);
        }
      });
    }

    // Sequence increments 1-255
    this.sequence = (this.sequence + 1) % 256 || 1;
  }

  async destroy(): Promise<void> {
    if (this.refreshTimer !== null) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = undefined;
    }
    if (this.wasmExports) {
      const wasm = this.wasmExports;
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
