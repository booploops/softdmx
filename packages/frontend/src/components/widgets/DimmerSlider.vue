<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { DimmerSliderModel } from './dimmer-slider.types';
import { useChannelBinding } from 'src/composables/useChannelBinding';
import { SdmxEncoder, SdmxValueField } from 'src/components/ui';

const val = defineModel<DimmerSliderModel>({ required: true });

const dimmer = useChannelBinding(val.value.dimmerChannel, 'intensity');

const dimmerPercentage = computed(() => Math.round((dimmer.value / 255) * 100));
</script>

<template>
  <div class="dimmer-slider-widget sdmx-widget">
    <div class="dimmer-header">
      <span class="sdmx-text-label">{{ val.dimmerChannel.name }}</span>
      <SdmxValueField :value="dimmerPercentage" unit="%" size="sm" />
    </div>
    <SdmxEncoder
      v-model="dimmer"
      :label="val.dimmerChannel.name"
      :min="0"
      :max="255"
      unit="%"
      :changed="dimmer > 0"
    />
    <div class="value-display">
      <SdmxValueField label="DMX" :value="dimmer" size="sm" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.dimmer-slider-widget {
  border-radius: var(--sdmx-radius-md);
  padding: var(--sdmx-space-md);
  min-width: 200px;
  user-select: none;
}

.dimmer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--sdmx-space-sm);
}

.value-display {
  margin-top: var(--sdmx-space-xs);
}
</style>
