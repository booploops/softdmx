/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { randomUUID } from "node:crypto";
import {
  clientLayersToSingleEntries,
  inferAttributeFeature,
  mergeClientScratchLayers,
  type ClientIdentity,
  type ConflictResolutionMode,
  type ScratchChannelUpdate,
  type ScratchClientLayer,
  type ScratchCommand,
  type ScratchCommandAck,
  type ScratchConflict,
  type ScratchEntry,
} from "@softdmx/engine";

export interface ScratchStateSnapshot {
  seq: number;
  layers: ScratchClientLayer[];
  conflicts: ScratchConflict[];
  merged: ScratchEntry[];
}

type ScratchSetPayload =
  | { path: string; value: number; attributeType?: string; clientId?: string }
  | { channels: ScratchChannelUpdate[]; clientId?: string };

export class ScratchAuthority {
  private readonly clientLayers = new Map<string, Map<string, ScratchEntry>>();
  private readonly clients = new Map<string, ClientIdentity>();
  private seq = 0;

  constructor(private readonly resolveConflictMode: () => ConflictResolutionMode = () => "attribute-merge") {}

  registerClient(identity: Partial<ClientIdentity> = {}): ClientIdentity {
    const clientId = identity.clientId ?? randomUUID();
    const client: ClientIdentity = {
      clientId,
      operatorLabel: identity.operatorLabel,
      color: identity.color,
      priority: identity.priority,
    };
    this.clients.set(clientId, client);
    if (!this.clientLayers.has(clientId)) {
      this.clientLayers.set(clientId, new Map());
    }
    return client;
  }

  unregisterClient(clientId: string) {
    this.clients.delete(clientId);
    this.clientLayers.delete(clientId);
  }

  getClient(clientId: string): ClientIdentity | undefined {
    return this.clients.get(clientId);
  }

  listClients(): ClientIdentity[] {
    return Array.from(this.clients.values());
  }

  apply(command: ScratchCommand): ScratchCommandAck {
    const clientId = command.clientId ?? "server";
    
    if (command.kind !== "clear" || command.clientId) {
      this.ensureClient(clientId);
    }
    
    this.seq += 1;
    const seq = this.seq;
    const layer = this.clientLayers.get(clientId);

    switch (command.kind) {
      case "set": {
        layer?.set(command.path, this.buildEntry(command.path, command.value, command.attributeType ?? "generic", {
          clientId,
          seq,
          meta: command.meta,
        }));
        break;
      }
      case "set-channels": {
        for (const channel of command.channels) {
          layer?.set(
            channel.path,
            this.buildEntry(channel.path, channel.value, channel.attributeType ?? "generic", {
              clientId,
              seq,
              attributeName: channel.attributeName,
              feature: channel.feature,
              meta: channel.meta,
            }),
          );
        }
        break;
      }
      case "clear": {
        if (command.clientId) {
          layer?.clear();
        } else {
          for (const entries of this.clientLayers.values()) {
            entries.clear();
          }
        }
        break;
      }
      case "clear-client": {
        layer?.clear();
        break;
      }
      default:
        break;
    }

    return { seq, clientId: command.clientId ?? clientId, appliedAt: Date.now() };
  }

  applySetPayload(clientId: string, payload: ScratchSetPayload): ScratchCommandAck {
    if ("channels" in payload && Array.isArray(payload.channels)) {
      return this.apply({
        kind: "set-channels",
        clientId,
        channels: payload.channels,
      });
    }

    if ("path" in payload) {
      return this.apply({
        kind: "set",
        clientId,
        path: payload.path,
        value: payload.value,
        attributeType: payload.attributeType,
      });
    }

    return { seq: this.seq, clientId, appliedAt: Date.now() };
  }

  clear(clientId?: string): ScratchCommandAck {
    if (clientId) {
      return this.apply({ kind: "clear-client", clientId });
    }
    return this.apply({ kind: "clear", clientId: "server" });
  }

  getLayers(): ScratchClientLayer[] {
    const layers: ScratchClientLayer[] = [];
    for (const [clientId, entries] of this.clientLayers) {
      const client = this.clients.get(clientId);
      const list = Array.from(entries.values());
      layers.push({
        clientId,
        operatorLabel: client?.operatorLabel,
        color: client?.color,
        priority: client?.priority,
        entries: list,
        lastSeq: list.reduce((max, entry) => Math.max(max, entry.seq ?? 0), 0) || undefined,
      });
    }
    return layers;
  }

  getSnapshot(): ScratchStateSnapshot {
    const layers = this.getLayers();
    const mode = this.resolveConflictMode();
    const { conflicts } = mergeClientScratchLayers(layers, mode);
    return {
      seq: this.seq,
      layers,
      conflicts,
      merged: clientLayersToSingleEntries(layers),
    };
  }

  private ensureClient(clientId: string) {
    if (!this.clients.has(clientId)) {
      this.registerClient({ clientId });
    }
    if (!this.clientLayers.has(clientId)) {
      this.clientLayers.set(clientId, new Map());
    }
  }

  private buildEntry(
    path: string,
    value: number,
    attributeType: string,
    options: {
      clientId: string;
      seq: number;
      attributeName?: string;
      feature?: ScratchEntry["feature"];
      meta?: ScratchEntry["meta"];
    },
  ): ScratchEntry {
    const attributeName = options.attributeName ?? path.split("/").pop();
    return {
      path,
      value,
      attributeType,
      attributeName,
      feature: options.feature ?? inferAttributeFeature(attributeType, attributeName ?? path),
      touchedAt: Date.now(),
      clientId: options.clientId,
      seq: options.seq,
      meta: options.meta,
    };
  }
}
