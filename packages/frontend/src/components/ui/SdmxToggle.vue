<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    label?: string;
    icon?: string;
    disabled?: boolean;
    info?: string;
  }>(),
  { disabled: false }
);

const emit = defineEmits<{ 'update:modelValue': [boolean] }>();

function toggle() {
  if (props.disabled) return;
  emit('update:modelValue', !props.modelValue);
}
</script>

<template>
  <button
    type="button"
    class="sdmx-toggle sdmx-focus-ring"
    :class="{ 'sdmx-toggle--on': modelValue, 'sdmx-toggle--disabled': disabled }"
    :disabled="disabled"
    :data-sdmx-info="info"
    @click="toggle"
  >
    <span class="sdmx-toggle__track">
      <span class="sdmx-toggle__thumb" />
    </span>
    <span v-if="label || icon" class="sdmx-toggle__label">
      <XIcon v-if="icon" :name="icon" size="16px" />
      {{ label }}
    </span>
  </button>
</template>

<style scoped>
.sdmx-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--sdmx-space-sm);
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--sdmx-space-xs);
  color: var(--sdmx-color-text-muted);
  font-size: var(--sdmx-font-size-label);
  min-height: var(--sdmx-space-touch);
}

.sdmx-toggle--disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.sdmx-toggle__track {
  display: block;
  width: 36px;
  height: 20px;
  border-radius: var(--sdmx-radius-full);
  background: var(--sdmx-color-bg-muted);
  border: 1px solid var(--sdmx-color-border-subtle);
  position: relative;
  transition: background var(--sdmx-motion-duration-fast) var(--sdmx-motion-easing);
}

.sdmx-toggle--on .sdmx-toggle__track {
  background: var(--sdmx-color-primary);
  border-color: var(--sdmx-color-primary);
}

.sdmx-toggle__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: var(--sdmx-radius-full);
  background: var(--sdmx-color-text);
  transition: transform var(--sdmx-motion-duration-fast) var(--sdmx-motion-easing);
}

.sdmx-toggle--on .sdmx-toggle__thumb {
  transform: translateX(16px);
}

.sdmx-toggle__label {
  display: inline-flex;
  align-items: center;
  gap: var(--sdmx-space-xs);
}
</style>
