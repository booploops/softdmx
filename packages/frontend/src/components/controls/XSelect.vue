<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts" generic="T = string | number | boolean">
import { computed, ref } from 'vue';

interface OptionObject<V> {
  label: string;
  value: V;
  disable?: boolean;
}

type OptionType<V> = V | OptionObject<V>;

const props = withDefaults(
  defineProps<{
    modelValue: T;
    options: OptionType<T>[];
    disable?: boolean;
    label?: string;
    dense?: boolean;
  }>(),
  {
    disable: false,
    label: '',
    dense: false,
  }
);

const emit = defineEmits<{
  'update:modelValue': [T];
  'change': [T];
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

const normalizedOptions = computed<OptionObject<T>[]>(() => {
  return props.options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      const optionObj = opt as OptionObject<T>;
      return {
        label: optionObj.label !== undefined ? String(optionObj.label) : String(optionObj.value),
        value: optionObj.value,
        disable: !!optionObj.disable,
      };
    }
    return {
      label: String(opt),
      value: opt as T,
      disable: false,
    };
  });
});

const selectedOption = computed(() => {
  return normalizedOptions.value.find((opt) => opt.value === props.modelValue);
});

const displayLabel = computed(() => {
  return selectedOption.value ? selectedOption.value.label : '';
});

const activeDisplayLabel = computed(() => {
  if (props.label && !isShrunk.value) {
    return '';
  }
  return displayLabel.value;
});

function handleChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  const val = target.value;
  // Match stringified value back to actual type if possible
  const matched = normalizedOptions.value.find(o => String(o.value) === val);
  const finalVal = (matched ? matched.value : val) as T;
  emit('update:modelValue', finalVal);
  emit('change', finalVal);
}
</script>

<template>
  <div
    class="x-select"
    :class="{
      'x-select--disabled': disable,
      'x-select--has-label': label,
      'x-select--dense': dense,
    }"
  >
    <!-- Native select covering the button overlay -->
    <select
      :value="modelValue"
      :disabled="disable"
      class="x-select__native"
      @change="handleChange"
      @focus="isFocused = true"
      @blur="isFocused = false"
    >
      <option
        v-for="opt in normalizedOptions"
        :key="opt.value"
        :value="opt.value"
        :disabled="opt.disable"
      >
        {{ opt.label }}
      </option>
    </select>

    <!-- Styled macOS Catalina button container -->
    <div class="x-select__button">
      <span
        v-if="label"
        class="x-select__label"
        :class="{ 'x-select__label--shrunk': isShrunk }"
      >
        {{ label }}
      </span>
      <span class="x-select__text">{{ activeDisplayLabel }}</span>
      <span class="x-select__arrows">
        <!-- Up and Down Caret macOS style double arrows -->
        <svg
          viewBox="0 0 10 16"
          class="x-select__arrows-svg"
        >
          <path
            d="M5 2L1 6H9L5 2Z"
            fill="currentColor"
          />
          <path
            d="M5 14L1 10H9L5 14Z"
            fill="currentColor"
          />
        </svg>
      </span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.x-select {
  display: inline-block;
  width: 100%;
  min-width: 120px;
  position: relative;
  font-size: 13px;
  box-sizing: border-box;

  &__native {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    z-index: 2;
    cursor: default;
    border: none;
    outline: none;
    -webkit-appearance: none;
    appearance: none;

    &:disabled {
      cursor: not-allowed;
    }
  }

  &__button {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 24px;
    padding: 0 8px;
    border-radius: 5px;
    box-sizing: border-box;
    pointer-events: none; // let clicks pass through to native select

    // Light Mode Button Look (Flat Big Sur style)
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.2);
    color: #1d1d1f;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  // Focus visible ring
  &__native:focus-visible+&__button {
    box-shadow: 0 0 0 2.5px rgba(0, 122, 255, 0.5);
  }

  // Active state style matching
  &__native:active:not(:disabled)+&__button {
    background: #e5e5ea;
  }

  &__text {
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    margin-right: 16px;
    line-height: 1;
  }

  &__arrows {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 10px;
    color: #007aff;
  }

  &__arrows-svg {
    width: 8px;
    height: 12px;
  }

  &--disabled {
    opacity: 0.45;
    pointer-events: none;
  }

  &__label {
    position: absolute;
    left: 8px;
    right: 24px;
    pointer-events: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1;
    z-index: 1;
    color: rgba(0, 0, 0, 0.35);
    font-size: 13px;
    top: 50%;
    transform: translateY(-50%);

    &--shrunk {
      top: 4px;
      transform: none;
      font-size: 10px;
      color: #8e8e93;
    }
  }

  &--dense {
    font-size: 11px;

    .x-select__button {
      height: 20px;
      border-radius: 4px;
      padding: 0 6px;
    }

    .x-select__arrows-svg {
      width: 6px;
      height: 10px;
    }
  }

  &--has-label {
    .x-select__button {
      height: 38px;
      align-items: flex-end;
      padding-bottom: 5px;
    }

    &.x-select--dense {
      .x-select__button {
        height: 30px;
        padding-bottom: 3px;
      }

      .x-select__label {
        left: 6px;
        right: 20px;
        font-size: 11px;

        &--shrunk {
          top: 3px;
          font-size: 9px;
        }
      }
    }
  }
}
</style>

<style lang="scss">
// Global styling overrides for dark theme (Flat Big Sur style)
.body--dark {
  .x-select__button {
    background: rgba(255, 255, 255, 0.1) !important;
    border-color: rgba(255, 255, 255, 0.15) !important;
    color: #f5f5f7 !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2) !important;
  }

  .x-select__native:active:not(:disabled)+.x-select__button {
    background: rgba(255, 255, 255, 0.2) !important;
  }

  .x-select__arrows {
    color: #0a84ff !important;
  }

  .x-select__label {
    color: rgba(255, 255, 255, 0.35) !important;

    &--shrunk {
      color: rgba(255, 255, 255, 0.5) !important;
    }
  }
}
</style>
