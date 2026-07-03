<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: number;
    min?: number;
    max?: number;
    step?: number;
    disable?: boolean;
    dense?: boolean;
  }>(),
  {
    min: -Infinity,
    max: Infinity,
    step: 1,
    disable: false,
    dense: false,
  }
);

const emit = defineEmits<{
  'update:modelValue': [number];
  'change': [number];
}>();

function updateValue(val: number) {
  if (props.disable) return;
  const clamped = Math.min(Math.max(val, props.min), props.max);
  // Avoid floating point precision issues
  const precision = String(props.step).split('.')[1]?.length || 0;
  const fixed = parseFloat(clamped.toFixed(precision));
  
  emit('update:modelValue', fixed);
  emit('change', fixed);
}

let repeatTimeout: ReturnType<typeof setTimeout> | null = null;
let repeatInterval: ReturnType<typeof setInterval> | null = null;
let ignoreClick = false;

function decrement() {
  if (props.disable || props.modelValue <= props.min) {
    stopRepeat();
    return;
  }
  updateValue(props.modelValue - props.step);
}

function increment() {
  if (props.disable || props.modelValue >= props.max) {
    stopRepeat();
    return;
  }
  updateValue(props.modelValue + props.step);
}

function startRepeat(e: PointerEvent, action: () => void) {
  if (e.button !== 0) return; // Only primary button
  
  stopRepeat();
  ignoreClick = true;
  action();
  
  repeatTimeout = setTimeout(() => {
    repeatInterval = setInterval(() => {
      action();
    }, 80);
  }, 400);
}

function stopRepeat() {
  if (repeatTimeout) {
    clearTimeout(repeatTimeout);
    repeatTimeout = null;
  }
  if (repeatInterval) {
    clearInterval(repeatInterval);
    repeatInterval = null;
  }
}

function stopRepeatWithDelay() {
  stopRepeat();
  setTimeout(() => {
    ignoreClick = false;
  }, 0);
}

function handlePointerLeave() {
  stopRepeat();
  ignoreClick = false;
}

function handlePointerCancel() {
  stopRepeat();
  ignoreClick = false;
}

function handlePointerMove(e: PointerEvent) {
  if (!repeatTimeout && !repeatInterval) return;
  const currentTarget = e.currentTarget as HTMLElement;
  if (!currentTarget) return;
  
  const element = document.elementFromPoint(e.clientX, e.clientY);
  if (!element || !currentTarget.contains(element)) {
    stopRepeat();
    ignoreClick = false;
  }
}

function handleDecrementClick() {
  if (ignoreClick) {
    ignoreClick = false;
    return;
  }
  decrement();
}

function handleIncrementClick() {
  if (ignoreClick) {
    ignoreClick = false;
    return;
  }
  increment();
}

onBeforeUnmount(() => {
  stopRepeat();
});
</script>

<template>
  <div
    class="x-stepper"
    :class="{
      'x-stepper--dense': dense,
      'x-stepper--disabled': disable,
    }"
  >
    <button
      type="button"
      class="x-stepper__btn x-stepper__btn--decrement"
      :disabled="disable || modelValue <= min"
      :tabindex="disable ? -1 : 0"
      @pointerdown="e => startRepeat(e, decrement)"
      @pointerup="stopRepeatWithDelay"
      @pointerleave="handlePointerLeave"
      @pointercancel="handlePointerCancel"
      @pointermove="handlePointerMove"
      @click="handleDecrementClick"
    >
      <svg viewBox="0 0 10 10" class="x-stepper__icon">
        <path d="M2 5H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </button>
    <div class="x-stepper__divider" />
    <button
      type="button"
      class="x-stepper__btn x-stepper__btn--increment"
      :disabled="disable || modelValue >= max"
      :tabindex="disable ? -1 : 0"
      @pointerdown="e => startRepeat(e, increment)"
      @pointerup="stopRepeatWithDelay"
      @pointerleave="handlePointerLeave"
      @pointercancel="handlePointerCancel"
      @pointermove="handlePointerMove"
      @click="handleIncrementClick"
    >
      <svg viewBox="0 0 10 10" class="x-stepper__icon">
        <path d="M5 2V8M2 5H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </button>
  </div>
</template>

<style scoped lang="scss">
.x-stepper {
  display: inline-flex;
  align-items: center;
  height: 24px;
  background-color: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 5px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  box-sizing: border-box;
  overflow: hidden;

  &__btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 100%;
    padding: 0;
    margin: 0;
    border: none;
    background: transparent;
    color: #1d1d1f;
    outline: none;
    cursor: default;
    position: relative;

    &:hover:not(:disabled) {
      background-color: #f5f5f7;
    }

    &:active:not(:disabled) {
      background-color: #e5e5ea;
    }

    &:disabled {
      color: #c5c5c7;
    }

    &:focus-visible {
      box-shadow: inset 0 0 0 2px rgba(0, 122, 255, 0.5);
      z-index: 2;
    }
  }

  &__divider {
    width: 1px;
    height: 12px;
    background-color: rgba(0, 0, 0, 0.1);
  }

  &__icon {
    width: 10px;
    height: 10px;
  }

  &--dense {
    height: 20px;

    .x-stepper__btn {
      width: 20px;
    }

    .x-stepper__divider {
      height: 10px;
    }
  }

  &--disabled {
    opacity: 0.45;
    pointer-events: none;
  }
}
</style>

<style lang="scss">
/* Global dark mode overrides for XStepper */
.body--dark {
  .x-stepper {
    background-color: rgba(255, 255, 255, 0.1) !important;
    border-color: rgba(255, 255, 255, 0.15) !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2) !important;

    .x-stepper__btn {
      color: #f5f5f7 !important;

      &:hover:not(:disabled) {
        background-color: rgba(255, 255, 255, 0.08) !important;
      }

      &:active:not(:disabled) {
        background-color: rgba(255, 255, 255, 0.15) !important;
      }

      &:disabled {
        color: rgba(255, 255, 255, 0.3) !important;
      }

      &:focus-visible {
        box-shadow: inset 0 0 0 2px rgba(10, 132, 255, 0.5) !important;
      }
    }

    .x-stepper__divider {
      background-color: rgba(255, 255, 255, 0.1) !important;
    }
  }
}
</style>
