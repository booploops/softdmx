/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { SerialPort } from "serialport";
import { DmxOutputDriver } from "./DmxOutputDriver";

export class DmxUsbProDriver implements DmxOutputDriver {
  private port?: SerialPort | undefined;
  private isOpening = false;

  constructor(
    private config: {
      PortPath: string;
    }
  ) {}

  async initialize(): Promise<void> {
    if (!this.config.PortPath) {
      console.warn("DmxUsbProDriver: No PortPath specified in configuration.");
      return;
    }

    this.isOpening = true;
    return new Promise<void>((resolve, reject) => {
      try {
        // Instantiate without a constructor callback as autoOpen is false.
        this.port = new SerialPort({
          path: this.config.PortPath,
          baudRate: 57600,
          autoOpen: false,
        });

        // Open explicitly to handle connection results and resolve/reject the promise.
        this.port.open((openErr) => {
          this.isOpening = false;
          if (openErr) {
            console.error(`DmxUsbProDriver: Failed to open SerialPort on ${this.config.PortPath}:`, openErr);
            reject(openErr);
          } else {
            console.log(`DmxUsbProDriver: Successfully opened port ${this.config.PortPath}`);
            resolve();
          }
        });
      } catch (err) {
        this.isOpening = false;
        console.error(`DmxUsbProDriver: Failed to create SerialPort for ${this.config.PortPath}:`, err);
        reject(err);
      }
    });
  }

  send(dmxBuffer: Uint8Array): void {
    if (!this.port || !this.port.isOpen) return;

    // DMX USB Pro packet layout:
    // 0x7E - Start delimiter
    // 0x06 - Label 6 (Send DMX Packet Request)
    // LSB of length
    // MSB of length
    // 0x00 - DMX Start code (usually 0)
    // ...DMX data bytes...
    // 0xE7 - End delimiter
    const dataLength = dmxBuffer.length + 1; // +1 for the DMX start code byte
    const packet = Buffer.alloc(dataLength + 5); // 5 bytes for overhead: 0x7E, 0x06, length LSB, length MSB, and 0xE7 end delimiter

    packet[0] = 0x7e; // Start delimiter
    packet[1] = 0x06; // Label 6 (output only send dmx)
    packet[2] = dataLength & 0xff; // Length LSB
    packet[3] = (dataLength >> 8) & 0xff; // Length MSB
    packet[4] = 0x00; // DMX Start Code

    // Copy DMX data channels
    Buffer.from(dmxBuffer).copy(packet, 5);

    // End delimiter
    packet[packet.length - 1] = 0xe7;

    this.port.write(packet, (err) => {
      if (err) {
        console.error("DmxUsbProDriver write error:", err);
      }
    });
  }

  async destroy(): Promise<void> {
    if (this.port && this.port.isOpen) {
      return new Promise<void>((resolve) => {
        this.port!.close(() => {
          console.log(`DmxUsbProDriver: Closed port ${this.config.PortPath}`);
          this.port = undefined;
          resolve();
        });
      });
    }
    this.port = undefined;
  }

  static async listPorts(): Promise<any[]> {
    try {
      return await SerialPort.list();
    } catch (err) {
      console.error("DmxUsbProDriver: Failed to list serial ports:", err);
      return [];
    }
  }
}
