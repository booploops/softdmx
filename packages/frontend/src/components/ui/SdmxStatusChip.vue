<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
type StatusVariant = 'default' | 'positive' | 'negative' | 'warning' | 'info' | 'active' | 'armed';

const props = withDefaults(
  defineProps<{
    label: string;
    icon?: string;
    variant?: StatusVariant;
    dense?: boolean;
    info?: string;
  }>(),
  {
    variant: 'default',
    dense: true,
  }
);
</script>

<template>
  <span
    class="sdmx-status-chip"
    :class="[`sdmx-status-chip--${variant}`, { 'sdmx-status-chip--dense': dense }]"
    :data-sdmx-info="info"
  >
    <q-icon v-if="icon" :name="icon" size="14px" class="sdmx-status-chip__icon" />
    <span class="sdmx-status-chip__label">{{ label }}</span>
  </span>
</template>

<style scoped>
.sdmx-status-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--sdmx-space-xs);
  padding: 2px var(--sdmx-space-sm);
  border-radius: var(--sdmx-radius-sm);
  font-size: var(--sdmx-font-size-caption);
  font-weight: var(--sdmx-font-weight);
  background: var(--sdmx-color-bg-elevated);
  border: 1px solid var(--sdmx-color-border-subtle);
  color: var(--sdmx-color-text);
  max-width: 160px;
  overflow: hidden;
}

.sdmx-status-chip--dense {
  padding: 1px 6px;
  font-size: 10px;
}

.sdmx-status-chip__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sdmx-status-chip--positive {
  background: color-mix(in srgb, var(--sdmx-color-positive) 15%, transparent);
  border-color: color-mix(in srgb, var(--sdmx-color-positive) 35%, transparent);
  color: var(--sdmx-color-positive);
}

.sdmx-status-chip--negative {
  background: var(--sdmx-color-negative-soft);
  border-color: var(--sdmx-color-negative-border);
  color: var(--sdmx-color-negative);
}

.sdmx-status-chip--warning {
  background: color-mix(in srgb, var(--sdmx-color-warning) 15%, transparent);
  border-color: color-mix(in srgb, var(--sdmx-color-warning) 35%, transparent);
  color: var(--sdmx-color-warning);
}

.sdmx-status-chip--info {
  background: color-mix(in srgb, var(--sdmx-color-info) 15%, transparent);
  border-color: color-mix(in srgb, var(--sdmx-color-info) 35%, transparent);
  color: var(--sdmx-color-info);
}

.sdmx-status-chip--active {
  background: var(--sdmx-color-active-soft);
  border-color: color-mix(in srgb, var(--sdmx-color-active) 40%, transparent);
  color: var(--sdmx-color-active);
}

.sdmx-status-chip--armed {
  background: var(--sdmx-color-armed-soft);
  border-color: color-mix(in srgb, var(--sdmx-color-armed) 40%, transparent);
  color: var(--sdmx-color-armed);
}
</style>
