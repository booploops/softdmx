/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { parentPort } from "node:worker_threads";
import type { ActiveChannel, ShowDocument, UniverseHealthStatus } from "@softdmx/engine";
import { createInitialHealth, updateHealthAfterSend } from "@softdmx/engine";
import { resolveFixtureChannelsForMode } from "@softdmx/engine";
import { ArtNetDriver } from "./drivers/artnet-driver";
import { SacnDriver } from "./drivers/sacn-driver";
import { DmxUsbProDriver } from "./drivers/dmx-usb-pro-driver";
import { DmxOutputDriver } from "./drivers/dmx-output-driver";
import { getFixtureDefinitionFromDisk } from "../fixture-lookup";
import type { ConfigFile } from "../server/app-settings";

if (!parentPort) {
  throw new Error("This file must be run as a worker thread.");
}

interface FixturePatch {
  destinationId: string;
  startChannel: number;
}

interface OutputFrameDebugSnapshot {
  destinationId: string;
  protocol: "artnet" | "sacn" | "dmx_usb" | "gridnode";
  emittedAtMs: number;
  firstChannels: number[];
  nonZeroChannels: Array<{ address: number; value: number }>;
  dmxUsbPacketPreview?: number[];
}

class BackgroundOutputEngine {
  private drivers = new Map<string, DmxOutputDriver>();
  private driverSignatures = new Map<string, string>();
  private dmxBuffers = new Map<string, Uint8Array>();
  private patches = new Map<string, FixturePatch>();
  private showfile?: ShowDocument;
  private healthByDestination = new Map<string, UniverseHealthStatus>();
  private lastFrameDebugEmitByDestination = new Map<string, number>();
  private config?: ConfigFile;
  private destinationUpdateChain: Promise<void> = Promise.resolve();
  private isShuttingDown = false;

  constructor() {}

  async updateDestinations(destinations: ShowDocument["destinations"]): Promise<void> {
    if (this.isShuttingDown) return;
    this.destinationUpdateChain = this.destinationUpdateChain.then(() =>
      this.applyDestinations(destinations),
    );
    return this.destinationUpdateChain;
  }

  private getDestinationSignature(dest: ShowDocument["destinations"][number]): string {
    const settings = dest.settings ?? {};
    switch (dest.type) {
      case "artnet":
        return JSON.stringify({
          type: dest.type,
          Host: settings.Host || "255.255.255.255",
          Port: settings.Port || 6454,
          Universe: settings.Universe ?? 0,
          Net: settings.Net ?? 0,
          Subnet: settings.Subnet ?? 0,
        });
      case "sacn":
        return JSON.stringify({
          type: dest.type,
          Host: settings.Host || "",
          Port: settings.Port || 5568,
          Universe: settings.Universe ?? 1,
          SourceName: `SoftDMX-${dest.name}`,
        });
      case "dmx_usb":
        return JSON.stringify({
          type: dest.type,
          PortPath: settings.PortPath || "",
          UsbProtocol: settings.UsbProtocol || "enttec_pro",
        });
      case "gridnode":
      default:
        return JSON.stringify({ type: "gridnode" });
    }
  }

