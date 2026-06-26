<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { FixtureChannelDefinition } from '@softdmx/engine';
import { useChannelControl } from 'src/composables/useChannelControl';
import {
  dmxToIndex,
  getIndexedSelectOptions,
  indexToDmx,
  isIndexedChannel,
} from '@softdmx/engine';
import { SdmxEncoder, SdmxValueField } from 'src/components/ui';

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

function onIndexedChange(index: number | null) {
  if (index === null || Number.isNaN(index)) return;
  setChannel(props.path, indexToDmx(index, props.channel), props.channel.type);
}

function onEncoderUpdate(value: number) {
  setChannel(props.path, value, props.channel.type);
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
        class="indexed-select sdmx-focus-ring"
        :data-sdmx-info="`Indexed channel: ${channel.name}`"
        @update:model-value="onIndexedChange"
      />
      <SdmxValueField v-if="showDmxHint !== false" label="DMX" :value="dmxValue" size="sm" />
    </template>
    <template v-else>
      <SdmxEncoder
        :model-value="dmxValue"
        :label="channel.name"
        :min="channel.minValue"
        :max="channel.maxValue"
        :changed="dmxValue > 0"
        :info="`Channel: ${channel.name}`"
        @update:model-value="onEncoderUpdate"
      />
    </template>
  </div>
</template>

<style scoped>
.channel-control {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-xs);
}

.indexed-select {
  width: 100%;
}
</style>
