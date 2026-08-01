<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts" generic="T = string | number | boolean">
import XSelect from 'src/components/controls/XSelect.vue';

type OptionObject<V> = {
  label: string;
  value: V;
  disable?: boolean;
};

type OptionType<V> = V | OptionObject<V>;

const props = withDefaults(
  defineProps<{
    modelValue: T;
    options: OptionType<T>[];
    label?: string;
    disabled?: boolean;
    dense?: boolean;
    size?: 'sm' | 'md';
    info?: string;
  }>(),
  {
    label: '',
    disabled: false,
    dense: false,
    size: 'md',
  }
);

const emit = defineEmits<{
  'update:modelValue': [T];
  change: [T];
}>();

const isDense = computed(() => props.dense || props.size === 'sm');

function onUpdate(value: T) {
  emit('update:modelValue', value);
}

function onChange(value: T) {
  emit('change', value);
}
</script>

<template>
  <XSelect
    :model-value="modelValue"
    :options="options"
    :label="label"
    :disable="disabled"
    :dense="isDense"
    class="sdmx-select sdmx-focus-ring"
    :class="[`sdmx-select--${size}`, { 'sdmx-select--labeled': label }]"
    :data-sdmx-info="info"
    @update:model-value="onUpdate"
    @change="onChange"
  />
</template>

<style scoped>
.sdmx-select {
  width: 100%;
  min-width: 0;
  font-size: var(--sdmx-font-size-label);
}

.sdmx-select :deep(.x-select__button) {
  background: var(--sdmx-color-bg-elevated);
  border: 1px solid var(--sdmx-color-border-subtle);
  color: var(--sdmx-color-text);
  box-shadow: none;
  border-radius: var(--sdmx-radius-button);
}

.sdmx-select :deep(.x-select__native:active:not(:disabled) + .x-select__button) {
  background: var(--sdmx-color-bg-active);
}

.sdmx-select :deep(.x-select__native:focus-visible + .x-select__button) {
  box-shadow: 0 0 0 2px var(--sdmx-color-focus-ring);
}

.sdmx-select :deep(.x-select__arrows) {
  color: var(--sdmx-color-primary);
}

.sdmx-select :deep(.x-select__label) {
  color: var(--sdmx-color-text-faint);
}

.sdmx-select :deep(.x-select__label--shrunk) {
  color: var(--sdmx-color-text-muted);
}

.sdmx-select--sm :deep(.x-select__button) {
  height: 28px;
  padding: 0 var(--sdmx-space-sm);
  font-size: var(--sdmx-font-size-caption);
  border-radius: var(--sdmx-radius-sm);
}

.sdmx-select--sm :deep(.x-select__arrows-svg) {
  width: 7px;
  height: 11px;
}

.sdmx-select--md :deep(.x-select__button) {
  height: 36px;
  padding: 0 var(--sdmx-space-md);
}

.sdmx-select--labeled.sdmx-select--md :deep(.x-select__button) {
  height: 44px;
  padding-bottom: var(--sdmx-space-xs);
}

.sdmx-select--labeled.sdmx-select--sm :deep(.x-select__button) {
  height: 36px;
  padding-bottom: var(--sdmx-space-xs);
}
</style>