  private async applyDestinations(destinations: ShowDocument["destinations"]): Promise<void> {
    for (const [id, driver] of this.drivers.entries()) {
      if (!destinations.some((d) => d.id === id)) {
        try {
          await driver.destroy();
        } catch (e) {
          console.error(`OutputWorker: Failed to destroy driver ${id}:`, e);
        }
        this.drivers.delete(id);
        this.driverSignatures.delete(id);
        this.dmxBuffers.delete(id);
        this.healthByDestination.delete(id);
      }
    }

    for (const dest of destinations) {
      const existingDriver = this.drivers.get(dest.id);
      const nextSignature = this.getDestinationSignature(dest);
      const previousSignature = this.driverSignatures.get(dest.id);
      const shouldReuseDriver = existingDriver && previousSignature === nextSignature;

      let driver: DmxOutputDriver | null = null;
      if (!shouldReuseDriver) {
        if (existingDriver) {
          try {
            await existingDriver.destroy();
          } catch (e) {
            console.error(`OutputWorker: Failed to destroy existing driver ${dest.id}:`, e);
          }
          this.drivers.delete(dest.id);
        }

        switch (dest.type) {
          case "artnet":
            driver = new ArtNetDriver({
              Host: dest.settings.Host || "255.255.255.255",
              Port: dest.settings.Port || 6454,
              Universe: dest.settings.Universe ?? 0,
              Net: dest.settings.Net ?? 0,
              Subnet: dest.settings.Subnet ?? 0,
            });
            break;
          case "sacn":
            driver = new SacnDriver({
              Host: dest.settings.Host || "",
              Port: dest.settings.Port || 5568,
              Universe: dest.settings.Universe ?? 1,
              SourceName: `SoftDMX-${dest.name}`,
            });
            break;
          case "dmx_usb":
            driver = new DmxUsbProDriver({
              PortPath: dest.settings.PortPath || "",
              UsbProtocol: (dest.settings.UsbProtocol as "enttec_pro" | "open_dmx" | undefined) ?? "enttec_pro",
            });
            break;
          case "gridnode":
          default:
            // GridNode handles its emissions on the main thread via the proxy,
            // so we don't spin up a physical driver inside the worker.
            driver = null;
            break;
        }

        if (driver) {
          try {
            await driver.initialize();
            this.drivers.set(dest.id, driver);
            this.driverSignatures.set(dest.id, nextSignature);
          } catch (e) {
            this.driverSignatures.delete(dest.id);
            console.error(`OutputWorker: Failed to initialize driver for ${dest.id}:`, e);
          }
        } else {
          this.driverSignatures.set(dest.id, nextSignature);
        }
      }

      if (!this.dmxBuffers.has(dest.id)) {
        this.dmxBuffers.set(dest.id, new Uint8Array(512));
      }

      this.healthByDestination.set(
        dest.id,
        createInitialHealth(
          dest.id,
          dest.type === "artnet"
            ? "artnet"
            : dest.type === "sacn"
              ? "sacn"
              : dest.type === "dmx_usb"
                ? "dmx_usb"
                : "gridnode",
          dest.settings.Universe ?? 0,
          dest.role === "standby" ? "standby" : "primary",
        ),
      );
    }

    if (this.showfile) {
      this.recalculatePatches(this.showfile);
    }

    this.emitHealth();
  }

  setShowfile(newShowfile: ShowDocument): void {
    this.showfile = newShowfile;
    void this.updateDestinations(newShowfile.destinations);
  }

  private recalculatePatches(showfile: ShowDocument): void {
    this.patches.clear();
    const destinationIndices = new Map<string, number>();

    showfile.fixtures.forEach((fixture) => {
      const def = getFixtureDefinitionFromDisk(fixture.fixtureId);
      const modeChannels = def
        ? resolveFixtureChannelsForMode(def, fixture.modeId)
        : [];
      const channelCount = Math.max(1, modeChannels.length);

      const destId = fixture.outputDestinationId || "default-gridnode";
      const channelIndex = destinationIndices.get(destId) ?? 1;
      const startChannel = fixture.startingChannel ?? channelIndex;

      this.patches.set(fixture.name, {
        destinationId: destId,
        startChannel,
      });

      destinationIndices.set(destId, startChannel + channelCount);
    });
  }

  handleChannelUpdate(channels: ActiveChannel[]): void {
    if (this.isShuttingDown) return;
    for (const buffer of this.dmxBuffers.values()) {
      buffer.fill(0);
    }

    for (const channel of channels) {
      if (!channel) continue;

      // Prefer direct universe/id routing from merged output channels.
      if (
        channel.universe &&
        typeof channel.id === "number" &&
        channel.id >= 1 &&
        channel.id <= 512
      ) {
        const buffer = this.dmxBuffers.get(channel.universe);
        if (buffer) {
          buffer[channel.id - 1] = channel.value;
          continue;
        }
      }

      if (!channel.path) continue;

      const parts = channel.path.split("/");
      if (parts.length >= 4 && parts[0] === "show:") {
        const fixtureName = parts[2];
        const channelStr = parts[3];
        if (fixtureName && channelStr) {
          const channelIndexWithinFixture = parseInt(channelStr, 10) - 1;
          if (!isNaN(channelIndexWithinFixture)) {
            const patch = this.patches.get(fixtureName);
            if (patch) {
              const buffer = this.dmxBuffers.get(patch.destinationId);
              if (buffer) {
                const targetAddress = patch.startChannel + channelIndexWithinFixture;
                if (targetAddress >= 1 && targetAddress <= 512) {
                  buffer[targetAddress - 1] = channel.value;
                }
              }
            }
          }
        }
      } else {
        const fallbackDestId = channel.universe || "default-gridnode";
        const buffer = this.dmxBuffers.get(fallbackDestId);
        if (buffer && channel.id >= 1 && channel.id <= 512) {
          buffer[channel.id - 1] = channel.value;
        }
      }
    }

    for (const [id, buffer] of this.dmxBuffers.entries()) {
      const driver = this.drivers.get(id);
      if (driver) {
        driver.send(buffer);
      } else {
        // If there is no background driver (e.g. gridnode), post buffer back to main thread
        parentPort!.postMessage({
          type: "gridnode-send",
          destinationId: id,
          buffer: Array.from(buffer),
        });
      }

      const maxUsedChannel = this.getMaxUsedChannelForDestination(id);
      const overflow = maxUsedChannel > 512;
      const existing = this.healthByDestination.get(id);
      if (existing) {
        const nonZero = Array.from(buffer).filter((value) => value > 0).length;
        this.healthByDestination.set(id, updateHealthAfterSend(existing, nonZero, overflow));
        this.emitFrameDebugIfNeeded(id, buffer, existing.protocol);
      }
    }

    this.emitHealth();
  }

