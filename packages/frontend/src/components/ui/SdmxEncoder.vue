<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: number;
    label: string;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    changed?: boolean;
    selected?: boolean;
    disabled?: boolean;
    info?: string;
  }>(),
  {
    min: 0,
    max: 255,
    step: 1,
    changed: false,
    selected: false,
    disabled: false,
  }
);

const emit = defineEmits<{ 'update:modelValue': [number]; delta: [number] }>();

const displayValue = computed(() => {
  if (props.unit === '%') {
    return Math.round((props.modelValue / props.max) * 100);
  }
  return Math.round(props.modelValue);
});

function onWheel(event: WheelEvent) {
  if (props.disabled) return;
  event.preventDefault();
  const direction = event.deltaY > 0 ? -1 : 1;
  const delta = direction * props.step * (event.shiftKey ? 10 : 1);
  const next = Math.min(props.max, Math.max(props.min, props.modelValue + delta));
  emit('update:modelValue', next);
  emit('delta', delta);
}

function onInput(event: Event) {
  const value = Number((event.target as HTMLInputElement).value);
  if (Number.isFinite(value)) {
    emit('update:modelValue', value);
  }
}
</script>

<template>
  <div
    class="sdmx-encoder sdmx-focus-ring"
    :class="{
      'sdmx-encoder--changed': changed,
      'sdmx-encoder--selected': selected,
      'sdmx-encoder--disabled': disabled,
    }"
    :data-sdmx-info="info"
    @wheel="onWheel"
  >
    <div class="sdmx-encoder__indicator" :class="{ 'sdmx-encoder__indicator--changed': changed }" />
    <span class="sdmx-encoder__label">{{ label }}</span>
    <input
      type="range"
      class="sdmx-encoder__input"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      :disabled="disabled"
      @input="onInput"
    />
    <SdmxValueField :value="displayValue" :unit="unit" size="sm" />
  </div>
</template>

<style scoped>
.sdmx-encoder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sdmx-space-xs);
  padding: var(--sdmx-space-sm);
  border-radius: var(--sdmx-radius-sm);
  border: 1px solid var(--sdmx-color-border-subtle);
  background: var(--sdmx-color-bg-surface);
  min-width: 72px;
  position: relative;
  transition:
    border-color var(--sdmx-motion-duration-fast) var(--sdmx-motion-easing),
    background var(--sdmx-motion-duration-fast) var(--sdmx-motion-easing);
}

.sdmx-encoder--selected {
  border-color: var(--sdmx-color-primary);
  background: var(--sdmx-color-primary-soft);
}

.sdmx-encoder--changed {
  border-left: 3px solid var(--sdmx-color-scratch);
}

.sdmx-encoder--disabled {
  opacity: 0.45;
  pointer-events: none;
}

.sdmx-encoder__indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  border-radius: var(--sdmx-radius-sm) 0 0 var(--sdmx-radius-sm);
  background: transparent;
  transition: background var(--sdmx-motion-duration-fast) var(--sdmx-motion-easing);
}

.sdmx-encoder__indicator--changed {
  background: var(--sdmx-color-scratch);
}

.sdmx-encoder__label {
  font-size: var(--sdmx-font-size-caption);
  color: var(--sdmx-color-text-muted);
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sdmx-encoder__input {
  width: 100%;
  accent-color: var(--sdmx-color-primary);
  cursor: pointer;
}
</style>
