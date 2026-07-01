/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { AttributeFeature } from '@softdmx/engine';
import type { CustomFeatureGroup } from '@softdmx/engine';
import type { ScratchEntry } from '@softdmx/engine';
import { inferAttributeFeature } from '@softdmx/engine';

export function scratchEntryMatchesFeature(
  entry: ScratchEntry,
  filter?: AttributeFeature[]
): boolean {
  if (!filter || filter.length === 0) return true;
  const feature = entry.feature ?? inferAttributeFeature(entry.attributeType, entry.attributeName ?? entry.path);
  return filter.includes(feature);
}

export function scratchEntryMatchesCustomGroup(
  entry: ScratchEntry,
  group: CustomFeatureGroup,
): boolean {
  if (group.features?.length) {
    const feature = entry.feature ?? inferAttributeFeature(entry.attributeType, entry.attributeName ?? entry.path);
    if (!group.features.includes(feature)) return false;
  }

  if (group.channelNameIncludes?.length) {
    const channelName = (entry.attributeName ?? entry.path).toLowerCase();
    if (!group.channelNameIncludes.some((needle) => channelName.includes(needle.toLowerCase()))) {
      return false;
    }
  }

  return true;
}

export function resolveCustomFeatureGroup(
  groupId: string,
  customGroups?: CustomFeatureGroup[],
): CustomFeatureGroup | undefined {
  return customGroups?.find((group) => group.id === groupId);
}

export function filterScratchEntries(
  entries: ScratchEntry[],
  filter?: AttributeFeature[],
  options?: {
    customGroup?: CustomFeatureGroup;
    clientId?: string;
    activeOnly?: boolean;
    activePaths?: Iterable<string>;
  },
): ScratchEntry[] {
  let next = entries;

  if (options?.clientId) {
    next = next.filter((entry) => entry.clientId === options.clientId);
  }

  if (options?.activeOnly && options.activePaths) {
    const activePaths = new Set(options.activePaths);
    next = next.filter((entry) => activePaths.has(entry.path));
  } else if (options?.activePaths) {
    const activePaths = new Set(options.activePaths);
    next = next.filter((entry) => activePaths.has(entry.path));
  }

  if (options?.customGroup) {
    return next.filter((entry) => scratchEntryMatchesCustomGroup(entry, options.customGroup!));
  }

  if (!filter || filter.length === 0) return next;
  return next.filter((entry) => scratchEntryMatchesFeature(entry, filter));
}
