/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { storeToRefs } from 'pinia';
import type { ActiveChannel, FixtureChannelWithReference } from 'src/types';
import { useScratchStore } from 'src/stores/scratch';
import { useChannelControl } from './useChannelControl';
import { useDMXStore } from 'src/stores/dmx';

type BindableChannel = ActiveChannel | FixtureChannelWithReference;

function resolveChannelPath(channel: BindableChannel): string | undefined {
  if ('path' in channel && channel.path) return channel.path;
  if ('reference' in channel && channel.reference?.path) return channel.reference.path;
  return undefined;
}

function resolveDefaultValue(channel: BindableChannel): number {
  if ('reference' in channel && channel.reference) return channel.reference.value;
  if ('value' in channel) return channel.value;
  return channel.defaultValue ?? 0;
}

export function useChannelBinding(
  channel: MaybeRefOrGetter<BindableChannel | undefined>,
  attributeType = 'generic'
) {
  const control = useChannelControl();
  const scratch = useScratchStore();
  const dmx = useDMXStore();
  const { entries: scratchEntries } = storeToRefs(scratch);
  const { channels: dmxChannels } = storeToRefs(dmx);

  const path = computed(() => {
    const resolved = toValue(channel);
    return resolved ? resolveChannelPath(resolved) : undefined;
  });

  const defaultValue = computed(() => {
    const resolved = toValue(channel);
    return resolved ? resolveDefaultValue(resolved) : 0;
  });

  return computed({
    get: () => {
      const resolvedPath = path.value;
      if (!resolvedPath) return defaultValue.value;

      // Track scratch/dmx state so widgets refresh after writes.
      scratchEntries.value;
      dmxChannels.value;

      // Group controls write scratch to member fixture paths, not group:// paths.
      if (resolvedPath.startsWith('group://')) {
        return control.getDisplayValue(resolvedPath);
      }

      const scratchEntry = scratchEntries.value.get(resolvedPath);
      if (scratchEntry) return scratchEntry.value;

      return dmxChannels.value.find((ch) => ch.path === resolvedPath)?.value ?? defaultValue.value;
    },
    set: (value: number) => {
      const resolvedPath = path.value;
      if (!resolvedPath) return;
      control.setChannel(resolvedPath, value, attributeType);
    },
  });
}
