<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { StrobeModel } from './strobe.types';
import { useChannelBinding } from 'src/composables/useChannelBinding';
import { useInfoText } from 'src/composables/useInfoText';
import { SdmxButton, SdmxFader, SdmxStatusChip, SdmxValueField } from 'src/components/ui';

const val = defineModel<StrobeModel>({ required: true });
const strobe = useChannelBinding(val.value.strobeChannel, 'effect');
const { info } = useInfoText();

const strobePresets = [
  { label: 'Off', value: 0, description: 'No strobe' },
  { label: 'Open', value: 16, description: 'Always on' },
  { label: 'Slow', value: 64, description: 'Slow strobe' },
  { label: 'Medium', value: 128, description: 'Medium strobe' },
  { label: 'Fast', value: 192, description: 'Fast strobe' },
  { label: 'Max', value: 255, description: 'Maximum strobe' },
];

const currentMode = computed(() => {
  const value = strobe.value;
  if (value === 0) return 'Off';
  if (value <= 31) return 'Open';
  if (value <= 95) return 'Slow Strobe';
  if (value <= 159) return 'Medium Strobe';
  if (value <= 223) return 'Fast Strobe';
  return 'Maximum Strobe';
});

const strobeFrequency = computed(() => {
  const value = strobe.value;
  if (value <= 31) return 0;
  const frequency = ((value - 32) / 223) * 30;
  return Math.round(frequency * 10) / 10;
});

const isFlashing = ref(false);
let flashInterval: ReturnType<typeof setInterval> | null = null;

function updateFlashEffect() {
  if (flashInterval) {
    clearInterval(flashInterval);
    flashInterval = null;
  }

  const value = strobe.value;
  if (value > 31) {
    const frequency = strobeFrequency.value;
    if (frequency > 0) {
      const intervalMs = (1000 / frequency) / 2;
      flashInterval = setInterval(() => {
        isFlashing.value = !isFlashing.value;
      }, intervalMs);
    }
  } else {
    isFlashing.value = false;
  }
}

watch(strobe, updateFlashEffect, { immediate: true });

onBeforeUnmount(() => {
  if (flashInterval) {
    clearInterval(flashInterval);
  }
});

function setPreset(presetValue: number) {
  strobe.value = presetValue;
}

function toggleStrobe() {
  strobe.value = strobe.value === 0 ? 128 : 0;
}
</script>

<template>
  <div
    class="strobe-widget sdmx-widget"
    :class="{ flashing: isFlashing }"
  >
    <div class="strobe-header">
      <div class="title-section">
        <span class="sdmx-text-label">{{ val.strobeChannel.name }}</span>
        <SdmxStatusChip :label="currentMode" variant="negative" />
      </div>
      <SdmxStatusChip
        v-if="strobeFrequency > 0"
        :label="`${strobeFrequency} Hz`"
        variant="warning"
      />
    </div>

    <SdmxButton
      :label="strobe > 0 ? 'Stop' : 'Strobe'"
      :icon="strobe > 0 ? 'bolt-off' : 'bolt'"
      :variant="strobe > 0 ? 'danger' : 'primary'"
      size="md"
      class="toggle-btn"
      @click="toggleStrobe"
    />

    <div class="presets-section">
      <div class="presets-label">Presets</div>
      <div class="preset-buttons">
        <SdmxButton
          v-for="preset in strobePresets"
          :key="preset.value"
          :label="preset.label"
          size="sm"
          :variant="strobe === preset.value ? 'primary' : 'secondary'"
          :info="info('widgets.strobe.preset', { description: preset.description })"
          class="preset-btn"
          @click="setPreset(preset.value)"
        />
      </div>
    </div>

    <SdmxFader
      v-model="strobe"
      label="Fine control"
      :min="0"
      :max="255"
      :step="1"
      color="negative"
      :info="info('widgets.strobe.rate')"
    />

    <SdmxValueField label="DMX" :value="strobe" size="sm" />

    <div class="flash-indicator" :class="{ active: isFlashing }">
      <XIcon name="bolt" size="lg" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.strobe-widget {
  border-radius: var(--sdmx-radius-md);
  padding: var(--sdmx-space-md);
  min-width: 250px;
  user-select: none;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-md);

  &.flashing {
    box-shadow: 0 0 20px var(--sdmx-color-negative-border);
    animation: strobe-glow 0.1s infinite alternate;
  }
}

@keyframes strobe-glow {
  0% {
    box-shadow: 0 0 10px var(--sdmx-color-negative-soft);
  }

  100% {
    box-shadow: 0 0 30px var(--sdmx-color-negative-border);
  }
}

.strobe-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--sdmx-space-sm);
}

.title-section {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-xs);
  min-width: 0;
}

.toggle-btn {
  width: 100%;
}

.presets-section {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-xs);
}

.presets-label {
  font-size: var(--sdmx-font-size-caption);
  color: var(--sdmx-color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.preset-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sdmx-space-xs);
}

.preset-btn {
  width: 100%;
}

.flash-indicator {
  position: absolute;
  top: var(--sdmx-space-sm);
  right: var(--sdmx-space-sm);
  opacity: 0.3;
  transition: all 0.1s ease;

  &.active {
    opacity: 1;
    color: var(--sdmx-color-negative);
    animation: flash-pulse 0.1s infinite alternate;
  }
}

@keyframes flash-pulse {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }

  100% {
    transform: scale(1.2);
    opacity: 1;
  }
}
</style>
