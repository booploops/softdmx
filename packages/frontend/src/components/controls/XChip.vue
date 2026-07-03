<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { computed } from 'vue';
import XIcon from './XIcon.vue';

type ChipSize = 'xs' | 'sm' | 'md' | 'lg';

const props = withDefaults(
  defineProps<{
    label?: string;
    icon?: string;
    iconRight?: string;
    color?: string;
    textColor?: string;
    dense?: boolean;
    outline?: boolean;
    clickable?: boolean;
    removable?: boolean;
    size?: ChipSize;
  }>(),
  {
    dense: false,
    outline: false,
    clickable: false,
    removable: false,
    size: 'md',
  }
);

const emit = defineEmits<{
  click: [MouseEvent];
  remove: [MouseEvent];
}>();

const isPresetColor = computed(() => {
  if (!props.color) return false;
  return [
    'default',
    'primary',
    'positive',
    'negative',
    'warning',
    'info',
    'active',
    'armed',
    'danger',
  ].includes(props.color);
});

const isPresetTextColor = computed(() => {
  if (!props.textColor) return false;
  return [
    'default',
    'primary',
    'positive',
    'negative',
    'warning',
    'info',
    'active',
    'armed',
    'danger',
  ].includes(props.textColor);
});

const classes = computed(() => {
  const list = [
    'x-chip',
    `x-chip--size-${props.size}`,
  ];

  if (props.color) {
    if (isPresetColor.value) {
      list.push(`x-chip--color-${props.color}`);
    } else {
      if (props.color.startsWith('bg-')) {
        list.push(props.color);
      } else {
        list.push(`bg-${props.color}`);
      }
    }
  } else {
    list.push('x-chip--color-default');
  }

  if (props.textColor) {
    if (isPresetTextColor.value) {
      list.push(`x-chip--text-${props.textColor}`);
    } else {
      if (props.textColor.startsWith('text-')) {
        list.push(props.textColor);
      } else {
        list.push(`text-${props.textColor}`);
      }
    }
  }

  if (props.dense) list.push('x-chip--dense');
  if (props.outline) list.push('x-chip--outline');
  if (props.clickable) list.push('x-chip--clickable');
  if (props.removable) list.push('x-chip--removable');

  return list;
});

