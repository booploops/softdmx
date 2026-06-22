/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export interface ScratchEntry {
  path: string;
  value: number;
  attributeType: string;
  attributeName?: string;
  attributeId?: string;
  feature?: import('src/types/attributes').AttributeFeature;
  touchedAt: number;
}

export function scratchToLayer(entries: ScratchEntry[]) {
  const channels = new Map<string, { path: string; value: number; attributeType: string; priority: number; source: 'scratch' }>();

  for (const entry of entries) {
    channels.set(entry.path, {
      path: entry.path,
      value: entry.value,
      attributeType: entry.attributeType,
      priority: 100,
      source: 'scratch',
    });
  }

  return { source: 'scratch' as const, priority: 100, channels };
}
