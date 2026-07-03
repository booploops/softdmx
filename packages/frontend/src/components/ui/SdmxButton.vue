<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
type Variant = 'default' | 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const props = withDefaults(
  defineProps<{
    label?: string;
    icon?: string;
    variant?: Variant;
    size?: Size;
    active?: boolean;
    disabled?: boolean;
    loading?: boolean;
    round?: boolean;
    info?: string;
  }>(),
  {
    variant: 'default',
    size: 'md',
    active: false,
    disabled: false,
    loading: false,
    round: false,
  }
);

const emit = defineEmits<{ click: [MouseEvent] }>();

const computedColor = computed(() => {
  if (props.variant === 'primary') return 'primary';
  if (props.variant === 'danger') return 'danger';
  return 'default';
});

function onClick(event: MouseEvent) {
  if (props.disabled || props.loading) return;
  emit('click', event);
}
</script>

<template>
  <XButton
    :label="label"
    :icon="icon"
    :disable="disabled"
    :loading="loading"
    :color="computedColor"
    :flat="variant === 'ghost'"
    :size="size"
    class="sdmx-btn sdmx-focus-ring"
    :class="[
      `sdmx-btn--${variant}`,
      `sdmx-btn--${size}`,
      { 'sdmx-btn--active': active, 'sdmx-btn--round': round },
    ]"
    :data-sdmx-info="info"
    @click="onClick"
  >
    <slot />
  </XButton>
</template>

<style scoped>
.sdmx-btn {
  font-weight: var(--sdmx-font-weight);
  border-radius: var(--sdmx-radius-button);
}

.sdmx-btn--sm {
  min-height: 28px;
  font-size: var(--sdmx-font-size-caption);
  padding: 0 var(--sdmx-space-sm);
}

.sdmx-btn--md {
  min-height: 36px;
  font-size: var(--sdmx-font-size-label);
  padding: 0 var(--sdmx-space-md);
}

.sdmx-btn--lg {
  min-height: var(--sdmx-space-touch);
  font-size: var(--sdmx-font-size-body);
  padding: 0 var(--sdmx-space-lg);
}

.sdmx-btn--default {
  background: var(--sdmx-color-bg-elevated);
  border: 1px solid var(--sdmx-color-border-subtle);
  color: var(--sdmx-color-text);
}

.sdmx-btn--default:hover:not(.disabled) {
  background: var(--sdmx-color-bg-hover-strong);
}

.sdmx-btn--ghost {
  background: transparent;
  color: var(--sdmx-color-text-muted);
}

.sdmx-btn--ghost:hover:not(.disabled) {
  background: var(--sdmx-color-hover);
  color: var(--sdmx-color-text);
}

.sdmx-btn--active {
  border-color: var(--sdmx-color-primary) !important;
  background: var(--sdmx-color-primary-soft) !important;
  color: var(--sdmx-color-primary) !important;
}

/* Custom styles for secondary and warning variants */
.sdmx-btn--secondary:not(.x-btn--disabled) {
  background: var(--sdmx-color-secondary) !important;
  border-color: var(--sdmx-color-secondary) !important;
  color: #000000 !important;
}
.sdmx-btn--secondary:hover:not(.x-btn--disabled) {
  filter: brightness(0.9) !important;
}
.sdmx-btn--secondary:active:not(.x-btn--disabled) {
  filter: brightness(0.8) !important;
}

.sdmx-btn--warning:not(.x-btn--disabled) {
  background: var(--sdmx-color-warning) !important;
  border-color: var(--sdmx-color-warning) !important;
  color: #000000 !important;
}
.sdmx-btn--warning:hover:not(.x-btn--disabled) {
  filter: brightness(0.9) !important;
}
.sdmx-btn--warning:active:not(.x-btn--disabled) {
  filter: brightness(0.8) !important;
}

/* Custom styles for rounded buttons */
.sdmx-btn--round {
  border-radius: var(--sdmx-radius-full, 9999px) !important;
  padding: 0 !important;
}
.sdmx-btn--round.sdmx-btn--sm {
  width: 20px !important;
  min-width: 0 !important;
}
.sdmx-btn--round.sdmx-btn--md {
  width: 24px !important;
  min-width: 0 !important;
}
.sdmx-btn--round.sdmx-btn--lg {
  width: 32px !important;
  min-width: 0 !important;
}
</style>
