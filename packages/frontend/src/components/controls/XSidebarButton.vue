<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    active?: boolean;
    disable?: boolean;
    tooltip?: string;
  }>(),
  {
    active: false,
    disable: false,
  }
);

const emit = defineEmits<{ click: [MouseEvent] }>();

function onClick(event: MouseEvent) {
  if (props.disable) return;
  emit('click', event);
}
</script>

<template>
  <button
    class="x-sidebar-button"
    :class="{
      'x-sidebar-button--active': active,
      'x-sidebar-button--disabled': disable,
    }"
    :disabled="disable"
    :tabindex="disable ? -1 : 0"
    :title="tooltip"
    type="button"
    @click="onClick"
  >
    <!-- Active indicator bar on the left edge -->
    <span class="x-sidebar-button__indicator" aria-hidden="true" />

    <!-- Icon content -->
    <span class="x-sidebar-button__icon">
      <slot />
    </span>
  </button>
</template>

<style scoped lang="scss">
.x-sidebar-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  cursor: default;
  color: rgba(255, 255, 255, 0.5);
  outline: none;
  box-sizing: border-box;

  // Left-edge active indicator bar (hidden by default)
  &__indicator {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 2px;
    height: 0;
    border-radius: 0 2px 2px 0;
    background: #ffffff;
    pointer-events: none;
  }

  // Icon wrapper
  &__icon {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    font-size: 20px;
    line-height: 1;
  }

  // Hover state: slightly more opaque icon
  &:hover:not(:disabled) {
    color: rgba(255, 255, 255, 0.85);

    &::before {
      content: '';
      position: absolute;
      inset: 6px;
      border-radius: 5px;
      background: rgba(255, 255, 255, 0.07);
    }
  }

  // Active pressed state
  &:active:not(:disabled) {
    color: #ffffff;

    &::before {
      content: '';
      position: absolute;
      inset: 6px;
      border-radius: 5px;
      background: rgba(255, 255, 255, 0.12);
    }
  }

  // Active/selected state: full-opacity icon + visible indicator bar
  &--active {
    color: #ffffff;

    .x-sidebar-button__indicator {
      height: 18px;
    }
  }

  // Focus ring
  &:focus-visible {
    &::after {
      content: '';
      position: absolute;
      inset: 5px;
      border-radius: 5px;
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.4);
      pointer-events: none;
    }
  }

  // Disabled
  &--disabled {
    opacity: 0.3;
    pointer-events: none;
  }
}
</style>