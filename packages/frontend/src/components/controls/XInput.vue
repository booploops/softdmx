<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { computed, ref } from 'vue';

type InputSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const props = withDefaults(
  defineProps<{
    modelValue?: string | number;
    type?: string;
    placeholder?: string;
    disable?: boolean;
    readonly?: boolean;
    dense?: boolean;
    clearable?: boolean;
    label?: string;
    size?: InputSize;
  }>(),
  {
    modelValue: '',
    type: 'text',
    placeholder: '',
    disable: false,
    readonly: false,
    dense: false,
    clearable: false,
    label: '',
  }
);

const computedSize = computed(() => {
  return props.size || (props.dense ? 'sm' : 'md');
});

const emit = defineEmits<{
  'update:modelValue': [string];
  'focus': [FocusEvent];
  'blur': [FocusEvent];
  'clear': [];
}>();

const isFocused = ref(false);

const isShrunk = computed(() => {
  return (
    isFocused.value ||
    (props.modelValue !== undefined &&
      props.modelValue !== null &&
      props.modelValue !== '')
  );
});

const activePlaceholder = computed(() => {
  if (props.label && !isShrunk.value) {
    return '';
  }
  return props.placeholder;
});

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
};

const onFocus = (event: FocusEvent) => {
  isFocused.value = true;
  emit('focus', event);
};

const onBlur = (event: FocusEvent) => {
  isFocused.value = false;
  emit('blur', event);
};

const clear = () => {
  emit('update:modelValue', '');
  emit('clear');
};
</script>

<template>
  <div
    class="x-input"
    :class="[
      `x-input--size-${computedSize}`,
      {
        'x-input--disabled': disable,
        'x-input--readonly': readonly,
        'x-input--has-label': label,
      }
    ]"
  >
    <!-- Prepend Slot -->
    <div
      v-if="$slots.prepend"
      class="x-input__prepend"
    >
      <slot name="prepend" />
    </div>

    <div class="x-input__inner-wrapper">
      <span
        v-if="label"
        class="x-input__label"
        :class="{ 'x-input__label--shrunk': isShrunk }"
      >
        {{ label }}
      </span>

      <input
        class="x-input__native"
        :type="type"
        :value="modelValue"
        :placeholder="activePlaceholder"
        :disabled="disable"
        :readonly="readonly"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
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

  &--size-xs {
    font-size: 10px;

    .x-input__inner-wrapper {
      height: 18px;
      border-radius: 3px;
    }

    .x-input__native {
      padding: 0 4px;
    }

    .x-input__clear {
      width: 10px;
      height: 10px;
      margin-right: 3px;
    }

    .x-input__label {
      left: 4px;
      right: 16px;
      font-size: 10px;

      &--shrunk {
        top: 2px;
        transform: none;
        font-size: 8px;
        color: #8e8e93;
      }
    }

    &.x-input--has-label {
      .x-input__inner-wrapper {
        height: 26px;
      }

      .x-input__native {
        padding: 10px 4px 1px 4px;
      }
    }
  }

  &--size-sm {
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

    .x-input__label {
      left: 6px;
      right: 20px;
      font-size: 11px;

      &--shrunk {
        top: 3px;
        transform: none;
        font-size: 9px;
        color: #8e8e93;
      }
    }

    &.x-input--has-label {
      .x-input__inner-wrapper {
        height: 30px;
      }

      .x-input__native {
        padding: 11px 6px 1px 6px;
      }
    }
  }

  &--size-md {
    font-size: 13px;

    .x-input__inner-wrapper {
      height: 24px;
      border-radius: 5px;
    }

    .x-input__native {
      padding: 0 8px;
    }

    .x-input__clear {
      width: 14px;
      height: 14px;
      margin-right: 6px;
    }

    .x-input__label {
      left: 8px;
      right: 24px;
      font-size: 13px;

      &--shrunk {
        top: 4px;
        transform: none;
        font-size: 10px;
        color: #8e8e93;
      }
    }

    &.x-input--has-label {
      .x-input__inner-wrapper {
        height: 38px;
      }

      .x-input__native {
        padding: 14px 8px 2px 8px;
      }
    }
  }

  &--size-lg {
    font-size: 15px;

    .x-input__inner-wrapper {
      height: 32px;
      border-radius: 6px;
    }

    .x-input__native {
      padding: 0 10px;
    }

    .x-input__clear {
      width: 16px;
      height: 16px;
      margin-right: 8px;
    }

    .x-input__label {
      left: 10px;
      right: 30px;
      font-size: 15px;

      &--shrunk {
        top: 6px;
        transform: none;
        font-size: 12px;
        color: #8e8e93;
      }
    }

    &.x-input--has-label {
      .x-input__inner-wrapper {
        height: 48px;
      }

      .x-input__native {
        padding: 18px 10px 2px 10px;
      }
    }
  }

  &--size-xl {
    font-size: 18px;

    .x-input__inner-wrapper {
      height: 40px;
      border-radius: 8px;
    }

    .x-input__native {
      padding: 0 12px;
    }

    .x-input__clear {
      width: 18px;
      height: 18px;
      margin-right: 10px;
    }

    .x-input__label {
      left: 12px;
      right: 36px;
      font-size: 18px;

      &--shrunk {
        top: 8px;
        transform: none;
        font-size: 14px;
        color: #8e8e93;
      }
    }

    &.x-input--has-label {
      .x-input__inner-wrapper {
        height: 58px;
      }

      .x-input__native {
        padding: 22px 12px 2px 12px;
      }
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

  &__label {
    position: absolute;
    pointer-events: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1;
    z-index: 1;
    color: rgba(0, 0, 0, 0.35);
    top: 50%;
    transform: translateY(-50%);
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

    &__label {
      color: rgba(255, 255, 255, 0.35) !important;

      &--shrunk {
        color: rgba(255, 255, 255, 0.5) !important;
      }
    }
  }
}
</style>
