/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ActiveChannel, ShowDocument } from "src/types";
import { DmxOutputDriver } from "./drivers/dmx-output-driver";
import { GridNodeDriver } from "./drivers/gridnode-driver";
import { ArtNetDriver } from "./drivers/artnet-driver";
import { SacnDriver } from "./drivers/sacn-driver";
import { DmxUsbProDriver } from "./drivers/dmx-usb-pro-driver";
import { ConfigFile } from "../server/app-settings";
import { setHasGridnodeDestination } from "../windows/gridnode-overlay";
import { getFixtureDefinitionFromDisk } from "../fixture-lookup";
import type { UniverseHealthStatus } from "src/types/output-health";
import { createInitialHealth, updateHealthAfterSend } from "src/utils/output-health";

interface FixturePatch {
  destinationId: string;
  startChannel: number;
}

export class OutputManager {
  private drivers = new Map<string, DmxOutputDriver>();
  private dmxBuffers = new Map<string, Uint8Array>();
  private patches = new Map<string, FixturePatch>();
  private showfile?: ShowDocument;
  private healthByDestination = new Map<string, UniverseHealthStatus>();
  private healthListeners = new Set<(statuses: UniverseHealthStatus[]) => void>();

  public initPromise: Promise<void>;

  constructor(private config: ConfigFile) {
    this.initPromise = this.updateDestinations([]);
  }

  async updateDestinations(destinations: ShowDocument['destinations']): Promise<void> {
    for (const [id, driver] of this.drivers.entries()) {
      if (!destinations.some((d) => d.id === id)) {
        try {
          await driver.destroy();
        } catch (e) {
          console.error(`OutputManager: Failed to destroy driver ${id}:`, e);
        }
        this.drivers.delete(id);
        this.dmxBuffers.delete(id);
      }
    }

    for (const dest of destinations) {
      const existingDriver = this.drivers.get(dest.id);

      if (existingDriver) {
        try {
          await existingDriver.destroy();
        } catch (e) {
          console.error(`OutputManager: Failed to destroy existing driver ${dest.id}:`, e);
        }
      }

      let driver: DmxOutputDriver;
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
          });
          break;
        case "gridnode":
        default:
          driver = new GridNodeDriver(dest.id);
          break;
      }

      try {
        await driver.initialize();
        this.drivers.set(dest.id, driver);
        if (!this.dmxBuffers.has(dest.id)) {
          this.dmxBuffers.set(dest.id, new Uint8Array(512));
        }
        this.healthByDestination.set(
          dest.id,
          createInitialHealth(
            dest.id,
            dest.type === 'artnet' ? 'artnet' : dest.type === 'sacn' ? 'sacn' : dest.type === 'dmx_usb' ? 'dmx_usb' : 'gridnode',
            dest.settings.Universe ?? 0,
            dest.role === 'standby' ? 'standby' : 'primary'
          )
        );
        console.log(`OutputManager: Initialized driver for ${dest.id} (${dest.name})`);
      } catch (e) {
        console.error(`OutputManager: Failed to initialize driver for ${dest.id}:`, e);
      }
    }

    const hasGridnode = destinations.some((d) => d.type === "gridnode");
    setHasGridnodeDestination(hasGridnode);

    if (this.showfile) {
      this.recalculatePatches(this.showfile);
    }
  }

  setShowfile(newShowfile: ShowDocument): void {
    this.showfile = newShowfile;
    this.initPromise = this.updateDestinations(newShowfile.destinations);
    this.recalculatePatches(newShowfile);
  }

  private recalculatePatches(showfile: ShowDocument): void {
    this.patches.clear();

    const destinationIndices = new Map<string, number>();

    showfile.fixtures.forEach((fixture) => {
      const def = getFixtureDefinitionFromDisk(fixture.fixtureId);
      if (!def) return;

      const destId = fixture.outputDestinationId || "default-gridnode";
      const channelIndex = destinationIndices.get(destId) ?? 1;
      const startChannel = fixture.startingChannel ?? channelIndex;

      this.patches.set(fixture.name, {
        destinationId: destId,
        startChannel,
      });

      destinationIndices.set(destId, startChannel + def.channels.length);
    });

    console.log("OutputManager: Re-calculated fixture patches:", Array.from(this.patches.entries()));
  }

  handleChannelUpdate(channels: ActiveChannel[]): void {
    for (const buffer of this.dmxBuffers.values()) {
      buffer.fill(0);
    }

    for (const channel of channels) {
      if (!channel?.path) continue;

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

    for (const [id, driver] of this.drivers.entries()) {
      const buffer = this.dmxBuffers.get(id);
      if (buffer) {
        driver.send(buffer);
        const dest = this.showfile?.destinations.find((entry) => entry.id === id);
        const maxUsedChannel = this.getMaxUsedChannelForDestination(id);
        const overflow = maxUsedChannel > 512;
        const existing = this.healthByDestination.get(id);
        if (existing) {
          const nonZero = Array.from(buffer).filter((value) => value > 0).length;
          this.healthByDestination.set(
            id,
            updateHealthAfterSend(existing, nonZero, overflow)
          );
        }
      }
    }

    this.emitHealth();
  }

  onHealth(listener: (statuses: UniverseHealthStatus[]) => void) {
    this.healthListeners.add(listener);
    listener(this.getHealthStatuses());
    return () => this.healthListeners.delete(listener);
  }

  getHealthStatuses(): UniverseHealthStatus[] {
    return Array.from(this.healthByDestination.values());
  }

  private emitHealth() {
    const statuses = this.getHealthStatuses();
    for (const listener of this.healthListeners) {
      listener(statuses);
    }
  }

  private getMaxUsedChannelForDestination(destinationId: string): number {
    let max = 0;
    for (const [fixtureName, patch] of this.patches.entries()) {
      if (patch.destinationId !== destinationId) continue;
      const fixture = this.showfile?.fixtures.find((entry) => entry.name === fixtureName);
      if (!fixture) continue;
      const def = getFixtureDefinitionFromDisk(fixture.fixtureId);
      if (!def) continue;
      max = Math.max(max, patch.startChannel + def.channels.length - 1);
    }
    return max;
  }

  updateConfig(newConfig: ConfigFile): void {
    this.config = newConfig;
    const destinations = this.showfile?.destinations ?? [];
    this.initPromise = this.updateDestinations(destinations);
  }
}
