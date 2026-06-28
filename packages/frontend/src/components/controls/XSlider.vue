<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: number;
    min?: number;
    max?: number;
    step?: number;
    disable?: boolean;
  }>(),
  {
    min: 0,
    max: 100,
    step: 1,
    disable: false,
  }
);

const emit = defineEmits<{ 'update:modelValue': [number] }>();

const trackRef = ref<HTMLElement | null>(null);
const isDragging = ref(false);

const percentage = computed(() => {
  const range = props.max - props.min;
  if (range <= 0) return 0;
  const pct = ((props.modelValue - props.min) / range) * 100;
  return Math.min(Math.max(pct, 0), 100);
});

// Clamp value to min/max and round to nearest step
function clampValue(val: number): number {
  let value = Math.min(Math.max(val, props.min), props.max);
  if (props.step > 0) {
    const steps = Math.round((value - props.min) / props.step);
    value = props.min + steps * props.step;
  }
  // Avoid floating point precision issues (e.g. 0.1 + 0.2)
  return parseFloat(value.toFixed(4));
}

function updateValueFromCoords(clientX: number) {
  if (!trackRef.value) return;
  const rect = trackRef.value.getBoundingClientRect();
  const width = rect.width;
  if (width === 0) return;
  
  const clickX = clientX - rect.left;
  const pct = clickX / width;
  const rawValue = props.min + pct * (props.max - props.min);
  emit('update:modelValue', clampValue(rawValue));
}

function onMouseDown(event: MouseEvent) {
  if (props.disable) return;
  isDragging.value = true;
  updateValueFromCoords(event.clientX);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(event: MouseEvent) {
  if (!isDragging.value) return;
  updateValueFromCoords(event.clientX);
}

function onMouseUp() {
  isDragging.value = false;
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
}

function onTouchStart(event: TouchEvent) {
  if (props.disable || event.touches.length === 0) return;
  isDragging.value = true;
  updateValueFromCoords(event.touches[0].clientX);
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd);
}

function onTouchMove(event: TouchEvent) {
  if (!isDragging.value || event.touches.length === 0) return;
  event.preventDefault(); // Stop scrolling
  updateValueFromCoords(event.touches[0].clientX);
}

function onTouchEnd() {
  isDragging.value = false;
  window.removeEventListener('touchmove', onTouchMove);
  window.removeEventListener('touchend', onTouchEnd);
}

function onKeyDown(event: KeyboardEvent) {
  if (props.disable) return;
  let offset = 0;
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
    offset = props.step;
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
    offset = -props.step;
  } else if (event.key === 'Home') {
    emit('update:modelValue', props.min);
    return;
  } else if (event.key === 'End') {
    emit('update:modelValue', props.max);
    return;
  } else {
    return;
  }
  
  event.preventDefault();
  emit('update:modelValue', clampValue(props.modelValue + offset));
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
  window.removeEventListener('touchmove', onTouchMove);
  window.removeEventListener('touchend', onTouchEnd);
});
</script>

<template>
  <div
    class="x-slider"
    :class="{ 'x-slider--disabled': disable, 'x-slider--dragging': isDragging }"
    @keydown="onKeyDown"
  >
    <div
      ref="trackRef"
      class="x-slider__track-container"
      @mousedown="onMouseDown"
      @touchstart="onTouchStart"
    >
      <div class="x-slider__track" />
      <div class="x-slider__active-track" :style="{ width: `${percentage}%` }" />
      <div
        class="x-slider__thumb-wrap"
        :style="{ left: `${percentage}%` }"
      >
        <div
          class="x-slider__thumb"
          :tabindex="disable ? -1 : 0"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.x-slider {
  display: inline-flex;
  align-items: center;
  width: 100%;
  min-width: 120px;
  height: 24px;
  box-sizing: border-box;
  outline: none;
  cursor: default;

  &__track-container {
    position: relative;
    width: 100%;
    height: 18px;
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  &__track {
    position: absolute;
    left: 0;
    right: 0;
    height: 4px;
    border-radius: 2px;
    background-color: #d1d1d6;
    border: 0.5px solid rgba(0, 0, 0, 0.05);
  }

  &__active-track {
    position: absolute;
    left: 0;
    height: 4px;
    border-radius: 2px;
    background-color: #007aff;
  }

  &__thumb-wrap {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none; // Let click events bubble to the track container
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
  }

  &__thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ffffff;
    border: 0.5px solid rgba(0, 0, 0, 0.25);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2), 0 1px 1px rgba(0, 0, 0, 0.05);
    pointer-events: auto;
    outline: none;
    box-sizing: border-box;

    &:focus-visible {
      box-shadow: 0 0 0 2.5px rgba(0, 122, 255, 0.5), 0 1px 3px rgba(0, 0, 0, 0.2);
    }
  }

  &--disabled {
    opacity: 0.45;
    pointer-events: none;
    
    .x-slider__active-track {
      background-color: #8e8e93;
    }
  }
}
</style>

<style lang="scss">
/* Global dark mode overrides for XSlider inside .body--dark */
.body--dark {
  .x-slider {
    .x-slider__track {
      background-color: #3e3e40 !important;
      border-color: rgba(255, 255, 255, 0.05) !important;
    }

    .x-slider__active-track {
      background-color: #0a84ff !important;
    }

    .x-slider__thumb {
      background: #ffffff !important;
      border-color: rgba(0, 0, 0, 0.4) !important;
    }
  }
}
</style>
