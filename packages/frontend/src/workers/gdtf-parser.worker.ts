/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { FixtureDefinition } from "@softdmx/engine";
import { loadFixtureFromGdtf } from "@softdmx/engine";

interface GdtfWorkerGlobalScope {
  onmessage: ((this: GdtfWorkerGlobalScope, ev: MessageEvent<{ bytes: Uint8Array; fileName?: string }>) => void) | null;
  postMessage(message: { type: "success"; fixture: FixtureDefinition } | { type: "error"; error: string }): void;
}

const ctx = self as unknown as GdtfWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<{ bytes: Uint8Array; fileName?: string }>) => {
  try {
    const { bytes, fileName } = e.data;
    const fixture = loadFixtureFromGdtf(bytes, fileName);
    ctx.postMessage({ type: "success", fixture });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    ctx.postMessage({ type: "error", error: message });
  }
};
