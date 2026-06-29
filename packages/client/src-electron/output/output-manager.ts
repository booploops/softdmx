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

export interface OutputFrameDebugSnapshot {
  destinationId: string;
  protocol: "artnet" | "sacn" | "dmx_usb" | "gridnode";
  emittedAtMs: number;
  firstChannels: number[];
  nonZeroChannels: Array<{ address: number; value: number }>;
  dmxUsbPacketPreview?: number[];
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
// The output-worker.js file is compiled directly alongside main.js in dist-electron/
const workerPath = path.resolve(currentDir, "output-worker.js");

export class OutputManager {
  private worker: Worker;
  private healthStatuses: UniverseHealthStatus[] = [];
  private healthListeners = new Set<(statuses: UniverseHealthStatus[]) => void>();
  private frameDebugByDestination = new Map<string, OutputFrameDebugSnapshot>();
  private frameDebugListeners = new Set<(snapshots: OutputFrameDebugSnapshot[]) => void>();
  private destroyPromise: Promise<void> | null = null;
  private destroyed = false;

  public initPromise: Promise<void>;

  constructor(private config: ConfigFile) {
    this.worker = new Worker(workerPath);

    this.worker.on("message", (msg) => {
      try {
        if (msg.type === "health-status") {
          this.healthStatuses = msg.statuses;
          this.emitHealth();
        } else if (msg.type === "frame-debug") {
          this.frameDebugByDestination.set(msg.snapshot.destinationId, msg.snapshot);
          this.emitFrameDebug();
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

  onFrameDebug(listener: (snapshots: OutputFrameDebugSnapshot[]) => void) {
    this.frameDebugListeners.add(listener);
    listener(this.getFrameDebugSnapshots());
    return () => this.frameDebugListeners.delete(listener);
  }

  getFrameDebugSnapshots(): OutputFrameDebugSnapshot[] {
    return Array.from(this.frameDebugByDestination.values());
  }

  private emitHealth() {
    const statuses = this.getHealthStatuses();
    for (const listener of this.healthListeners) {
      listener(statuses);
    }
  }

  private emitFrameDebug() {
    const snapshots = this.getFrameDebugSnapshots();
    for (const listener of this.frameDebugListeners) {
      listener(snapshots);
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
    if (this.destroyPromise) return this.destroyPromise;

    this.destroyPromise = (async () => {
      if (this.destroyed) return;

      try {
        await this.requestWorkerShutdown();
      } catch (err) {
        console.warn("OutputManager worker graceful shutdown timed out, forcing terminate:", err);
      }

      try {
        await this.worker.terminate();
      } catch (err) {
        console.warn("OutputManager worker terminate failed:", err);
      }

      this.destroyed = true;
      this.healthListeners.clear();
      this.frameDebugListeners.clear();
      this.frameDebugByDestination.clear();
    })();

    return this.destroyPromise;
  }

  private requestWorkerShutdown(timeoutMs = 1500): Promise<void> {
    if (this.destroyed) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        clearTimeout(timer);
        this.worker.off("message", onMessage);
        this.worker.off("exit", onExit);
      };

      const finishResolve = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };

      const finishReject = (reason: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(reason);
      };

      const onMessage = (msg: any) => {
        if (msg?.type === "shutdown-complete") {
          finishResolve();
        }
      };

      const onExit = () => {
        finishResolve();
      };

      const timer = setTimeout(() => {
        finishReject(new Error("Output worker did not acknowledge shutdown in time"));
      }, timeoutMs);

      this.worker.on("message", onMessage);
      this.worker.on("exit", onExit);

      try {
        this.worker.postMessage({ type: "shutdown" });
      } catch (err) {
        finishReject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }
}
