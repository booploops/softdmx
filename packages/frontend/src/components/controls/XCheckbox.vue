<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    label?: string;
    disable?: boolean;
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

const classes = computed(() => [
  'x-checkbox',
  {
    'x-checkbox--checked': props.modelValue,
    'x-checkbox--disabled': props.disable,
  },
]);
</script>

<template>
  <label :class="classes" @click.prevent="toggle">
    <span class="x-checkbox__box" tabindex="0" @keydown.space.prevent="toggle">
      <svg
        v-if="modelValue"
        class="x-checkbox__checkmark"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 6L5 8L9 3"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>
    <span v-if="label" class="x-checkbox__label">{{ label }}</span>
  </label>
</template>

<style scoped lang="scss">
.x-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 13px;
  color: #1d1d1f;
  cursor: default;
  user-select: none;
  vertical-align: middle;

  &__box {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    border-radius: 3px;
    box-sizing: border-box;
    outline: none;
    
    // Light Mode Unchecked (Flat Big Sur style)
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.25);
    box-shadow: 0 0.5px 1px rgba(0, 0, 0, 0.05);

    &:focus-visible {
      box-shadow: 0 0 0 2.5px rgba(0, 122, 255, 0.5) !important;
    }
  }

  &--checked {
    .x-checkbox__box {
      // Light Mode Checked (Flat Accent color)
      background: #007aff;
      border-color: #007aff;
      color: #ffffff;
      box-shadow: 0 0.5px 1px rgba(0, 0, 0, 0.1);
    }
  }

  &__checkmark {
    width: 10px;
    height: 10px;
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
/* Global overrides for XCheckbox inside .body--dark (Flat Big Sur style) */
.body--dark {
  .x-checkbox {
    color: #f5f5f7 !important;

    .x-checkbox__box {
      background: rgba(255, 255, 255, 0.1) !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
      box-shadow: none !important;
    }

    &.x-checkbox--checked .x-checkbox__box {
      background: #0a84ff !important;
      border-color: #0a84ff !important;
      color: #ffffff !important;
    }
  }
}
</style>
