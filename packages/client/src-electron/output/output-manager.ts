/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Worker } from "node:worker_threads";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ActiveChannel, ShowDocument } from "@softdmx/engine";
import { ConfigFile } from "../server/app-settings";
import { setHasGridnodeDestination } from "../windows/gridnode-overlay";
import { type UniverseHealthStatus } from "@softdmx/engine";
import { AppState } from "../state/main";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
// The output-worker.js file is compiled directly alongside main.js in dist-electron/
const workerPath = path.resolve(currentDir, "output-worker.js");

export class OutputManager {
  private worker: Worker;
  private healthStatuses: UniverseHealthStatus[] = [];
  private healthListeners = new Set<(statuses: UniverseHealthStatus[]) => void>();

  public initPromise: Promise<void>;

  constructor(private config: ConfigFile) {
    this.worker = new Worker(workerPath);

    this.worker.on("message", (msg) => {
      try {
        if (msg.type === "health-status") {
          this.healthStatuses = msg.statuses;
          this.emitHealth();
        } else if (msg.type === "gridnode-send") {
          if (AppState.io) {
            AppState.io.emit(`channels:update:${msg.destinationId}`, msg.buffer);
          }
        }
      } catch (err) {
        console.error("OutputManager received worker event handling error:", err);
      }
    });

    this.worker.on("error", (err) => {
      console.error("OutputManager worker thread encountered an error:", err);
    });

    this.worker.on("exit", (code) => {
      if (code !== 0) {
        console.error(`OutputManager worker thread exited with non-zero exit code: ${code}`);
      }
    });

    // Initialize destinations based on config
    this.initPromise = Promise.resolve();
    this.updateConfig(config);
  }

  async updateDestinations(destinations: ShowDocument["destinations"]): Promise<void> {
    this.worker.postMessage({
      type: "init",
      destinations,
    });

    const hasGridnode = destinations.some((d) => d.type === "gridnode");
    setHasGridnodeDestination(hasGridnode);
  }

  setShowfile(newShowfile: ShowDocument): void {
    this.worker.postMessage({
      type: "setShowfile",
      showfile: newShowfile,
    });

    const hasGridnode = newShowfile.destinations.some((d) => d.type === "gridnode");
    setHasGridnodeDestination(hasGridnode);
  }

  handleChannelUpdate(channels: ActiveChannel[]): void {
    this.worker.postMessage({
      type: "handleChannelUpdate",
      channels,
    });
  }

  onHealth(listener: (statuses: UniverseHealthStatus[]) => void) {
    this.healthListeners.add(listener);
    listener(this.getHealthStatuses());
    return () => this.healthListeners.delete(listener);
  }

  getHealthStatuses(): UniverseHealthStatus[] {
    return this.healthStatuses;
  }

  private emitHealth() {
    const statuses = this.getHealthStatuses();
    for (const listener of this.healthListeners) {
      listener(statuses);
    }
  }

  updateConfig(newConfig: ConfigFile): void {
    this.config = newConfig;
    this.worker.postMessage({
      type: "updateConfig",
      config: newConfig,
    });
  }

  async destroy(): Promise<void> {
    await this.worker.terminate();
  }
}
