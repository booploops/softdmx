<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { DimmerSliderModel } from './DimmerSlider';
import { useChannelBinding } from 'src/composables/useChannelBinding';

const val = defineModel<DimmerSliderModel>({ required: true });

const dimmer = useChannelBinding(val.value.dimmerChannel, 'intensity');

const dimmerPercentage = computed(() => {
  return Math.round((dimmer.value / 255) * 100);
});
</script>

<template>
  <div class="dimmer-slider-widget">
    <div class="dimmer-header">
      <span class="dimmer-title">{{ val.dimmerChannel.name }}</span>
      <span class="dimmer-percentage">{{ dimmerPercentage }}%</span>
    </div>

    <div class="slider-container">
      <q-slider
        v-model="dimmer"
        :min="0"
        :max="255"
        :step="1"
        color="primary"
        track-color="grey-8"
        thumb-color="accent"
        track-size="8px"
        thumb-size="20px"
        class="dimmer-slider"
      />
    </div>

    <div class="value-display">
      <div class="dmx-value">
        <span class="label">DMX:</span>
        <span class="value">{{ dimmer }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.dimmer-slider-widget {
  background: var(--sdmx-color-bg-surface);
  border-radius: 8px;
  padding: 16px;
  min-width: 200px;
  user-select: none;
}
.dimmer-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}
</style>
