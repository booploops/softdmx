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
    label?: string;
    min?: number;
    max?: number;
    step?: number;
    vertical?: boolean;
    color?: string;
    showValue?: boolean;
    disabled?: boolean;
    info?: string;
  }>(),
  {
    min: 0,
    max: 1,
    step: 0.01,
    vertical: false,
    showValue: true,
    disabled: false,
  }
);

const emit = defineEmits<{ 'update:modelValue': [number] }>();

const displayValue = computed(() => {
  if (props.max <= 1 && props.min >= 0) {
    return `${Math.round(props.modelValue * 100)}%`;
  }
  return String(Math.round(props.modelValue));
});

function update(value: number | null) {
  if (value === null || props.disabled) return;
  emit('update:modelValue', value);
}
</script>

<template>
  <div
    class="sdmx-fader"
    :class="{ 'sdmx-fader--vertical': vertical, 'sdmx-fader--disabled': disabled }"
    :data-sdmx-info="info"
  >
    <span v-if="label" class="sdmx-fader__label">{{ label }}</span>
    <q-slider
      :model-value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :vertical="vertical"
      :reverse="vertical"
      :color="color ?? 'primary'"
      :disable="disabled"
      class="sdmx-fader__slider"
      :class="{ 'sdmx-fader__slider--vertical': vertical }"
      @update:model-value="update"
    />
    <SdmxValueField
      v-if="showValue"
      :value="displayValue"
      size="sm"
      :color="color ? `var(--sdmx-color-${color}, ${color})` : undefined"
    />
  </div>
</template>

<style scoped>
.sdmx-fader {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sdmx-space-xs);
}

.sdmx-fader--vertical {
  flex-direction: column;
  height: 100%;
}

.sdmx-fader--disabled {
  opacity: 0.45;
}

.sdmx-fader__label {
  font-size: var(--sdmx-font-size-caption);
  color: var(--sdmx-color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sdmx-fader__slider {
  width: 100%;
}

.sdmx-fader__slider--vertical {
  flex: 1 1 auto;
  min-height: 88px;
  width: 28px;
}
</style>
