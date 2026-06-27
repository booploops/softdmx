/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect, test } from "vitest";
import {
  buildMergeSnapshot,
  mergeSnapshot,
} from "../../frontend/src/lib/output-merge-runtime";
import { mergeLayers, initWasmEngine } from "@softdmx/engine";
import type { SoftDmxWasmExports } from "@softdmx/engine";

function createGrowingMockWasm(): SoftDmxWasmExports {
  const memory = new WebAssembly.Memory({ initial: 1, maximum: 256 });
  let heap = 1024;

  const ensure = (size: number) => {
    const required = heap + size;
    const pageSize = 64 * 1024;
    while (required > memory.buffer.byteLength) {
      memory.grow(1);
    }
    const ptr = heap;
    heap += Math.max(1, size);
    return ptr;
  };

  const alloc = (size: number) => {
    // Force buffer replacement on every allocation to simulate worst-case growth behavior.
    memory.grow(1);
    return ensure(size);
  };
  const free = () => {};

  const mergeLayer: SoftDmxWasmExports["mergeLayer"] = (
    out_values,
    layer_count,
    indices_ptr,
    values_ptr,
    is_htp_ptr,
  ) => {
    const out = new Uint8Array(memory.buffer, out_values);
    const indices = new Uint32Array(memory.buffer, indices_ptr, layer_count);
    const values = new Uint8Array(memory.buffer, values_ptr, layer_count);
    const isHtp = new Uint8Array(memory.buffer, is_htp_ptr, layer_count);
    for (let i = 0; i < layer_count; i += 1) {
      const idx = indices[i] ?? 0;
      const next = values[i] ?? 0;
      if ((isHtp[i] ?? 0) === 1) {
        out[idx] = Math.max(out[idx] ?? 0, next);
      } else {
        out[idx] = next;
      }
    }
  };

  const scaleGrandMaster: SoftDmxWasmExports["scaleGrandMaster"] = (
    out_values,
    channels_count,
    scales_with_gm,
    grand_master,
  ) => {
    const out = new Uint8Array(memory.buffer, out_values, channels_count);
    const scales = new Uint8Array(memory.buffer, scales_with_gm, channels_count);
    for (let i = 0; i < channels_count; i += 1) {
      if ((scales[i] ?? 0) === 1) {
        out[i] = Math.max(0, Math.min(255, Math.round((out[i] ?? 0) * grand_master)));
      }
    }
  };

  return {
    _start: () => {},
    alloc,
    free: free as SoftDmxWasmExports["free"],
    mergeLayer,
    scaleGrandMaster,
    memory,
    hashUnit32: () => 0,
    evaluateSineEffect: () => {},
    evaluatePhaserEffect: () => {},
    sampleFrameToPixelGrid: () => {},
    flattenPixelMatrixToChannelsWasm: () => {},
    packArtNetPacket: () => 0,
    packSacnPacket: () => 0,
  } as SoftDmxWasmExports;
}

describe("output merge runtime", () => {
  test("snapshot merge matches engine mergeLayers", () => {
    const baseChannels = [
      { id: 1, path: "show://Wash 1/1", value: 80, attributeType: "intensity" },
      { id: 2, path: "show://Wash 1/2", value: 20, attributeType: "color" },
      { id: 3, path: "show://Wash 1/3", value: 5, attributeType: "effect" },
    ];
    const layers = [
      {
        source: "cue" as const,
        priority: 40,
        channels: new Map([
          [
            "show://Wash 1/1",
            {
              path: "show://Wash 1/1",
              value: 210,
              attributeType: "intensity",
              priority: 40,
              source: "cue" as const,
            },
          ],
        ]),
      },
      {
        source: "effect" as const,
        priority: 50,
        channels: new Map([
          [
            "show://Wash 1/1",
            {
              path: "show://Wash 1/1",
              value: 120,
              attributeType: "intensity",
              priority: 50,
              source: "effect" as const,
            },
          ],
          [
            "show://Wash 1/2",
            {
              path: "show://Wash 1/2",
              value: 60,
              attributeType: "color",
              priority: 50,
              source: "effect" as const,
            },
          ],
        ]),
      },
      {
        source: "scratch" as const,
        priority: 100,
        channels: new Map([
          [
            "show://Wash 1/1",
            {
              path: "show://Wash 1/1",
              value: 33,
              attributeType: "intensity",
              priority: 100,
              source: "scratch" as const,
            },
          ],
        ]),
      },
    ];

    const snapshot = buildMergeSnapshot(baseChannels, layers, {
      blackout: false,
      grandMaster: 0.7,
      mergeWasmEnabled: false,
    });
    const actual = mergeSnapshot(snapshot);
    const expected = mergeLayers(baseChannels, layers, {
      blackout: false,
      grandMaster: 0.7,
    });
    expect(actual).toEqual(expected);
  });

  test("snapshot merge supports wasm path parity", async () => {
    const wasm = await initWasmEngine();
    if (!wasm || typeof wasm.mergeLayer !== "function" || typeof wasm.scaleGrandMaster !== "function") {
      return;
    }
    const baseChannels = Array.from({ length: 64 }, (_, idx) => ({
      id: idx + 1,
      path: `show://Fixture/${idx + 1}`,
      value: (idx * 13) % 255,
      attributeType: idx % 2 === 0 ? "intensity" : "effect",
    }));
    const layers = [
      {
        source: "cue" as const,
        priority: 40,
        channels: new Map(
          baseChannels.map((channel, index) => [
            channel.path,
            {
              path: channel.path,
              value: (index * 7) % 255,
              attributeType: channel.attributeType,
              priority: 40,
              source: "cue" as const,
            },
          ]),
        ),
      },
    ];
    const snapshot = buildMergeSnapshot(baseChannels, layers, {
      blackout: false,
      grandMaster: 0.9,
      mergeWasmEnabled: true,
    });
    const actual = mergeSnapshot(snapshot, wasm);
    const expected = mergeLayers(baseChannels, layers, {
      blackout: false,
      grandMaster: 0.9,
    });
    expect(actual).toEqual(expected);
  });

  test("snapshot merge remains correct when wasm memory grows between allocs", () => {
    const wasm = createGrowingMockWasm();
    const baseChannels = Array.from({ length: 96 }, (_, idx) => ({
      id: idx + 1,
      path: `show://Fixture/${idx + 1}`,
      value: (idx * 11) % 255,
      attributeType: idx % 3 === 0 ? "intensity" : idx % 3 === 1 ? "color" : "effect",
    }));
    const layers = Array.from({ length: 4 }, (_, layerIndex) => ({
      source: layerIndex % 2 === 0 ? ("cue" as const) : ("effect" as const),
      priority: 20 + layerIndex * 10,
      channels: new Map(
        baseChannels.map((channel, idx) => [
          channel.path,
          {
            path: channel.path,
            value: (idx * (layerIndex + 5)) % 255,
            attributeType: channel.attributeType,
            priority: 20 + layerIndex * 10,
            source: layerIndex % 2 === 0 ? ("cue" as const) : ("effect" as const),
          },
        ]),
      ),
    }));
    const snapshot = buildMergeSnapshot(baseChannels, layers, {
      blackout: false,
      grandMaster: 0.85,
      mergeWasmEnabled: true,
    });
    const actual = mergeSnapshot(snapshot, wasm);
    const expected = mergeLayers(baseChannels, layers, {
      blackout: false,
      grandMaster: 0.85,
    });
    expect(actual).toEqual(expected);
  });
});