const styles = computed(() => {
  const s: Record<string, string> = {};

  if (props.color) {
    const isHexOrRgb = /^(#|rgb|hsl|var\()/.test(props.color);
    if (isHexOrRgb) {
      if (props.outline) {
        s.borderColor = props.color;
        s.color = props.color;
        s.backgroundColor = 'transparent';
      } else {
        s.backgroundColor = props.color;
      }
    }
  }

  if (props.textColor) {
    const isHexOrRgb = /^(#|rgb|hsl|var\()/.test(props.textColor);
    if (isHexOrRgb) {
      s.color = props.textColor;
    }
  }

  return s;
});

const computedIconSize = computed(() => {
  if (props.dense || props.size === 'xs' || props.size === 'sm') return 'xs';
  return 'sm';
});

function handleClick(event: MouseEvent) {
  if (props.clickable) {
    emit('click', event);
  }
}

function handleRemove(event: MouseEvent) {
  if (props.removable) {
    emit('remove', event);
  }
}
</script>

<template>
  <span
    :class="classes"
    :style="styles"
    @click="handleClick"
  >
    <XIcon
      v-if="icon"
      :name="icon"
      :size="computedIconSize"
      class="x-chip__icon x-chip__icon--left"
    />
    <span class="x-chip__content">
      <slot>{{ label }}</slot>
    </span>
    <XIcon
      v-if="removable"
      name="x"
      size="xs"
      class="x-chip__icon x-chip__icon--remove"
      @click.stop="handleRemove"
    />
    <XIcon
      v-else-if="iconRight"
      :name="iconRight"
      :size="computedIconSize"
      class="x-chip__icon x-chip__icon--right"
    />
  </span>
</template>

<style scoped lang="scss">
.x-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--sdmx-space-xs, 4px);
  border-radius: var(--sdmx-radius-sm, 4px);
  font-weight: var(--sdmx-font-weight, 400);
  border: 1px solid transparent;
  box-sizing: border-box;
  white-space: nowrap;
  vertical-align: middle;
  transition: background-color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
  max-width: 100%;
  overflow: hidden;

  // Sizes
  &--size-xs {
    height: 16px;
    font-size: 10px;
    padding: 0 4px;
  }

  &--size-sm {
    height: 20px;
    font-size: 11px;
    padding: 0 6px;
  }

  &--size-md {
    height: 24px;
    font-size: 12px;
    padding: 0 8px;
  }

  &--size-lg {
    height: 32px;
    font-size: 14px;
    padding: 0 12px;
    border-radius: 6px;
  }

  &--dense {
    padding-left: 6px;
    padding-right: 6px;
    font-size: 10px;
    height: 18px;
  }

  &__content {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: inline-block;
  }

  &__icon {
    flex-shrink: 0;
    
    &--remove {
      cursor: pointer;
      opacity: 0.7;
      border-radius: 50%;
      padding: 1px;
      margin-left: 2px;

      &:hover {
        opacity: 1;
        background-color: rgba(255, 255, 255, 0.15);
      }
    }
  }

  &--clickable {
    cursor: pointer;
    user-select: none;

    &:hover {
      filter: brightness(1.1);
    }

    &:active {
      filter: brightness(0.9);
    }
  }

  // Preset Colors Styling - Solid (Default)
  &--color-default {
    background: var(--sdmx-color-bg-elevated, #222226);
    border-color: var(--sdmx-color-border-subtle, rgba(255, 255, 255, 0.07));
    color: var(--sdmx-color-text, #fafafa);
  }

  &--color-primary {
    background: var(--sdmx-color-primary-soft, rgba(99, 102, 241, 0.2));
    border-color: var(--sdmx-color-primary-ring, rgba(99, 102, 241, 0.6));
    color: var(--sdmx-color-primary, #6366f1);
  }

  &--color-positive {
    background: color-mix(in srgb, var(--sdmx-color-positive, #21ba45) 15%, transparent);
    border-color: color-mix(in srgb, var(--sdmx-color-positive, #21ba45) 35%, transparent);
    color: var(--sdmx-color-positive, #21ba45);
  }

  &--color-negative,
  &--color-danger {
    background: var(--sdmx-color-negative-soft, rgba(239, 68, 68, 0.1));
    border-color: var(--sdmx-color-negative-border, rgba(239, 68, 68, 0.3));
    color: var(--sdmx-color-negative, #ef4444);
  }

  &--color-warning {
    background: color-mix(in srgb, var(--sdmx-color-warning, #f59e0b) 15%, transparent);
    border-color: color-mix(in srgb, var(--sdmx-color-warning, #f59e0b) 35%, transparent);
    color: var(--sdmx-color-warning, #f59e0b);
  }

  &--color-info {
    background: color-mix(in srgb, var(--sdmx-color-info, #38bdf8) 15%, transparent);
    border-color: color-mix(in srgb, var(--sdmx-color-info, #38bdf8) 35%, transparent);
    color: var(--sdmx-color-info, #38bdf8);
  }

  &--color-active {
    background: var(--sdmx-color-active-soft, rgba(34, 197, 94, 0.18));
    border-color: color-mix(in srgb, var(--sdmx-color-active, #22c55e) 40%, transparent);
    color: var(--sdmx-color-active, #22c55e);
  }

  &--color-armed {
    background: var(--sdmx-color-armed-soft, rgba(245, 158, 11, 0.18));
    border-color: color-mix(in srgb, var(--sdmx-color-armed, #f59e0b) 40%, transparent);
    color: var(--sdmx-color-armed, #f59e0b);
  }

  // Outline modifier styles
  &--outline {
    background: transparent !important;
    
    &.x-chip--color-default {
      border-color: var(--sdmx-color-border-subtle, rgba(255, 255, 255, 0.07)) !important;
      color: var(--sdmx-color-text, #fafafa) !important;
    }

    &.x-chip--color-primary {
      border-color: var(--sdmx-color-primary, #6366f1) !important;
      color: var(--sdmx-color-primary, #6366f1) !important;
    }

    &.x-chip--color-positive {
      border-color: var(--sdmx-color-positive, #21ba45) !important;
      color: var(--sdmx-color-positive, #21ba45) !important;
    }

    &.x-chip--color-negative,
    &.x-chip--color-danger {
      border-color: var(--sdmx-color-negative, #ef4444) !important;
      color: var(--sdmx-color-negative, #ef4444) !important;
    }

    &.x-chip--color-warning {
      border-color: var(--sdmx-color-warning, #f59e0b) !important;
      color: var(--sdmx-color-warning, #f59e0b) !important;
    }

    &.x-chip--color-info {
      border-color: var(--sdmx-color-info, #38bdf8) !important;
      color: var(--sdmx-color-info, #38bdf8) !important;
    }

    &.x-chip--color-active {
      border-color: var(--sdmx-color-active, #22c55e) !important;
      color: var(--sdmx-color-active, #22c55e) !important;
    }

    &.x-chip--color-armed {
      border-color: var(--sdmx-color-armed, #f59e0b) !important;
      color: var(--sdmx-color-armed, #f59e0b) !important;
    }
  }
}
</style>
