<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';

interface RangeValue {
  min: number;
  max: number;
}

const props = withDefaults(
  defineProps<{
    modelValue: RangeValue;
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

const emit = defineEmits<{ 'update:modelValue': [RangeValue] }>();

const trackRef = ref<HTMLElement | null>(null);
const activeHandle = ref<'min' | 'max' | null>(null);

const pctMin = computed(() => {
  const range = props.max - props.min;
  if (range <= 0) return 0;
  return Math.min(Math.max(((props.modelValue.min - props.min) / range) * 100, 0), 100);
});

const pctMax = computed(() => {
  const range = props.max - props.min;
  if (range <= 0) return 100;
  return Math.min(Math.max(((props.modelValue.max - props.min) / range) * 100, 0), 100);
});

function clampValue(val: number): number {
  let value = Math.min(Math.max(val, props.min), props.max);
  if (props.step > 0) {
    const steps = Math.round((value - props.min) / props.step);
    value = props.min + steps * props.step;
  }
  return parseFloat(value.toFixed(4));
}

function getPercentageFromClientX(clientX: number): number {
  if (!trackRef.value) return 0;
  const rect = trackRef.value.getBoundingClientRect();
  const width = rect.width;
  if (width === 0) return 0;
  const clickX = clientX - rect.left;
  return Math.min(Math.max(clickX / width, 0), 1);
}

function onMouseDown(event: MouseEvent) {
  if (props.disable) return;
  const pct = getPercentageFromClientX(event.clientX);
  const clickVal = props.min + pct * (props.max - props.min);
  
  // Decide which handle is closer
  const distMin = Math.abs(clickVal - props.modelValue.min);
  const distMax = Math.abs(clickVal - props.modelValue.max);
  
  activeHandle.value = distMin < distMax ? 'min' : 'max';
  
  updateValueFromCoords(event.clientX);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(event: MouseEvent) {
  if (!activeHandle.value) return;
  updateValueFromCoords(event.clientX);
}

function onMouseUp() {
  activeHandle.value = null;
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
}

function onTouchStart(event: TouchEvent) {
  if (props.disable || event.touches.length === 0) return;
  const clientX = event.touches[0].clientX;
  const pct = getPercentageFromClientX(clientX);
  const clickVal = props.min + pct * (props.max - props.min);
  
  const distMin = Math.abs(clickVal - props.modelValue.min);
  const distMax = Math.abs(clickVal - props.modelValue.max);
  
  activeHandle.value = distMin < distMax ? 'min' : 'max';
  
  updateValueFromCoords(clientX);
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd);
}

function onTouchMove(event: TouchEvent) {
  if (!activeHandle.value || event.touches.length === 0) return;
  event.preventDefault();
  updateValueFromCoords(event.touches[0].clientX);
}

function onTouchEnd() {
  activeHandle.value = null;
  window.removeEventListener('touchmove', onTouchMove);
  window.removeEventListener('touchend', onTouchEnd);
}

function updateValueFromCoords(clientX: number) {
  if (!activeHandle.value) return;
  const pct = getPercentageFromClientX(clientX);
  const rawValue = props.min + pct * (props.max - props.min);
  const clamped = clampValue(rawValue);
  
  const newValue = { ...props.modelValue };
  if (activeHandle.value === 'min') {
    newValue.min = Math.min(clamped, props.modelValue.max);
  } else {
    newValue.max = Math.max(clamped, props.modelValue.min);
  }
  emit('update:modelValue', newValue);
}

function handleKey(handle: 'min' | 'max', event: KeyboardEvent) {
  if (props.disable) return;
  let offset = 0;
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
    offset = props.step;
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
    offset = -props.step;
  } else {
    return;
  }
  
  event.preventDefault();
  const currentVal = props.modelValue[handle];
  const clamped = clampValue(currentVal + offset);
  
  const newValue = { ...props.modelValue };
  if (handle === 'min') {
    newValue.min = Math.min(clamped, props.modelValue.max);
  } else {
    newValue.max = Math.max(clamped, props.modelValue.min);
  }
  emit('update:modelValue', newValue);
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
    class="x-range"
    :class="{ 'x-range--disabled': disable, 'x-range--dragging': !!activeHandle }"
  >
    <div
      ref="trackRef"
      class="x-range__track-container"
      @mousedown="onMouseDown"
      @touchstart="onTouchStart"
    >
      <div class="x-range__track" />
      <div
        class="x-range__active-track"
        :style="{
          left: `${pctMin}%`,
          width: `${pctMax - pctMin}%`
        }"
      />
      
      <!-- Min Handle -->
      <div
        class="x-range__thumb-wrap"
        :style="{ left: `${pctMin}%` }"
      >
        <div
          class="x-range__thumb"
          :tabindex="disable ? -1 : 0"
          @keydown="handleKey('min', $event)"
        />
      </div>

      <!-- Max Handle -->
      <div
        class="x-range__thumb-wrap"
        :style="{ left: `${pctMax}%` }"
      >
        <div
          class="x-range__thumb"
          :tabindex="disable ? -1 : 0"
          @keydown="handleKey('max', $event)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.x-range {
  display: inline-flex;
  align-items: center;
  width: 100%;
  min-width: 140px;
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
    height: 4px;
    border-radius: 2px;
    background-color: #007aff;
  }

  &__thumb-wrap {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
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
    z-index: 2;

    &:focus-visible {
      box-shadow: 0 0 0 2.5px rgba(0, 122, 255, 0.5), 0 1px 3px rgba(0, 0, 0, 0.2);
      z-index: 3; // Put active/focused thumb on top
    }
  }

  &--disabled {
    opacity: 0.45;
    pointer-events: none;

    .x-range__active-track {
      background-color: #8e8e93;
    }
  }
}
</style>

<style lang="scss">
/* Global dark mode overrides for XRange inside .body--dark */
.body--dark {
  .x-range {
    .x-range__track {
      background-color: #3e3e40 !important;
      border-color: rgba(255, 255, 255, 0.05) !important;
    }

    .x-range__active-track {
      background-color: #0a84ff !important;
    }

    .x-range__thumb {
      background: #ffffff !important;
      border-color: rgba(0, 0, 0, 0.4) !important;
    }
  }
}
</style>
