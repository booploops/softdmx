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
});
