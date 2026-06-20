/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import dgram from "node:dgram";
import { DmxOutputDriver } from "./DmxOutputDriver";

export class ArtNetDriver implements DmxOutputDriver {
  private socket?: dgram.Socket | undefined;
  private sequence = 0;

  constructor(
    private config: {
      Host: string;
      Port: number;
      Universe: number;
      Net: number;
      Subnet: number;
    }
  ) {}

  async initialize(): Promise<void> {
    this.socket = dgram.createSocket("udp4");
  }

  send(dmxBuffer: Uint8Array): void {
    if (!this.socket) return;

    // SubUni byte contains subnet (4 bits) and universe (4 bits)
    const subUni = ((this.config.Subnet & 0x0f) << 4) | (this.config.Universe & 0x0f);
    // Net byte contains net (7 bits)
    const net = this.config.Net & 0x7f;

    const header = Buffer.from([
      0x41, 0x72, 0x74, 0x2d, 0x4e, 0x65, 0x74, 0x00, // ID: "Art-Net\0"
      0x00, 0x50, // OpCode: ArtDmx (0x5000, transmitted low byte first)
      0x00, 0x0e, // Protocol Version 14 (transmitted high byte first)
      this.sequence, // Sequence (0x01 to 0xFF, 0x00 to disable)
      0x00, // Physical port that sent the data
      subUni, // Subnet/Universe address
      net, // Net address
      (dmxBuffer.length >> 8) & 0xff, // Length high byte (Big-endian)
      dmxBuffer.length & 0xff, // Length low byte
    ]);

    const packet = Buffer.concat([header, dmxBuffer]);

    this.socket.send(
      packet,
      0,
      packet.length,
      this.config.Port,
      this.config.Host,
      (err) => {
        if (err) {
          console.error("Art-Net send error:", err);
        }
      }
    );

    // Sequence increments 1-255
    this.sequence = (this.sequence + 1) % 256 || 1;
  }

  async destroy(): Promise<void> {
    if (this.socket) {
      this.socket.close();
      this.socket = undefined;
    }
  }
}
