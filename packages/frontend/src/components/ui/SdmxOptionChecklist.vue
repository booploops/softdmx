<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
export type ChecklistOption = {
  label: string;
  value: string;
  disable?: boolean;
};

const props = withDefaults(
  defineProps<{
    options: ChecklistOption[];
    modelValue: string | string[];
    /** When true, modelValue is string[]; otherwise a single string. */
    multiple?: boolean;
    label?: string;
    emptyHint?: string;
    maxHeight?: string;
    info?: string;
  }>(),
  {
    multiple: false,
    emptyHint: 'No options available',
    maxHeight: '160px',
  }
);

const emit = defineEmits<{
  'update:modelValue': [string | string[]];
}>();

function isChecked(value: string): boolean {
  if (props.multiple) {
    return Array.isArray(props.modelValue) && props.modelValue.includes(value);
  }
  return props.modelValue === value;
}

function onToggle(value: string, checked: boolean) {
  if (props.multiple) {
    const current = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
    if (checked) {
      if (!current.includes(value)) current.push(value);
    } else {
      const index = current.indexOf(value);
      if (index > -1) current.splice(index, 1);
    }
    emit('update:modelValue', current);
    return;
  }

  // Single-select: checking selects; unchecking clears only if this value is selected.
  if (checked) {
    emit('update:modelValue', value);
  } else if (props.modelValue === value) {
    emit('update:modelValue', '');
  }
}
</script>

<template>
  <div
    class="sdmx-option-checklist"
    :data-sdmx-info="info"
  >
    <span
      v-if="label"
      class="sdmx-option-checklist__label sdmx-text-caption"
    >{{ label }}</span>
    <div
      class="sdmx-option-checklist__list"
      :style="{ maxHeight }"
    >
      <XCheckbox
        v-for="opt in options"
        :key="opt.value"
        :label="opt.label"
        :disable="opt.disable"
        :model-value="isChecked(opt.value)"
        @update:model-value="(checked) => onToggle(opt.value, !!checked)"
      />
      <span
        v-if="!options.length"
        class="sdmx-option-checklist__empty sdmx-text-caption"
      >{{ emptyHint }}</span>
    </div>
  </div>
</template>

<style scoped>
.sdmx-option-checklist {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-xs);
  min-width: 0;
}

.sdmx-option-checklist__label {
  color: var(--sdmx-color-text-muted);
}

.sdmx-option-checklist__list {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-xs);
  overflow: auto;
  padding: var(--sdmx-space-sm);
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-md);
  background: var(--sdmx-color-bg-surface);
}

.sdmx-option-checklist__empty {
  color: var(--sdmx-color-text-muted);
}
</style>
