/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { FixtureChannelDefinition } from '../types';

type IndexedChannel = Pick<
  FixtureChannelDefinition,
  'minValue' | 'maxValue' | 'indexedSlots' | 'controlMode'
>;

export function isIndexedChannel(channel: FixtureChannelDefinition): boolean {
  return channel.controlMode === 'indexed' && (channel.indexedSlots ?? 0) >= 2;
}

export function getIndexedSlotCount(channel: FixtureChannelDefinition): number {
  return Math.max(0, channel.indexedSlots ?? 0);
}

export function getIndexedSlotLabels(channel: FixtureChannelDefinition): string[] {
  const slots = getIndexedSlotCount(channel);
  if (slots === 0) return [];

  if (channel.indexedLabels?.length === slots) {
    return [...channel.indexedLabels];
  }

  return Array.from({ length: slots }, (_, index) => String(index + 1));
}

export function indexToDmx(index: number, channel: IndexedChannel): number {
  const slots = channel.indexedSlots ?? 1;
  if (slots <= 1) return channel.minValue;

  const clampedIndex = Math.max(0, Math.min(slots - 1, Math.round(index)));
  const span = channel.maxValue - channel.minValue;
  const slotSize = (span + 1) / slots;

  return Math.round(channel.minValue + clampedIndex * slotSize + slotSize / 2 - 0.5);
}

export function dmxToIndex(dmx: number, channel: IndexedChannel): number {
  const slots = channel.indexedSlots ?? 1;
  if (slots <= 1) return 0;

  const clampedDmx = Math.max(channel.minValue, Math.min(channel.maxValue, dmx));
  const span = channel.maxValue - channel.minValue;
  const slotSize = (span + 1) / slots;
  const index = Math.floor((clampedDmx - channel.minValue) / slotSize);

  return Math.max(0, Math.min(slots - 1, index));
}

export function getIndexedSelectOptions(channel: FixtureChannelDefinition) {
  return getIndexedSlotLabels(channel).map((label, index) => ({
    label,
    value: index,
  }));
}
