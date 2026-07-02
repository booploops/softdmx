/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ConfigPatch } from '@softdmx/shared';
import { trpc } from 'src/lib/trpc';

export const isElectronConfigEnv =
  typeof window !== 'undefined' && !!(window as Window & { electronTRPC?: unknown }).electronTRPC;

let hasLocalModifications = false;
let configHydrated = !isElectronConfigEnv;

export function markConfigModified(): void {
  hasLocalModifications = true;
}

export function hasConfigLocalModifications(): boolean {
  return hasLocalModifications;
}

export function setConfigHydrated(value = true): void {
  configHydrated = value;
}

export function persistConfigPatch(patch: ConfigPatch): void {
  if (!isElectronConfigEnv || !configHydrated) return;

  markConfigModified();
  trpc.saveConfig
    .mutate(patch)
    .catch((error: unknown) => console.error('Failed to save config via tRPC:', error));
}
