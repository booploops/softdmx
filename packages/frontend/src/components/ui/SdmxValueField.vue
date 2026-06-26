<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
withDefaults(
  defineProps<{
    value: string | number;
    label?: string;
    unit?: string;
    size?: 'sm' | 'md' | 'lg';
    color?: string;
    info?: string;
  }>(),
  { size: 'md' }
);
</script>

<template>
  <div class="sdmx-value-field" :class="`sdmx-value-field--${size}`" :data-sdmx-info="info">
    <span v-if="label" class="sdmx-value-field__label">{{ label }}</span>
    <span class="sdmx-value-field__value" :style="color ? { color } : undefined">
      {{ value }}<span v-if="unit" class="sdmx-value-field__unit">{{ unit }}</span>
    </span>
  </div>
</template>

<style scoped>
.sdmx-value-field {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
}

.sdmx-value-field__label {
  font-size: var(--sdmx-font-size-caption);
  color: var(--sdmx-color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.sdmx-value-field__value {
  font-family: var(--sdmx-font-family-mono);
  font-variant-numeric: tabular-nums;
  font-weight: var(--sdmx-font-weight-bold);
  color: var(--sdmx-color-text);
}

.sdmx-value-field--sm .sdmx-value-field__value {
  font-size: var(--sdmx-font-size-label);
}

.sdmx-value-field--md .sdmx-value-field__value {
  font-size: var(--sdmx-font-size-mono);
}

.sdmx-value-field--lg .sdmx-value-field__value {
  font-size: var(--sdmx-font-size-display);
}

.sdmx-value-field__unit {
  font-size: 0.75em;
  font-weight: var(--sdmx-font-weight);
  color: var(--sdmx-color-text-muted);
  margin-left: 2px;
}
</style>
