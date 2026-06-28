/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import wasmUrl from '@softdmx/wasm/dist/softdmx.wasm?url';
import type { SoftDmxWasmExports } from '@softdmx/wasm';

interface InitMsg {
  type: 'init';
}

interface SampleMsg {
  type: 'sample';
  frameWidth: number;
  frameHeight: number;
  frameData: ArrayBuffer;
  maps: Array<{
    id: string;
    width: number;
    height: number;
    region: { x: number; y: number; width: number; height: number };
    flipY?: boolean;
  }>;
}

type WorkerMsg = InitMsg | SampleMsg;

interface WorkerContext {
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
  onmessage: ((this: unknown, ev: MessageEvent<WorkerMsg>) => unknown) | null;
}

const ctx = self as unknown as WorkerContext;

let wasmInstance: WebAssembly.Instance | null = null;
let wasmExports: SoftDmxWasmExports | null = null;

// Cache frame pointers to minimize allocation/deallocation overhead
let cachedFramePtr: number = 0;
let cachedFrameSize: number = 0;

async function initWasm() {
  if (wasmInstance) return;

  const response = await fetch(wasmUrl);
  const bytes = await response.arrayBuffer();
  const result = await WebAssembly.instantiate(bytes, {
    env: {}
  });

  wasmInstance = result.instance;
  wasmExports = wasmInstance.exports as SoftDmxWasmExports;
}

interface SampleResult {
  width: number;
  height: number;
  buffer: ArrayBuffer;
}

function processSample(msg: SampleMsg) {
  if (!wasmExports) return;

  const { frameWidth, frameHeight, frameData, maps } = msg;
  const frameBytes = new Uint8Array(frameData);

  // Resize or allocate frame data in WASM memory
  if (cachedFrameSize < frameBytes.length) {
    if (cachedFramePtr) {
      wasmExports.free(cachedFramePtr, cachedFrameSize);
    }
    cachedFrameSize = frameBytes.length;
    cachedFramePtr = wasmExports.alloc(cachedFrameSize);
  }

  // Copy frame data to WASM memory
  const wasmFrameBuffer = new Uint8Array(
    wasmExports.memory.buffer,
    cachedFramePtr,
    frameBytes.length
  );
  wasmFrameBuffer.set(frameBytes);

  const samples = new Map<string, SampleResult>();

  for (const map of maps) {
    const outSize = map.width * map.height * 3; // RGB
    const outPtr = wasmExports.alloc(outSize);

    wasmExports.sampleFrameToPixelGrid(
      frameWidth,
      frameHeight,
      cachedFramePtr,
      map.width,
      map.height,
      map.region.x,
      map.region.y,
      map.region.width,
      map.region.height,
      map.flipY ?? false,
      outPtr
    );

    // Read sampled RGB values from WASM memory
    const outBuffer = new Uint8Array(
      wasmExports.memory.buffer,
      outPtr,
      outSize
    );

    // Copy to a new buffer that can be safely transferred to the main thread
    const transferredBuffer = outBuffer.slice().buffer;

    samples.set(map.id, {
      width: map.width,
      height: map.height,
      buffer: transferredBuffer,
    });
    wasmExports.free(outPtr, outSize);
  }

  // Convert samples Map to plain object for transfer
  const samplesObj = Object.fromEntries(samples);

  const transferList: Transferable[] = [frameData];
  for (const item of samples.values()) {
    transferList.push(item.buffer);
  }

  ctx.postMessage({
    type: 'sampled',
    samples: samplesObj,
    source: { width: frameWidth, height: frameHeight },
    frameData: frameData
  }, transferList);
}

ctx.onmessage = async (e: MessageEvent<WorkerMsg>) => {
  try {
    if (e.data.type === 'init') {
      await initWasm();
      ctx.postMessage({ type: 'init_done' });
    } else if (e.data.type === 'sample') {
      if (!wasmInstance) {
        await initWasm();
      }
      processSample(e.data);
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    ctx.postMessage({ type: 'error', error: errorMsg });
  }
};
