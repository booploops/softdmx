<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<!--
  Purpose: A slider widget for controlling dimmer/intensity channels
-->
<script setup lang="ts">
import { DimmerSliderModel } from './DimmerSlider';

const val = defineModel<DimmerSliderModel>({required: true});

// Computed property for the dimmer value as percentage
const dimmerPercentage = computed(() => {
  return Math.round((val.value.dimmerChannel.reference.value / 255) * 100);
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
        v-model="val.dimmerChannel.reference.value"
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
        <span class="value">{{ val.dimmerChannel.reference.value }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.dimmer-slider-widget {
  background: var(--q-dark);
  border-radius: 8px;
  padding: 16px;
  min-width: 200px;
  user-select: none;
}

.dimmer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .dimmer-title {
    font-weight: 500;
    color: var(--q-primary);
  }

  .dimmer-percentage {
    font-weight: bold;
    color: var(--q-accent);
    font-size: 14px;
  }
}

.slider-container {
  margin-bottom: 16px;
  padding: 0 8px;

  .dimmer-slider {
    height: 40px;
  }
}

.value-display {
  text-align: center;

  .dmx-value {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;

    .label {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
    }

    .value {
      font-family: 'Courier New', monospace;
      font-size: 14px;
      color: var(--q-accent);
      font-weight: bold;
      min-width: 30px;
    }
  }
}
</style>
