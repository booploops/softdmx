/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { AttributeFeature } from '../types/attributes.ts';
import type { ScratchEntry } from '../engine/layers/scratch.ts';
import { inferAttributeFeature } from '../engine/attributes.ts';

export function scratchEntryMatchesFeature(
  entry: ScratchEntry,
  filter?: AttributeFeature[]
): boolean {
  if (!filter || filter.length === 0) return true;
  const feature = entry.feature ?? inferAttributeFeature(entry.attributeType, entry.attributeName ?? entry.path);
  return filter.includes(feature);
}

export function filterScratchEntries(
  entries: ScratchEntry[],
  filter?: AttributeFeature[]
): ScratchEntry[] {
  if (!filter || filter.length === 0) return entries;
  return entries.filter((entry) => scratchEntryMatchesFeature(entry, filter));
}
