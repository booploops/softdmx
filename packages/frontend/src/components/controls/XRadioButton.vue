<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: any;
    val: any;
    label?: string;
    disable?: boolean;
  }>(),
  {
    disable: false,
  }
);

const emit = defineEmits<{ 'update:modelValue': [any] }>();

function select() {
  if (props.disable) return;
  emit('update:modelValue', props.val);
}

const isChecked = computed(() => props.modelValue === props.val);

const classes = computed(() => [
  'x-radio-button',
  {
    'x-radio-button--checked': isChecked.value,
    'x-radio-button--disabled': props.disable,
  },
]);
</script>

<template>
  <label
    :class="classes"
    @click.prevent="select"
  >
    <span
      class="x-radio-button__inner"
      :tabindex="disable ? -1 : 0"
      @keydown.space.prevent="select"
      @keydown.enter.prevent="select"
    >
      <span
        v-if="isChecked"
        class="x-radio-button__dot"
      />
    </span>
    <span
      v-if="label"
      class="x-radio-button__label"
    >{{ label }}</span>
  </label>
</template>

<style scoped lang="scss">
.x-radio-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #1d1d1f;
  cursor: default;
  user-select: none;
  vertical-align: middle;

  &__inner {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    box-sizing: border-box;
    outline: none;

    // Light Mode Unchecked
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.25);
    box-shadow: 0 0.5px 1px rgba(0, 0, 0, 0.05);

    &:focus-visible {
      box-shadow: 0 0 0 2.5px rgba(0, 122, 255, 0.5) !important;
    }
  }

  &--checked {
    .x-radio-button__inner {
      // Light Mode Checked
      background: #007aff;
      border-color: #007aff;
      box-shadow: 0 0.5px 1px rgba(0, 0, 0, 0.1);
    }
  }

  &__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #ffffff;
  }

  &__label {
    line-height: 1;
  }

  &--disabled {
    opacity: 0.45;
    pointer-events: none;
  }
}
</style>

<style lang="scss">
/* Global overrides for XRadioButton inside .body--dark */
.body--dark {
  .x-radio-button {
    color: #f5f5f7 !important;

    .x-radio-button__inner {
      background: rgba(255, 255, 255, 0.1) !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
      box-shadow: none !important;
    }

    &.x-radio-button--checked .x-radio-button__inner {
      background: #0a84ff !important;
      border-color: #0a84ff !important;
    }
  }
}
</style>
