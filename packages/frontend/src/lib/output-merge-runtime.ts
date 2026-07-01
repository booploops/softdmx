/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ActiveChannel, LayerContribution, SoftDmxWasmExports } from "@softdmx/engine";
import type { ScratchClientLayer, MergeStackSnapshot } from "@softdmx/engine";
import { mergeLayers } from "@softdmx/engine";

export interface SerializedChannelValue {
  path: string;
  value: number;
  attributeType: string;
  priority: number;
  source: LayerContribution["source"];
}

export interface SerializedLayerContribution {
  source: LayerContribution["source"];
  priority: number;
  channels: SerializedChannelValue[];
  clientId?: string;
  label?: string;
  color?: string;
}

export interface MergeSnapshot {
  baseChannels: ActiveChannel[];
  layers: SerializedLayerContribution[];
  clientScratchLayers?: ScratchClientLayer[];
  mergeStack?: MergeStackSnapshot;
  options: {
    blackout: boolean;
    grandMaster: number;
    mergeWasmEnabled: boolean;
  };
}

function serializeLayer(
  layer: LayerContribution,
  meta?: Pick<SerializedLayerContribution, "clientId" | "label" | "color">,
): SerializedLayerContribution {
  return {
    source: layer.source,
    priority: layer.priority,
    channels: [...layer.channels.values()].map((channel) => ({
      path: channel.path,
      value: channel.value,
      attributeType: channel.attributeType,
      priority: channel.priority,
      source: channel.source,
    })),
    ...meta,
  };
}

function deserializeLayer(layer: SerializedLayerContribution): LayerContribution {
  return {
    source: layer.source,
    priority: layer.priority,
    channels: new Map(layer.channels.map((channel) => [channel.path, channel])),
  };
}

function hasUnknownChannels(snapshot: MergeSnapshot): boolean {
  const known = new Set(snapshot.baseChannels.map((channel) => channel.path));
  for (const layer of snapshot.layers) {
    for (const channel of layer.channels) {
      if (!known.has(channel.path)) return true;
    }
  }
  return false;
}

function wasmMerge(
  snapshot: MergeSnapshot,
  wasm: SoftDmxWasmExports,
): ActiveChannel[] {
  if (snapshot.options.blackout) {
    return snapshot.baseChannels.map((channel) => ({ ...channel, value: 0 }));
  }

  const sortedLayers = [...snapshot.layers].sort((a, b) => a.priority - b.priority);
  const result = snapshot.baseChannels.map((channel) => ({ ...channel }));
  const pathToIndex = new Map(result.map((channel, index) => [channel.path, index]));
  const valuesPtr = wasm.alloc(result.length);
  const scalesPtr = wasm.alloc(result.length);
  if (!valuesPtr || !scalesPtr) {
    return mergeLayers(
      snapshot.baseChannels,
      snapshot.layers.map(deserializeLayer),
      {
        blackout: snapshot.options.blackout,
        grandMaster: snapshot.options.grandMaster,
      },
    );
  }

  try {
    // Always bind views after current allocation phase. Future alloc() calls may grow memory
    // and invalidate older JS views over wasm.memory.buffer.
    let wasmValues = new Uint8Array(wasm.memory.buffer, valuesPtr, result.length);
    let scales = new Uint8Array(wasm.memory.buffer, scalesPtr, result.length);
    for (let i = 0; i < result.length; i += 1) {
      const channel = result[i]!;
      wasmValues[i] = channel.value;
      scales[i] = channel.attributeType === "intensity" || channel.attributeType === "color" ? 1 : 0;
    }

    for (const layer of sortedLayers) {
      if (layer.channels.length === 0) continue;
      const indicesPtr = wasm.alloc(layer.channels.length * 4);
      const layerValuesPtr = wasm.alloc(layer.channels.length);
      const htpPtr = wasm.alloc(layer.channels.length);
      if (!indicesPtr || !layerValuesPtr || !htpPtr) {
        continue;
      }
      try {
        // Rebind after alloc() in this iteration to avoid stale views if memory grew.
        wasmValues = new Uint8Array(wasm.memory.buffer, valuesPtr, result.length);
        scales = new Uint8Array(wasm.memory.buffer, scalesPtr, result.length);
        const indices = new Uint32Array(wasm.memory.buffer, indicesPtr, layer.channels.length);
        const values = new Uint8Array(wasm.memory.buffer, layerValuesPtr, layer.channels.length);
        const isHtp = new Uint8Array(wasm.memory.buffer, htpPtr, layer.channels.length);
        for (let i = 0; i < layer.channels.length; i += 1) {
          const channel = layer.channels[i]!;
          indices[i] = pathToIndex.get(channel.path) ?? 0;
          values[i] = channel.value;
          isHtp[i] =
            (channel.attributeType === "intensity" || channel.attributeType === "color") &&
            channel.source !== "scratch"
              ? 1
              : 0;
        }
        wasm.mergeLayer(valuesPtr, layer.channels.length, indicesPtr, layerValuesPtr, htpPtr);
      } finally {
        wasm.free(indicesPtr, layer.channels.length * 4);
        wasm.free(layerValuesPtr, layer.channels.length);
        wasm.free(htpPtr, layer.channels.length);
      }
    }

    wasm.scaleGrandMaster(valuesPtr, result.length, scalesPtr, snapshot.options.grandMaster);
    // Final readback must always use a fresh view from the current memory buffer.
    const readbackValues = new Uint8Array(wasm.memory.buffer, valuesPtr, result.length);
    for (let i = 0; i < result.length; i += 1) {
      const next = readbackValues[i];
      if (next === undefined) {
        throw new Error(`WASM merge readback failed at index ${i}.`);
      }
      result[i]!.value = next;
    }
    return result;
  } finally {
    wasm.free(valuesPtr, result.length);
    wasm.free(scalesPtr, result.length);
  }
}

export function buildMergeSnapshot(
  baseChannels: ActiveChannel[],
  layers: LayerContribution[],
  options: MergeSnapshot["options"],
  extras?: {
    clientScratchLayers?: ScratchClientLayer[];
    mergeStack?: MergeStackSnapshot;
    layerMeta?: Array<Pick<SerializedLayerContribution, "clientId" | "label" | "color"> | undefined>;
  },
): MergeSnapshot {
  return {
    baseChannels: baseChannels.map((channel) => ({ ...channel })),
    layers: layers.map((layer, index) => serializeLayer(layer, extras?.layerMeta?.[index])),
    clientScratchLayers: extras?.clientScratchLayers?.map((layer) => ({
      ...layer,
      entries: layer.entries.map((entry) => ({ ...entry })),
    })),
    mergeStack: extras?.mergeStack,
    options,
  };
}

export function mergeSnapshot(
  snapshot: MergeSnapshot,
  wasm?: SoftDmxWasmExports | null,
): ActiveChannel[] {
  if (
    snapshot.options.mergeWasmEnabled &&
    wasm &&
    typeof wasm.mergeLayer === "function" &&
    typeof wasm.scaleGrandMaster === "function" &&
    !hasUnknownChannels(snapshot)
  ) {
    return wasmMerge(snapshot, wasm);
  }
  return mergeLayers(
    snapshot.baseChannels,
    snapshot.layers.map(deserializeLayer),
    {
      blackout: snapshot.options.blackout,
      grandMaster: snapshot.options.grandMaster,
    },
  );
}
