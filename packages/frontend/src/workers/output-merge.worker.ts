/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import wasmUrl from "@softdmx/wasm/dist/softdmx.wasm?url";
import type { SoftDmxWasmExports } from "@softdmx/engine";
import type { MergeSnapshot } from "src/lib/output-merge-runtime";
import { mergeSnapshot } from "src/lib/output-merge-runtime";

type MergeRequest = {
  type: "merge";
  requestId: number;
  snapshot: MergeSnapshot;
};

type MergeResponse =
  | {
      type: "merged";
      requestId: number;
      channels: MergeSnapshot["baseChannels"];
    }
  | {
      type: "error";
      requestId: number;
      error: string;
    };

let wasmExports: SoftDmxWasmExports | null = null;
let wasmLoadPromise: Promise<SoftDmxWasmExports | null> | null = null;

async function ensureWasm(): Promise<SoftDmxWasmExports | null> {
  if (wasmExports) return wasmExports;
  if (wasmLoadPromise) return wasmLoadPromise;
  wasmLoadPromise = (async () => {
    try {
      const bytes = await (await fetch(wasmUrl)).arrayBuffer();
      const result = await WebAssembly.instantiate(bytes, { env: {} });
      wasmExports = result.instance.exports as SoftDmxWasmExports;
      return wasmExports;
    } catch {
      wasmExports = null;
      return null;
    }
  })();
  return wasmLoadPromise;
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<MergeRequest>) => void) | null;
  postMessage: (message: MergeResponse) => void;
};

scope.onmessage = async (event: MessageEvent<MergeRequest>) => {
  const message = event.data;
  if (message.type !== "merge") return;

  try {
    const wasm = message.snapshot.options.mergeWasmEnabled ? await ensureWasm() : null;
    const channels = mergeSnapshot(message.snapshot, wasm);
    scope.postMessage({
      type: "merged",
      requestId: message.requestId,
      channels,
    });
  } catch (error) {
    scope.postMessage({
      type: "error",
      requestId: message.requestId,
      error: error instanceof Error ? error.message : "Unknown output merge worker failure",
    });
  }
};
