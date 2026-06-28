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
    modelValue?: string | number;
    type?: string;
    placeholder?: string;
    disable?: boolean;
    readonly?: boolean;
    dense?: boolean;
    clearable?: boolean;
  }>(),
  {
    modelValue: '',
    type: 'text',
    placeholder: '',
    disable: false,
    readonly: false,
    dense: false,
    clearable: false,
  }
);

const emit = defineEmits<{
  'update:modelValue': [string];
  'focus': [FocusEvent];
  'blur': [FocusEvent];
  'clear': [];
}>();

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
};

const clear = () => {
  emit('update:modelValue', '');
  emit('clear');
};
</script>

<template>
  <div
    class="x-input"
    :class="{
      'x-input--dense': dense,
      'x-input--disabled': disable,
      'x-input--readonly': readonly,
    }"
  >
    <!-- Prepend Slot -->
    <div
      v-if="$slots.prepend"
      class="x-input__prepend"
    >
      <slot name="prepend" />
    </div>

    <div class="x-input__inner-wrapper">
      <input
        class="x-input__native"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disable"
        :readonly="readonly"
        @input="onInput"
        @focus="emit('focus', $event)"
        @blur="emit('blur', $event)"
      />

      <!-- Clear button -->
      <button
        v-if="clearable && modelValue && !disable && !readonly"
        type="button"
        class="x-input__clear"
        tabindex="-1"
        @click="clear"
      >
        <svg
          viewBox="0 0 12 12"
          class="x-input__clear-icon"
        >
          <path
            d="M3.5 3.5L8.5 8.5M8.5 3.5L3.5 8.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>

    <!-- Append Slot -->
    <div
      v-if="$slots.append"
      class="x-input__append"
    >
      <slot name="append" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.x-input {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  width: 100%;
  box-sizing: border-box;

  &__inner-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
    flex: 1 1 auto;
    height: 24px;
    border-radius: 5px;
    background-color: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.2);
    box-shadow: inset 0 1px 1.5px rgba(0, 0, 0, 0.05);
    box-sizing: border-box;
    width: 100%;

    // Focus ring on the wrapper when input is focused
    &:has(.x-input__native:focus) {
      box-shadow: 0 0 0 2.5px rgba(0, 122, 255, 0.5) !important;
      border-color: #007aff !important;
    }
  }

  &__native {
    width: 100%;
    height: 100%;
    border: none;
    background: transparent;
    padding: 0 8px;
    color: #1d1d1f;
    outline: none;
    font-size: inherit;
    font-family: inherit;
    box-sizing: border-box;
    line-height: normal;

    &::placeholder {
      color: rgba(0, 0, 0, 0.35);
    }
  }

  &__clear {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    margin-right: 6px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background-color: rgba(0, 0, 0, 0.1);
    color: rgba(0, 0, 0, 0.5);
    cursor: default;
    outline: none;
    flex-shrink: 0;

    &:hover {
      background-color: rgba(0, 0, 0, 0.15);
      color: rgba(0, 0, 0, 0.7);
    }
  }

  &__clear-icon {
    width: 12px;
    height: 12px;
  }

  &__prepend,
  &__append {
    display: flex;
    align-items: center;
    color: #8e8e93;
    font-size: 1.1em;
    flex-shrink: 0;
  }

  &--dense {
    font-size: 11px;

    .x-input__inner-wrapper {
      height: 20px;
      border-radius: 4px;
    }

    .x-input__native {
      padding: 0 6px;
    }

    .x-input__clear {
      width: 12px;
      height: 12px;
      margin-right: 4px;
    }
  }

  &--disabled {
    opacity: 0.45;
    pointer-events: none;

    .x-input__inner-wrapper {
      background-color: #f5f5f7;
    }
  }

  &--readonly {
    .x-input__inner-wrapper {
      background-color: #f5f5f7;
      box-shadow: none;
    }
  }
}
</style>

<style lang="scss">
/* Global dark mode overrides for XInput */
.body--dark {
  .x-input {
    &__inner-wrapper {
      background-color: rgba(255, 255, 255, 0.05) !important;
      border-color: rgba(255, 255, 255, 0.15) !important;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2) !important;

      &:has(.x-input__native:focus) {
        box-shadow: 0 0 0 2.5px rgba(10, 132, 255, 0.5) !important;
        border-color: #0a84ff !important;
      }
    }

    &__native {
      color: #f5f5f7 !important;

      &::placeholder {
        color: rgba(255, 255, 255, 0.35) !important;
      }
    }

    &__clear {
      background-color: rgba(255, 255, 255, 0.15) !important;
      color: rgba(255, 255, 255, 0.6) !important;

      &:hover {
        background-color: rgba(255, 255, 255, 0.25) !important;
        color: rgba(255, 255, 255, 0.8) !important;
      }
    }

    &--disabled {
      .x-input__inner-wrapper {
        background-color: rgba(255, 255, 255, 0.02) !important;
      }
    }

    &--readonly {
      .x-input__inner-wrapper {
        background-color: rgba(255, 255, 255, 0.02) !important;
        box-shadow: none !important;
      }
    }
  }
}
</style>
