/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { SerialPort } from "serialport";
import { DmxOutputDriver } from "./dmx-output-driver";

export class DmxUsbProDriver implements DmxOutputDriver {
  private port?: SerialPort | undefined;
  private isOpening = false;
  private isWriting = false;
  private isDestroying = false;
  private pendingPacket: Buffer | null = null;
  private lastPacket: Buffer | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private lastWriteAt = 0;
  private readonly minWriteIntervalMs = 25;
  private readonly refreshIntervalMs = 25;

  constructor(
    private config: {
      PortPath: string;
      UsbProtocol?: "enttec_pro" | "open_dmx";
    },
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
          baudRate: this.config.UsbProtocol === "open_dmx" ? 250000 : 57600,
          dataBits: 8,
          stopBits: this.config.UsbProtocol === "open_dmx" ? 2 : 1,
          parity: "none",
          autoOpen: false,
        });

        // Open explicitly to handle connection results and resolve/reject the promise.
        this.port.open((openErr) => {
          this.isOpening = false;
          if (openErr) {
            console.error(
              `DmxUsbProDriver: Failed to open SerialPort on ${this.config.PortPath}:`,
              openErr,
            );
            reject(openErr);
          } else {
            console.log(`DmxUsbProDriver: Successfully opened port ${this.config.PortPath}`);
            this.startRefreshLoop();
            resolve();
          }
        });
      } catch (err) {
        this.isOpening = false;
        console.error(
          `DmxUsbProDriver: Failed to create SerialPort for ${this.config.PortPath}:`,
          err,
        );
        reject(err);
      }
    });
  }

  send(dmxBuffer: Uint8Array): void {
    if (!this.port || !this.port.isOpen || this.isDestroying) return;
    const packet = this.buildPacket(dmxBuffer);

    // Keep only the freshest frame when updates arrive faster than the serial link.
    this.lastPacket = packet;
    this.pendingPacket = packet;
    this.scheduleFlush();
  }

  private buildPacket(dmxBuffer: Uint8Array): Buffer {
    if (this.config.UsbProtocol === "open_dmx") {
      // OpenDMX frame is raw start code + 512 channel bytes.
      const frame = Buffer.alloc(513);
      frame[0] = 0x00;
      Buffer.from(dmxBuffer).copy(frame, 1);
      return frame;
    }

    // DMX USB Pro packet layout:
    // 0x7E - Start delimiter
    // 0x06 - Label 6 (Send DMX Packet Request)
    // LSB of length
    // MSB of length
    // 0x00 - DMX Start code (usually 0)
    // ...DMX data bytes...
    // 0xE7 - End delimiter
    const dataLength = dmxBuffer.length + 1;
    const packet = Buffer.alloc(dataLength + 5);
    packet[0] = 0x7e;
    packet[1] = 0x06;
    packet[2] = dataLength & 0xff;
    packet[3] = (dataLength >> 8) & 0xff;
    packet[4] = 0x00;
    Buffer.from(dmxBuffer).copy(packet, 5);
    packet[packet.length - 1] = 0xe7;
    return packet;
  }

  private startRefreshLoop(): void {
    if (this.refreshTimer !== null) return;
    this.refreshTimer = setInterval(() => {
      if (this.isDestroying) return;
      if (!this.port || !this.port.isOpen) return;
      if (!this.lastPacket) return;

      // Keep transmitting latest frame so fixtures that require a continuous DMX stream stay synced.
      this.pendingPacket = this.lastPacket;
      this.scheduleFlush();
    }, this.refreshIntervalMs);
  }

  private scheduleFlush(delayMs = 0): void {
    if (this.flushTimer !== null || this.isDestroying) {
      return;
    }

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flushPending();
    }, delayMs);
  }

  private flushPending(): void {
    if (this.isDestroying || this.isWriting) return;
    if (!this.port || !this.port.isOpen) return;
    if (!this.pendingPacket) return;

    const elapsed = Date.now() - this.lastWriteAt;
    if (elapsed < this.minWriteIntervalMs) {
      this.scheduleFlush(this.minWriteIntervalMs - elapsed);
      return;
    }

    const packet = this.pendingPacket;
    this.pendingPacket = null;
    this.isWriting = true;

    try {
      const finalizeWrite = () => {
        this.lastWriteAt = Date.now();
        this.isWriting = false;
        if (this.pendingPacket && !this.isDestroying) {
          this.scheduleFlush();
        }
      };

      if (this.config.UsbProtocol === "open_dmx") {
        this.port.set({ brk: true }, (breakErr) => {
          if (breakErr) {
            console.error("DmxUsbProDriver OpenDMX break-on error:", breakErr);
          }

          setTimeout(() => {
            this.port?.set({ brk: false }, (mabErr) => {
              if (mabErr) {
                console.error("DmxUsbProDriver OpenDMX break-off error:", mabErr);
              }

              this.port?.write(packet, (writeErr) => {
                if (writeErr) {
                  console.error("DmxUsbProDriver OpenDMX write error:", writeErr);
                }

                this.port?.drain((drainErr) => {
                  if (drainErr) {
                    console.error("DmxUsbProDriver OpenDMX drain error:", drainErr);
                  }
                  finalizeWrite();
                });
              });
            });
          }, 1);
        });
        return;
      }

      this.port.write(packet, (writeErr) => {
        if (writeErr) {
          console.error("DmxUsbProDriver write error:", writeErr);
        }

        // Drain ensures we do not overlap serial writes in the native binding.
        this.port?.drain((drainErr) => {
          if (drainErr) {
            console.error("DmxUsbProDriver drain error:", drainErr);
          }
          finalizeWrite();
        });
      });
    } catch (err) {
      console.error("DmxUsbProDriver write threw:", err);
      this.isWriting = false;
      this.lastWriteAt = Date.now();
      if (this.pendingPacket && !this.isDestroying) {
        this.scheduleFlush(this.minWriteIntervalMs);
      }
    }
  }

  async destroy(): Promise<void> {
    this.isDestroying = true;
    this.pendingPacket = null;
    this.lastPacket = null;
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.refreshTimer !== null) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    if (this.port && this.port.isOpen) {
      return new Promise<void>((resolve) => {
        this.port!.close(() => {
          console.log(`DmxUsbProDriver: Closed port ${this.config.PortPath}`);
          this.port = undefined;
          this.isWriting = false;
          resolve();
        });
      });
    }
    this.port = undefined;
    this.isWriting = false;
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
