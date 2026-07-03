<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { computed, provide, reactive } from 'vue';

type ButtonSize = 'sm' | 'md' | 'lg';

const props = withDefaults(
  defineProps<{
    disable?: boolean;
    color?: string;
    textColor?: string;
    flat?: boolean;
    outline?: boolean;
    size?: ButtonSize;
    vertical?: boolean;
  }>(),
  {
    disable: false,
    flat: false,
    outline: false,
    vertical: false,
  }
);

const computedSize = computed(() => props.size ?? 'md');

// Propagate properties reactively to all child components (e.g. XButton)
const groupContext = reactive({
  size: computed(() => props.size),
  color: computed(() => props.color),
  textColor: computed(() => props.textColor),
  flat: computed(() => props.flat),
  outline: computed(() => props.outline),
  disable: computed(() => props.disable),
});

provide('x-btn-group', groupContext);

const classes = computed(() => [
  'x-btn-group',
  `x-btn-group--${computedSize.value}`,
  {
    'x-btn-group--vertical': props.vertical,
    'x-btn-group--horizontal': !props.vertical,
  },
]);
</script>

<template>
  <div
    :class="classes"
    role="group"
  >
    <slot></slot>
  </div>
</template>

<style scoped lang="scss">
.x-btn-group {
  display: inline-flex;
  vertical-align: middle;
  box-sizing: border-box;

  &--horizontal {
    flex-direction: row;

    :deep(.x-btn) {
      border-radius: 0;

      &:not(:first-child) {
        margin-left: -1px;
      }

      &:first-child {
        border-top-left-radius: inherit;
        border-bottom-left-radius: inherit;
      }

      &:last-child {
        border-top-right-radius: inherit;
        border-bottom-right-radius: inherit;
      }
    }
  }

  &--vertical {
    flex-direction: column;
    align-items: stretch;

    :deep(.x-btn) {
      border-radius: 0;
      width: 100%;

      &:not(:first-child) {
        margin-top: -1px;
      }

      &:first-child {
        border-top-left-radius: inherit;
        border-top-right-radius: inherit;
      }

      &:last-child {
        border-bottom-left-radius: inherit;
        border-bottom-right-radius: inherit;
      }
    }
  }

  // Handle active states and focus rings overlaying adjacent borders correctly
  :deep(.x-btn) {
    &:hover,
    &:focus,
    &:focus-visible,
    &:active {
      z-index: 1;
    }
  }

  // Big Sur border radius based on size
  &--sm {
    border-radius: 4px;
  }

  &--md {
    border-radius: 5px;
  }

  &--lg {
    border-radius: 5px;
  }
}
</style>
