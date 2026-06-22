/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ShowDocument, PresetPool } from 'src/show/document';

export function resolvePresetPool(show: ShowDocument, poolId: string): PresetPool | undefined {
  return (show.presetPools ?? []).find((pool) => pool.id === poolId);
}

export function resolvePresetIdFromPoolSlot(
  show: ShowDocument,
  poolId: string,
  slotIndex: number
): string | null {
  const pool = resolvePresetPool(show, poolId);
  if (!pool) return null;
  const presetId = pool.slots[slotIndex];
  return typeof presetId === 'string' && presetId.length > 0 ? presetId : null;
}

export function ensureDefaultPresetPool(show: ShowDocument): PresetPool[] {
  const pools = [...(show.presetPools ?? [])];
  if (pools.length === 0) {
    if ((show.presets ?? []).length === 0) {
      return [
        {
          id: 'default-pool',
          name: 'All',
          kind: 'all',
          slots: [],
          pageSize: 25,
        },
      ];
    }

    return [
      {
        id: 'default-pool',
        name: 'All',
        kind: 'all',
        slots: show.presets.map((preset) => preset.id),
        pageSize: 25,
      },
    ];
  }

  const defaultPool = pools.find((pool) => pool.id === 'default-pool') ?? pools[0];
  if (defaultPool && defaultPool.slots.length === 0 && (show.presets ?? []).length > 0) {
    defaultPool.slots = show.presets.map((preset) => preset.id);
  }

  return pools;
}
