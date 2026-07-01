/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ConflictResolutionMode, MultiScratchMergeResult, ScratchClientLayer, ScratchConflict } from "../../types/multi-user.ts";
import type { ScratchEntry } from "./scratch.ts";
import { inferAttributeFeature, inferAttributeMerge } from "../attributes.ts";
import { clampDmx } from "../types.ts";

function mergeValues(
  values: Array<{ value: number; feature: ScratchEntry["feature"]; clientId: string; seq?: number; priority?: number }>,
  mode: ConflictResolutionMode,
): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0]!.value;

  if (mode === "last-writer") {
    const sorted = [...values].sort((a, b) => (b.seq ?? 0) - (a.seq ?? 0));
    return sorted[0]!.value;
  }

  if (mode === "operator-priority") {
    const sorted = [...values].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    return sorted[0]!.value;
  }

  const feature = values[0]!.feature ?? "generic";
  const merge = inferAttributeMerge(feature);
  if (merge === "htp") {
    return Math.max(...values.map((v) => v.value));
  }
  const sorted = [...values].sort((a, b) => (b.seq ?? 0) - (a.seq ?? 0));
  return sorted[0]!.value;
}

export function detectScratchConflicts(
  layers: ScratchClientLayer[],
  mode: ConflictResolutionMode = "attribute-merge",
): ScratchConflict[] {
  const byPath = new Map<string, ScratchConflict>();

  for (const layer of layers) {
    for (const entry of layer.entries) {
      const existing = byPath.get(entry.path);
      const client = {
        clientId: layer.clientId,
        value: entry.value,
        operatorLabel: layer.operatorLabel,
        color: layer.color,
        seq: entry.seq,
      };
      if (!existing) {
        byPath.set(entry.path, {
          path: entry.path,
          attributeType: entry.attributeType,
          attributeName: entry.attributeName,
          feature: entry.feature,
          clients: [client],
          resolution: mode,
        });
      } else if (!existing.clients.some((c) => c.clientId === layer.clientId && c.value === entry.value)) {
        const match = existing.clients.find((c) => c.clientId === layer.clientId);
        if (match) match.value = entry.value;
        else existing.clients.push(client);
      }
    }
  }

  const conflicts: ScratchConflict[] = [];
  for (const conflict of byPath.values()) {
    if (conflict.clients.length < 2) continue;
    const uniqueValues = new Set(conflict.clients.map((c) => c.value));
    if (uniqueValues.size <= 1) continue;
    conflict.mergedValue = mergeValues(
      conflict.clients.map((c) => ({
        value: c.value,
        feature: conflict.feature,
        clientId: c.clientId,
        seq: c.seq,
        priority: layers.find((l) => l.clientId === c.clientId)?.priority,
      })),
      mode,
    );
    conflicts.push(conflict);
  }
  return conflicts;
}

export function mergeClientScratchLayers(
  layers: ScratchClientLayer[],
  mode: ConflictResolutionMode = "attribute-merge",
): MultiScratchMergeResult {
  const conflicts = detectScratchConflicts(layers, mode);
  const byPath = new Map<
    string,
    { value: number; attributeType: string; clients: Array<{ clientId: string; value: number; seq?: number }> }
  >();

  for (const layer of layers) {
    for (const entry of layer.entries) {
      const bucket = byPath.get(entry.path) ?? {
        value: entry.value,
        attributeType: entry.attributeType,
        clients: [],
      };
      bucket.clients.push({ clientId: layer.clientId, value: entry.value, seq: entry.seq });
      bucket.attributeType = entry.attributeType;
      byPath.set(entry.path, bucket);
    }
  }

  const channels = new Map<
    string,
    { path: string; value: number; attributeType: string; priority: number; source: "scratch" }
  >();

  for (const [path, bucket] of byPath) {
    const feature = inferAttributeFeature(
      bucket.attributeType,
      bucket.clients[0] ? path.split("/").pop() ?? path : path,
    );
    const merged = mergeValues(
      bucket.clients.map((c) => ({
        value: c.value,
        feature,
        clientId: c.clientId,
        seq: c.seq,
        priority: layers.find((l) => l.clientId === c.clientId)?.priority,
      })),
      mode,
    );
    channels.set(path, {
      path,
      value: clampDmx(merged),
      attributeType: bucket.attributeType,
      priority: 100,
      source: "scratch",
    });
  }

  return {
    layer: { source: "scratch", priority: 100, channels },
    conflicts,
  };
}

export function clientLayersToSingleEntries(layers: ScratchClientLayer[]): ScratchEntry[] {
  const result = mergeClientScratchLayers(layers);
  return Array.from(result.layer.channels.values()).map((ch) => ({
    path: ch.path,
    value: ch.value,
    attributeType: ch.attributeType,
    touchedAt: Date.now(),
  }));
}
