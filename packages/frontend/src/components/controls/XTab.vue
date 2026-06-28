<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { inject, computed } from 'vue';

const props = withDefaults(
  defineProps<{
    name: string | number;
    label?: string;
    icon?: string;
    disable?: boolean;
    tooltip?: string;
  }>(),
  {
    disable: false,
  }
);

// Inject context from the parent XTabs component
const context = inject<{
  activeTab: { value: string | number };
  selectTab: (name: string | number) => void;
  dense: { value: boolean };
} | null>('xTabsContext', null);

const isActive = computed(() => {
  return context ? context.activeTab.value === props.name : false;
});

const isDense = computed(() => {
  return context ? context.dense.value : false;
});

function onClick(event: MouseEvent) {
  if (props.disable) return;
  if (context) {
    context.selectTab(props.name);
  }
}
</script>

<template>
  <button
    :class="[
      'x-tab',
      {
        'x-tab--active': isActive,
        'x-tab--dense': isDense,
        'x-tab--disabled': disable,
      }
    ]"
    :disabled="disable"
    :title="tooltip"
    :aria-selected="isActive ? 'true' : 'false'"
    role="tab"
    type="button"
    @click="onClick"
  >
    <div class="x-tab__content">
      <q-icon
        v-if="icon"
        :name="icon"
        class="x-tab__icon"
      />
      <span
        v-if="label"
        class="x-tab__label"
      >{{ label }}</span>
      <!-- Support custom slot for tab label/content if neither label nor icon is specified or alongside them -->
      <slot v-if="!label" />
    </div>

    <!-- Active Indicator Bar -->
    <span
      v-if="isActive"
      class="x-tab__indicator"
      aria-hidden="true"
    />
  </button>
</template>

<style scoped lang="scss">
.x-tab {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  min-height: 38px;
  padding: 8px 16px;
  background: transparent;
  border: none;
  cursor: default;
  font-size: 13px;
  font-weight: 500;
  color: #555557;
  user-select: none;
  outline: none;
  box-sizing: border-box;
  text-align: center;
  transition: color 0.2s ease, background-color 0.2s ease;

  &--dense {
    min-height: 28px;
    padding: 6px 12px;
    font-size: 12px;
  }

  &__content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  &__icon {
    font-size: 18px;

    .x-tab--dense & {
      font-size: 15px;
    }
  }

  // Hover state (subtle highlight)
  &:hover:not(.x-tab--disabled):not(.x-tab--active) {
    color: #1d1d1f;
    background-color: rgba(0, 0, 0, 0.03);
  }

  // Active state
  &--active {
    color: #007aff;
    font-weight: 600;
  }

  // Active indicator line
  &__indicator {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background-color: #007aff;
    border-radius: 2px 2px 0 0;
    animation: fadeIn 0.2s ease;
  }

  // Disabled state
  &--disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  // Focus visible ring
  &:focus-visible {
    background-color: rgba(0, 122, 255, 0.05);
    outline: none;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scaleX(0.8);
  }

  to {
    opacity: 1;
    transform: scaleX(1);
  }
}

.body--dark {
  .x-tab {
    color: #8e8e93;

    &:hover:not(.x-tab--disabled):not(.x-tab--active) {
      color: #ffffff;
      background-color: rgba(255, 255, 255, 0.04);
    }

    &--active {
      color: #0a84ff;
    }

    &__indicator {
      background-color: #0a84ff;
    }
  }
}
</style>
