<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<!--
  Purpose: A strobe control widget for controlling strobe/flash effects
-->
<script setup lang="ts">
import { StrobeModel } from './Strobe';

const val = defineModel<StrobeModel>({required: true});

// Strobe speed presets - common DMX strobe values
const strobePresets = [
  { label: 'Off', value: 0, description: 'No strobe' },
  { label: 'Open', value: 16, description: 'Always on' },
  { label: 'Slow', value: 64, description: 'Slow strobe' },
  { label: 'Medium', value: 128, description: 'Medium strobe' },
  { label: 'Fast', value: 192, description: 'Fast strobe' },
  { label: 'Max', value: 255, description: 'Maximum strobe' }
];

// Current strobe mode based on DMX value
const currentMode = computed(() => {
  const value = val.value.strobeChannel.reference.value;
  if (value === 0) return 'Off';
  if (value <= 31) return 'Open';
  if (value <= 95) return 'Slow Strobe';
  if (value <= 159) return 'Medium Strobe';
  if (value <= 223) return 'Fast Strobe';
  return 'Maximum Strobe';
});

// Strobe frequency estimation (rough approximation)
const strobeFrequency = computed(() => {
  const value = val.value.strobeChannel.reference.value;
  if (value <= 31) return 0; // No strobe
  // Approximate frequency calculation (this varies by fixture)
  const frequency = ((value - 32) / 223) * 30; // 0-30 Hz range
  return Math.round(frequency * 10) / 10;
});

// Visual indicator state for strobe effect
const isFlashing = ref(false);
let flashInterval: ReturnType<typeof setInterval> | null = null;

// Start/stop visual flash effect based on strobe value
const updateFlashEffect = () => {
  if (flashInterval) {
    clearInterval(flashInterval);
    flashInterval = null;
  }

  const value = val.value.strobeChannel.reference.value;
  if (value > 31) { // Strobe is active
    const frequency = strobeFrequency.value;
    if (frequency > 0) {
      const intervalMs = (1000 / frequency) / 2; // Half period for on/off
      flashInterval = setInterval(() => {
        isFlashing.value = !isFlashing.value;
      }, intervalMs);
    }
  } else {
    isFlashing.value = false;
  }
};

// Watch for changes in strobe value
watch(() => val.value.strobeChannel.reference.value, updateFlashEffect, { immediate: true });

// Cleanup interval on unmount
onBeforeUnmount(() => {
  if (flashInterval) {
    clearInterval(flashInterval);
  }
});

// Quick preset buttons
const setPreset = (presetValue: number) => {
  val.value.strobeChannel.reference.value = presetValue;
};

// Toggle strobe on/off
const toggleStrobe = () => {
  const currentValue = val.value.strobeChannel.reference.value;
  if (currentValue === 0) {
    // Turn on to medium strobe
    val.value.strobeChannel.reference.value = 128;
  } else {
    // Turn off
    val.value.strobeChannel.reference.value = 0;
  }
};
</script>

<template>
  <div class="strobe-widget" :class="{ 'flashing': isFlashing }">
    <div class="strobe-header">
      <div class="title-section">
        <span class="strobe-title">{{ val.strobeChannel.name }}</span>
        <span class="strobe-mode">{{ currentMode }}</span>
      </div>
      <div class="frequency-display" v-if="strobeFrequency > 0">
        {{ strobeFrequency }} Hz
      </div>
    </div>

    <!-- Quick Toggle Button -->
    <div class="toggle-section">
      <q-btn
        @click="toggleStrobe"
        :color="val.strobeChannel.reference.value > 0 ? 'negative' : 'positive'"
        :icon="val.strobeChannel.reference.value > 0 ? 'flash_off' : 'flash_on'"
        :label="val.strobeChannel.reference.value > 0 ? 'Stop' : 'Strobe'"
        class="toggle-btn"
        size="md"
      />
    </div>

    <!-- Preset Buttons -->
    <div class="presets-section">
      <div class="presets-label">Presets:</div>
      <div class="preset-buttons">
        <q-btn
          v-for="preset in strobePresets"
          :key="preset.value"
          @click="setPreset(preset.value)"
          :color="val.strobeChannel.reference.value === preset.value ? 'primary' : 'grey-7'"
          :label="preset.label"
          size="sm"
          class="preset-btn"
          dense
        >
          <q-tooltip>{{ preset.description }}</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- Fine Control Slider -->
    <div class="slider-section">
      <div class="slider-label">Fine Control:</div>
      <q-slider
        v-model="val.strobeChannel.reference.value"
        :min="0"
        :max="255"
        :step="1"
        color="negative"
        track-color="grey-8"
        thumb-color="red"
        track-size="6px"
        thumb-size="16px"
        class="strobe-slider"
      />
    </div>

    <!-- Value Display -->
    <div class="value-display">
      <div class="dmx-value">
        <span class="label">DMX:</span>
        <span class="value">{{ val.strobeChannel.reference.value }}</span>
      </div>
    </div>

    <!-- Visual Flash Indicator -->
    <div class="flash-indicator" :class="{ 'active': isFlashing }">
      <q-icon name="flash_on" size="lg" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.strobe-widget {
  background: var(--q-dark);
  border-radius: 8px;
  padding: 16px;
  min-width: 250px;
  user-select: none;
  transition: box-shadow 0.1s ease;
  position: relative;

  &.flashing {
    box-shadow: 0 0 20px rgba(255, 0, 0, 0.5);
    animation: strobe-glow 0.1s infinite alternate;
  }
}

@keyframes strobe-glow {
  0% { box-shadow: 0 0 10px rgba(255, 0, 0, 0.3); }
  100% { box-shadow: 0 0 30px rgba(255, 0, 0, 0.8); }
}

.strobe-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;

  .title-section {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .strobe-title {
      font-weight: 500;
      color: var(--q-primary);
      font-size: 16px;
    }

    .strobe-mode {
      font-size: 12px;
      color: var(--q-negative);
      font-weight: 600;
      text-transform: uppercase;
    }
  }

  .frequency-display {
    background: rgba(255, 0, 0, 0.1);
    color: var(--q-negative);
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
    font-family: 'Courier New', monospace;
  }
}

.toggle-section {
  margin-bottom: 16px;
  text-align: center;

  .toggle-btn {
    width: 100%;
    height: 40px;
    font-weight: 600;
  }
}

.presets-section {
  margin-bottom: 16px;

  .presets-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 8px;
  }

  .preset-buttons {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;

    .preset-btn {
      min-height: 32px;
      font-size: 11px;
    }
  }
}

.slider-section {
  margin-bottom: 16px;

  .slider-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 8px;
  }

  .strobe-slider {
    height: 32px;
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
      color: var(--q-negative);
      font-weight: bold;
      min-width: 30px;
    }
  }
}

.flash-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0.3;
  transition: all 0.1s ease;

  &.active {
    opacity: 1;
    color: var(--q-negative);
    animation: flash-pulse 0.1s infinite alternate;
  }
}

@keyframes flash-pulse {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(1.2); opacity: 1; }
}
</style>
