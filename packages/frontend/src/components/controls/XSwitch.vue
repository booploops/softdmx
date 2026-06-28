<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    label?: string;
    disable?: boolean;
    color?: string; // Optional track color override, e.g. '#007aff'
  }>(),
  {
    disable: false,
  }
);

const emit = defineEmits<{ 'update:modelValue': [boolean] }>();

function toggle() {
  if (props.disable) return;
  emit('update:modelValue', !props.modelValue);
}

const trackStyle = computed(() => {
  if (!props.modelValue) return {};
  return {
    backgroundColor: props.color || 'var(--accent-on-bg)',
    borderColor: props.color || 'var(--accent-on-border)',
  };
});
</script>

<template>
  <button
    type="button"
    class="x-switch"
    :class="{ 'x-switch--on': modelValue, 'x-switch--disabled': disable }"
    :disabled="disable"
    @click="toggle"
  >
    <span class="x-switch__track" :style="trackStyle">
      <span class="x-switch__thumb" />
    </span>
    <span v-if="label" class="x-switch__label">{{ label }}</span>
  </button>
</template>

<style scoped lang="scss">
.x-switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  cursor: default;
  padding: 2px;
  color: #1d1d1f;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 13px;
  user-select: none;
  vertical-align: middle;
  outline: none;

  &__track {
    display: block;
    width: 36px;
    height: 20px;
    border-radius: 10px;
    box-sizing: border-box;
    position: relative;
    
    // Light Mode Off
    background-color: #e5e5ea;
    border: 1px solid rgba(0, 0, 0, 0.15);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);

    --accent-on-bg: #34c759; // macOS System Green for switches
    --accent-on-border: #28a745;
  }

  &:focus-visible &__track {
    box-shadow: 0 0 0 2.5px rgba(0, 122, 255, 0.5);
  }

  &--on &__track {
    background-color: var(--accent-on-bg);
    border-color: var(--accent-on-border);
  }

  &__thumb {
    position: absolute;
    top: 1px;
    left: 1px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background-color: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25), 0 1px 1px rgba(0, 0, 0, 0.1);
  }

  &--on &__thumb {
    transform: translateX(16px);
  }

  &__label {
    line-height: 1;
  }

  &--disabled {
    opacity: 0.45;
    pointer-events: none;
  }
}
</style>

<style lang="scss">
/* Global overrides for XSwitch inside .body--dark */
.body--dark {
  .x-switch {
    color: #f5f5f7 !important;

    .x-switch__track {
      background-color: #3a3a3c !important;
      border: 1px solid rgba(255, 255, 255, 0.15) !important;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2) !important;
      --accent-on-bg: #30d158;
      --accent-on-border: #30d158;
    }

    &.x-switch--on .x-switch__track {
      background-color: var(--accent-on-bg) !important;
      border-color: var(--accent-on-border) !important;
    }

    .x-switch__thumb {
      background: #ffffff !important;
    }
  }
}
</style>
