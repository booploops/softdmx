<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    label: string;
    icon?: string;
    disable?: boolean;
  }>(),
  {
    modelValue: undefined,
    disable: false,
  }
);

const emit = defineEmits<{ 'update:modelValue': [boolean] }>();

const isLocalOpen = ref(false);

const isOpen = ref(false);

// Sync with parent v-model if defined
watch(
  () => props.modelValue,
  (val) => {
    if (val !== undefined) {
      isOpen.value = val;
    }
  },
  { immediate: true }
);

function toggle() {
  if (props.disable) return;
  const next = !isOpen.value;
  isOpen.value = next;
  emit('update:modelValue', next);
}
</script>

<template>
  <div
    class="x-collapse-item"
    :class="{
      'x-collapse-item--open': isOpen,
      'x-collapse-item--disabled': disable,
    }"
  >
    <div
      class="x-collapse-item__header"
      :tabindex="disable ? -1 : 0"
      @click="toggle"
      @keydown.space.prevent="toggle"
      @keydown.enter.prevent="toggle"
    >
      <span class="x-collapse-item__disclosure">
        <!-- macOS Catalina style disclosure triangle -->
        <svg
          viewBox="0 0 10 10"
          class="x-collapse-item__triangle"
        >
          <path
            d="M2.5 1.5L7.5 5L2.5 8.5V1.5Z"
            fill="currentColor"
          />
        </svg>
      </span>
      <q-icon
        v-if="icon"
        :name="icon"
        class="x-collapse-item__icon"
      />
      <span class="x-collapse-item__label">{{ label }}</span>
    </div>

    <!-- Content container — using v-show to instantly show/hide without animations -->
    <div
      v-show="isOpen"
      class="x-collapse-item__content"
    >
      <slot></slot>
    </div>
  </div>
</template>

<style scoped lang="scss">
.x-collapse-item {
  width: 100%;
  box-sizing: border-box;
  font-size: 13px;
  color: #1d1d1f;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);

  &__header {
    display: flex;
    align-items: center;
    height: 28px;
    padding: 0 8px;
    cursor: default;
    user-select: none;
    outline: none;

    &:hover {
      background-color: rgba(0, 0, 0, 0.03);
    }

    &:focus-visible {
      box-shadow: inset 0 0 0 2.5px rgba(0, 122, 255, 0.5);
    }
  }

  &__disclosure {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 12px;
    margin-right: 6px;
    color: #8e8e93;
  }

  &__triangle {
    width: 8px;
    height: 8px;
  }

  &__icon {
    margin-right: 6px;
    font-size: 15px;
    color: #8e8e93;
  }

  &__label {
    font-weight: 500;
    line-height: 1;
  }

  // Rotate triangle instantly on open
  &--open {
    .x-collapse-item__disclosure {
      transform: rotate(90deg);
    }
  }

  &__content {
    padding: 12px;
    background-color: #fafafa;
    border-top: 1px solid rgba(0, 0, 0, 0.05);
  }

  &--disabled {
    opacity: 0.45;
    pointer-events: none;
  }
}
</style>

<style lang="scss">
/* Global dark mode overrides for XCollapseItem inside .body--dark */
.body--dark {
  .x-collapse-item {
    color: #f5f5f7 !important;
    border-bottom-color: rgba(255, 255, 255, 0.08) !important;

    .x-collapse-item__header {
      &:hover {
        background-color: rgba(255, 255, 255, 0.05) !important;
      }
    }

    .x-collapse-item__disclosure {
      color: #a1a1aa !important;
    }

    .x-collapse-item__icon {
      color: #a1a1aa !important;
    }

    .x-collapse-item__content {
      background-color: #1a1a1a !important;
      border-top-color: rgba(255, 255, 255, 0.05) !important;
    }
  }
}
</style>
