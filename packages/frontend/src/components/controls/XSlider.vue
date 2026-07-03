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
    vertical?: boolean;
  }>(),
  {
    min: 0,
    max: 100,
    step: 1,
    disable: false,
    vertical: false,
  }
);

const emit = defineEmits<{
  'update:modelValue': [number];
  'change': [number];
}>();

const trackRef = ref<HTMLElement | null>(null);
const isDragging = ref(false);

const percentage = computed(() => {
  const range = props.max - props.min;
  if (range <= 0) return 0;
  const pct = ((props.modelValue - props.min) / range) * 100;
  return Math.min(Math.max(pct, 0), 100);
});

const activeTrackStyle = computed(() => {
  if (props.vertical) {
    return {
      height: `${percentage.value}%`,
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
    };
  }
  return {
    width: `${percentage.value}%`,
    left: 0,
  };
});

const thumbWrapStyle = computed(() => {
  if (props.vertical) {
    return {
      bottom: `${percentage.value}%`,
      left: '50%',
      transform: 'translate(-50%, 50%)',
    };
  }
  return {
    left: `${percentage.value}%`,
    top: '50%',
    transform: 'translate(-50%, -50%)',
  };
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

function updateValueFromCoords(clientX: number, clientY: number) {
  if (!trackRef.value) return;
  const rect = trackRef.value.getBoundingClientRect();
  
  if (props.vertical) {
    const height = rect.height;
    if (height === 0) return;
    const clickY = rect.bottom - clientY;
    const pct = clickY / height;
    const rawValue = props.min + pct * (props.max - props.min);
    emit('update:modelValue', clampValue(rawValue));
  } else {
    const width = rect.width;
    if (width === 0) return;
    const clickX = clientX - rect.left;
    const pct = clickX / width;
    const rawValue = props.min + pct * (props.max - props.min);
    emit('update:modelValue', clampValue(rawValue));
  }
}

function onMouseDown(event: MouseEvent) {
  if (props.disable) return;
  isDragging.value = true;
  updateValueFromCoords(event.clientX, event.clientY);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(event: MouseEvent) {
  if (!isDragging.value) return;
  updateValueFromCoords(event.clientX, event.clientY);
}

function onMouseUp() {
  isDragging.value = false;
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
  emit('change', props.modelValue);
}

function onTouchStart(event: TouchEvent) {
  if (props.disable || event.touches.length === 0) return;
  isDragging.value = true;
  updateValueFromCoords(event.touches[0].clientX, event.touches[0].clientY);
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd);
}

function onTouchMove(event: TouchEvent) {
  if (!isDragging.value || event.touches.length === 0) return;
  event.preventDefault(); // Stop scrolling
  updateValueFromCoords(event.touches[0].clientX, event.touches[0].clientY);
}

function onTouchEnd() {
  isDragging.value = false;
  window.removeEventListener('touchmove', onTouchMove);
  window.removeEventListener('touchend', onTouchEnd);
  emit('change', props.modelValue);
}

function onKeyDown(event: KeyboardEvent) {
  if (props.disable) return;
  let offset = 0;
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
    offset = props.step;
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
    offset = -props.step;
  } else if (event.key === 'Home') {
    const val = props.min;
    emit('update:modelValue', val);
    emit('change', val);
    return;
  } else if (event.key === 'End') {
    const val = props.max;
    emit('update:modelValue', val);
    emit('change', val);
    return;
  } else {
    return;
  }
  
  event.preventDefault();
  const nextVal = clampValue(props.modelValue + offset);
  emit('update:modelValue', nextVal);
  emit('change', nextVal);
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
    :class="{
      'x-slider--disabled': disable,
      'x-slider--dragging': isDragging,
      'x-slider--vertical': vertical,
      'x-slider--horizontal': !vertical
    }"
    @keydown="onKeyDown"
  >
    <div
      ref="trackRef"
      class="x-slider__track-container"
      @mousedown="onMouseDown"
      @touchstart="onTouchStart"
    >
      <div class="x-slider__track" />
      <div class="x-slider__active-track" :style="activeTrackStyle" />
      <div
        class="x-slider__thumb-wrap"
        :style="thumbWrapStyle"
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
  box-sizing: border-box;
  outline: none;
  cursor: default;

  &--horizontal {
    width: 100%;
    min-width: 120px;
    height: 24px;

    .x-slider__track-container {
      position: relative;
      width: 100%;
      height: 18px;
      display: flex;
      align-items: center;
      cursor: pointer;
    }

    .x-slider__track {
      position: absolute;
      left: 0;
      right: 0;
      height: 4px;
      border-radius: 2px;
      background-color: #d1d1d6;
      border: 0.5px solid rgba(0, 0, 0, 0.05);
    }

    .x-slider__active-track {
      position: absolute;
      height: 4px;
      border-radius: 2px;
      background-color: var(--x-slider-active-color, #007aff);
    }

    .x-slider__thumb-wrap {
      position: absolute;
      pointer-events: none;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
    }
  }

  &--vertical {
    flex-direction: column;
    height: 100%;
    min-height: 120px;
    width: 24px;

    .x-slider__track-container {
      position: relative;
      height: 100%;
      width: 18px;
      display: flex;
      justify-content: center;
      cursor: pointer;
    }

    .x-slider__track {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 4px;
      border-radius: 2px;
      background-color: #d1d1d6;
      border: 0.5px solid rgba(0, 0, 0, 0.05);
      left: 50%;
      transform: translateX(-50%);
    }

    .x-slider__active-track {
      position: absolute;
      width: 4px;
      border-radius: 2px;
      background-color: var(--x-slider-active-color, #007aff);
    }

    .x-slider__thumb-wrap {
      position: absolute;
      pointer-events: none;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
    }
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
      background-color: var(--x-slider-active-color, #0a84ff) !important;
    }

    .x-slider__thumb {
      background: #ffffff !important;
      border-color: rgba(0, 0, 0, 0.4) !important;
    }
  }
}
</style>
