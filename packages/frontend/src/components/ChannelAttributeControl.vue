<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { FixtureChannelDefinition } from 'src/types';
import { useChannelControl } from 'src/composables/useChannelControl';
import {
  dmxToIndex,
  getIndexedSelectOptions,
  indexToDmx,
  isIndexedChannel,
} from 'src/engine/indexed-channel';

const props = defineProps<{
  channel: FixtureChannelDefinition;
  path: string;
  showDmxHint?: boolean;
}>();

const { setChannel, getDisplayValue } = useChannelControl();

const isIndexed = computed(() => isIndexedChannel(props.channel));
const dmxValue = computed(() => Math.round(getDisplayValue(props.path)));
const indexedOptions = computed(() => getIndexedSelectOptions(props.channel));
const selectedIndex = computed(() => dmxToIndex(dmxValue.value, props.channel));

function onDmxInput(event: Event) {
  const value = Number((event.target as HTMLInputElement).value);
  setChannel(props.path, value, props.channel.type);
}

function onIndexedChange(index: number | null) {
  if (index === null || Number.isNaN(index)) return;
  setChannel(props.path, indexToDmx(index, props.channel), props.channel.type);
}
</script>

<template>
  <div class="channel-control">
    <template v-if="isIndexed">
      <q-select
        :model-value="selectedIndex"
        :options="indexedOptions"
        emit-value
        map-options
        dense
        filled
        dark
        :label="channel.name"
        class="indexed-select"
        @update:model-value="onIndexedChange"
      />
      <span v-if="showDmxHint !== false" class="dmx-hint">DMX {{ dmxValue }}</span>
    </template>
    <template v-else>
      <input
        type="range"
        :min="channel.minValue"
        :max="channel.maxValue"
        :value="dmxValue"
        @input="onDmxInput"
      />
      <span>{{ dmxValue }}</span>
    </template>
  </div>
</template>

<style scoped>
.channel-control {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px;
}

.indexed-select {
  grid-column: 1 / -1;
}

.dmx-hint {
  font-size: 12px;
  color: var(--sdmx-color-text-muted);
}

input[type='range'] {
  width: 100%;
}
</style>
