/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SoftDmxWasmExports } from "@softdmx/wasm";

let wasmInstance: WebAssembly.Instance | null = null;
let wasmExports: SoftDmxWasmExports | null = null;

/**
 * Initializes the WebAssembly engine instance if running in Node.js/Electron context.
 * Returns the exports interface, or null if initialization failed or wasm is not available.
 */
export async function initWasmEngine(): Promise<SoftDmxWasmExports | null> {
  if (wasmExports) return wasmExports;

  try {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const wasmPath = path.resolve(currentDir, "../../../wasm/dist/softdmx.wasm");
    if (fs.existsSync(wasmPath)) {
      const bytes = fs.readFileSync(wasmPath);
      const result = await WebAssembly.instantiate(bytes, { env: {} });
      wasmInstance = result.instance;
      wasmExports = wasmInstance.exports as SoftDmxWasmExports;
      return wasmExports;
    }
  } catch (err) {
    console.warn("WASM engine failed to initialize, using pure JS fallbacks:", err);
  }

  return null;
}

/**
 * Returns the cached WASM engine exports, or null if not yet initialized.
 */
export function getWasmExports(): SoftDmxWasmExports | null {
  return wasmExports;
}