  private getMaxUsedChannelForDestination(destinationId: string): number {
    let max = 0;
    for (const [fixtureName, patch] of this.patches.entries()) {
      if (patch.destinationId !== destinationId) continue;
      const fixture = this.showfile?.fixtures.find((entry) => entry.name === fixtureName);
      if (!fixture) continue;
      const def = getFixtureDefinitionFromDisk(fixture.fixtureId);
      const modeChannels = def
        ? resolveFixtureChannelsForMode(def, fixture.modeId)
        : [];
      const channelCount = Math.max(1, modeChannels.length);
      max = Math.max(max, patch.startChannel + channelCount - 1);
    }
    return max;
  }

  private emitHealth() {
    const statuses = Array.from(this.healthByDestination.values());
    parentPort!.postMessage({
      type: "health-status",
      statuses,
    });
  }

  private emitFrameDebugIfNeeded(
    destinationId: string,
    buffer: Uint8Array,
    protocol: UniverseHealthStatus["protocol"],
  ) {
    const now = Date.now();
    const previous = this.lastFrameDebugEmitByDestination.get(destinationId) ?? 0;
    if (now - previous < 100) {
      return;
    }
    this.lastFrameDebugEmitByDestination.set(destinationId, now);

    const nonZeroChannels: Array<{ address: number; value: number }> = [];
    for (let index = 0; index < buffer.length; index += 1) {
      const value = buffer[index] ?? 0;
      if (value > 0) {
        nonZeroChannels.push({ address: index + 1, value });
        if (nonZeroChannels.length >= 24) break;
      }
    }

    const snapshot: OutputFrameDebugSnapshot = {
      destinationId,
      protocol,
      emittedAtMs: now,
      firstChannels: Array.from(buffer.slice(0, 64)),
      nonZeroChannels,
    };

    if (protocol === "dmx_usb") {
      const dataLength = buffer.length + 1;
      const packet = new Uint8Array(dataLength + 5);
      packet[0] = 0x7e;
      packet[1] = 0x06;
      packet[2] = dataLength & 0xff;
      packet[3] = (dataLength >> 8) & 0xff;
      packet[4] = 0x00;
      packet.set(buffer, 5);
      packet[packet.length - 1] = 0xe7;
      snapshot.dmxUsbPacketPreview = Array.from(packet.slice(0, 48));
    }

    parentPort!.postMessage({
      type: "frame-debug",
      snapshot,
    });
  }

  updateConfig(newConfig: ConfigFile): void {
    if (this.isShuttingDown) return;
    this.config = newConfig;
    if (this.showfile) {
      void this.updateDestinations(this.showfile.destinations);
    }
  }

  async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    try {
      await this.destinationUpdateChain;
    } catch (err) {
      console.error("OutputWorker destination update chain failed during shutdown:", err);
    }

    for (const [id, driver] of this.drivers.entries()) {
      try {
        await driver.destroy();
      } catch (err) {
        console.error(`OutputWorker failed to destroy driver ${id} during shutdown:`, err);
      }
    }

    this.drivers.clear();
    this.driverSignatures.clear();
    this.dmxBuffers.clear();
    this.patches.clear();
    this.healthByDestination.clear();
  }
}

const engine = new BackgroundOutputEngine();

parentPort.on("message", (msg) => {
  try {
    switch (msg.type) {
      case "init":
        void engine.updateDestinations(msg.destinations);
        break;
      case "setShowfile":
        engine.setShowfile(msg.showfile);
        break;
      case "handleChannelUpdate":
        engine.handleChannelUpdate(msg.channels);
        break;
      case "updateConfig":
        engine.updateConfig(msg.config);
        break;
      case "shutdown":
        void engine.shutdown().finally(() => {
          parentPort!.postMessage({ type: "shutdown-complete" });
        });
        break;
    }
  } catch (err) {
    console.error("OutputWorker received unhandled execution error:", err);
  }
});
