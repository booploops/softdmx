/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { DeepPartial } from './types.ts';

export function deepMerge<T extends Record<string, unknown>>(base: T, patch?: DeepPartial<T>): T {
  if (!patch) return { ...base };
  const result = { ...base } as T;

  for (const key of Object.keys(patch) as (keyof T)[]) {
    const patchValue = patch[key];
    const baseValue = base[key];

    if (
      patchValue &&
      typeof patchValue === 'object' &&
      !Array.isArray(patchValue) &&
      baseValue &&
      typeof baseValue === 'object' &&
      !Array.isArray(baseValue)
    ) {
      result[key] = deepMerge(
        baseValue as Record<string, unknown>,
        patchValue as DeepPartial<Record<string, unknown>>
      ) as T[keyof T];
      continue;
    }

    if (patchValue !== undefined) {
      result[key] = patchValue as T[keyof T];
    }
  }

  return result;
}
