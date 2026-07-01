/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ScratchEntry } from "../core/layers/scratch.ts";
import type { LayerContribution } from "../core/types.ts";
import type { ScratchWriteMeta } from "./programmer.ts";

export type ConflictResolutionMode = "attribute-merge" | "last-writer" | "operator-priority";

export interface ClientIdentity {
  clientId: string;
  operatorLabel?: string;
  color?: string;
  priority?: number;
}

export interface ScratchClientLayer {
  clientId: string;
  operatorLabel?: string;
  color?: string;
  priority?: number;
  entries: ScratchEntry[];
  lastSeq?: number;
}

export interface ScratchChannelUpdate {
  path: string;
  value: number;
  attributeType?: string;
  attributeName?: string;
  attributeId?: string;
  feature?: ScratchEntry["feature"];
  meta?: ScratchWriteMeta;
}

export type ScratchCommand =
  | {
      kind: "set";
      clientId: string;
      path: string;
      value: number;
      attributeType?: string;
      meta?: ScratchWriteMeta;
    }
  | {
      kind: "set-channels";
      clientId: string;
      channels: ScratchChannelUpdate[];
    }
  | { kind: "clear"; clientId?: string }
  | { kind: "clear-client"; clientId: string };

export interface ScratchCommandAck {
  seq: number;
  clientId: string;
  appliedAt: number;
}

export interface ScratchConflict {
  path: string;
  attributeType: string;
  attributeName?: string;
  feature?: ScratchEntry["feature"];
  clients: Array<{
    clientId: string;
    value: number;
    operatorLabel?: string;
    color?: string;
    seq?: number;
  }>;
  mergedValue?: number;
  resolution?: ConflictResolutionMode;
}

export interface MergeStackLayerSnapshot {
  source: string;
  label: string;
  priority: number;
  channelCount: number;
  clientId?: string;
  color?: string;
}

export interface MergeStackSnapshot {
  layers: MergeStackLayerSnapshot[];
  conflicts: ScratchConflict[];
  mergedChannelCount: number;
}

export interface MultiScratchMergeResult {
  layer: LayerContribution;
  conflicts: ScratchConflict[];
}
