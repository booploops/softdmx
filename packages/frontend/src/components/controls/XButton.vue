<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { computed, inject } from 'vue';

type ColorVariant = 'default' | 'primary' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const props = defineProps<{
  label?: string;
  icon?: string;
  disable?: boolean;
  loading?: boolean;
  color?: ColorVariant;
  flat?: boolean;
  outline?: boolean;
  size?: ButtonSize;
  type?: 'button' | 'submit' | 'reset';
}>();

const emit = defineEmits<{ click: [MouseEvent] }>();

const groupContext = inject<{
  size?: ButtonSize;
  color?: ColorVariant;
  flat?: boolean;
  outline?: boolean;
  disable?: boolean;
} | null>('x-btn-group', null);

const computedSize = computed(() => props.size ?? groupContext?.size ?? 'md');
const computedColor = computed(() => props.color ?? groupContext?.color ?? 'default');
const computedFlat = computed(() => props.flat ?? groupContext?.flat ?? false);
const computedOutline = computed(() => props.outline ?? groupContext?.outline ?? false);
const computedDisable = computed(() => props.disable ?? groupContext?.disable ?? false);
const computedLoading = computed(() => props.loading ?? false);
const computedType = computed(() => props.type ?? 'button');

const classes = computed(() => [
  'x-btn',
  `x-btn--${computedSize.value}`,
  `x-btn--${computedColor.value}`,
  {
    'x-btn--flat': computedFlat.value,
    'x-btn--outline': computedOutline.value,
    'x-btn--disabled': computedDisable.value || computedLoading.value,
    'x-btn--loading': computedLoading.value,
  },
]);

function handleClick(event: MouseEvent) {
  if (computedDisable.value || computedLoading.value) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  emit('click', event);
}
</script>

<template>
  <button
    :type="computedType"
    :class="classes"
    :disabled="computedDisable || computedLoading"
    @click="handleClick"
  >
    <div class="x-btn__content">
      <span
        v-if="computedLoading"
        class="x-btn__spinner"
      ></span>
      <template v-else>
        <slot>
          <XIcon
            v-if="icon"
            :name="icon"
            class="x-btn__icon"
          />
          <span
            v-if="label"
            class="x-btn__label"
          >{{ label }}</span>
        </slot>
      </template>
    </div>
  </button>
</template>

<style scoped lang="scss">
.x-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  font-weight: 400;
  border-radius: 5px;
  cursor: default;
  user-select: none;
  outline: none;
  box-sizing: border-box;
  text-decoration: none;
  border: 1px solid var(--border-color);

  // Default theme tokens local to component (Light Mode default - Flat Big Sur style)
  --border-color: rgba(0, 0, 0, 0.15);
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  --active-shadow: none;

  --default-bg: #ffffff;
  --default-border: rgba(0, 0, 0, 0.15);
  --default-text: #1d1d1f;

  --primary-bg: #007aff;
  --primary-border: #007aff;
  --primary-text: #ffffff;

  --danger-bg: #ff3b30;
  --danger-border: #ff3b30;
  --danger-text: #ffffff;

  // Base sizing and typography
  &--sm {
    height: 20px;
    font-size: 11px;
    padding: 0 8px;
    min-width: 44px;
    border-radius: 4px;
  }

  &--md {
    height: 24px;
    font-size: 13px;
    padding: 0 12px;
    min-width: 60px;
  }

  &--lg {
    height: 32px;
    font-size: 14px;
    padding: 0 16px;
    min-width: 80px;
  }

  // Color specific styles (Flat colors)
  &--default {
    background: var(--default-bg);
    border-color: var(--default-border);
    color: var(--default-text);
    box-shadow: var(--shadow);

    &:hover:not(.x-btn--disabled) {
      background: #f5f5f7;
    }

    &:active:not(.x-btn--disabled) {
      background: #e5e5ea;
      border-color: rgba(0, 0, 0, 0.2);
    }
  }

  &--primary {
    background: var(--primary-bg);
    border-color: var(--primary-border);
    color: var(--primary-text);
    box-shadow: var(--shadow);
    font-weight: 500;

    &:hover:not(.x-btn--disabled) {
      background: #0068d6;
    }

    &:active:not(.x-btn--disabled) {
      background: #005ecb;
    }
  }

  &--danger {
    background: var(--danger-bg);
    border-color: var(--danger-border);
    color: var(--danger-text);
    box-shadow: var(--shadow);

    &:hover:not(.x-btn--disabled) {
      background: #e02d22;
    }

    &:active:not(.x-btn--disabled) {
      background: #c92118;
    }
  }

  // Flat (Ghost) styling
  &--flat {
    background: transparent !important;
    border-color: transparent !important;
    box-shadow: none !important;

    &.x-btn--default {
      color: var(--default-text);

      &:hover:not(.x-btn--disabled) {
        background: rgba(0, 0, 0, 0.05) !important;
      }

      &:active:not(.x-btn--disabled) {
        background: rgba(0, 0, 0, 0.1) !important;
      }
    }

    &.x-btn--primary {
      color: #007aff;

      &:hover:not(.x-btn--disabled) {
        background: rgba(0, 122, 255, 0.08) !important;
      }

      &:active:not(.x-btn--disabled) {
        background: rgba(0, 122, 255, 0.15) !important;
      }
    }
  }

  // Outline styling
  &--outline {
    background: transparent !important;
    box-shadow: none !important;

    &.x-btn--default {
      border-color: var(--default-border);
      color: var(--default-text);
    }

    &.x-btn--primary {
      border-color: var(--primary-border);
      color: #007aff;
    }

    &.x-btn--danger {
      border-color: var(--danger-border);
      color: #ff453a;
    }

    &:hover:not(.x-btn--disabled) {
      background: rgba(0, 0, 0, 0.03) !important;
    }

    &:active:not(.x-btn--disabled) {
      background: rgba(0, 0, 0, 0.08) !important;
    }
  }

  // Focus visible outline
  &:focus-visible {
    box-shadow: 0 0 0 2.5px rgba(0, 122, 255, 0.5) !important;
  }

  // Disabled State
  &--disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none !important;
  }

  // Inner elements layout
  &__content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    height: 100%;
  }

  &__icon {
    font-size: 1.15em;
  }

  &__label {
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  &__spinner {
    width: 12px;
    height: 12px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: rotate 1s linear infinite;
  }
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}
</style>

<style lang="scss">
/* Global dark mode overrides for XButton (Flat Big Sur style) */
.body--dark {
  .x-btn {
    --border-color: rgba(255, 255, 255, 0.15) !important;
    --shadow: 0 1px 2px rgba(0, 0, 0, 0.2) !important;
    --active-shadow: none !important;

    --default-bg: rgba(255, 255, 255, 0.1) !important;
    --default-border: rgba(255, 255, 255, 0.15) !important;
    --default-text: #f5f5f7 !important;

    --primary-bg: #0a84ff !important;
    --primary-border: #0a84ff !important;

    --danger-bg: #ff453a !important;
    --danger-border: #ff453a !important;

    &.x-btn--default {
      &:hover:not(.x-btn--disabled) {
        background: rgba(255, 255, 255, 0.15) !important;
      }

      &:active:not(.x-btn--disabled) {
        background: rgba(255, 255, 255, 0.25) !important;
        border-color: rgba(255, 255, 255, 0.25) !important;
      }
    }

    &.x-btn--primary {
      &:hover:not(.x-btn--disabled) {
        background: #0076eb !important;
      }

      &:active:not(.x-btn--disabled) {
        background: #0068d6 !important;
      }
    }

    &.x-btn--danger {
      &:hover:not(.x-btn--disabled) {
        background: #e03b30 !important;
      }

      &:active:not(.x-btn--disabled) {
        background: #c92d22 !important;
      }
    }

    &.x-btn--flat {
      &.x-btn--default {
        color: #f5f5f7 !important;

        &:hover:not(.x-btn--disabled) {
          background: rgba(255, 255, 255, 0.08) !important;
        }

        &:active:not(.x-btn--disabled) {
          background: rgba(255, 255, 255, 0.15) !important;
        }
      }

      &.x-btn--primary {
        color: #0a84ff !important;

        &:hover:not(.x-btn--disabled) {
          background: rgba(10, 132, 255, 0.08) !important;
        }

        &:active:not(.x-btn--disabled) {
          background: rgba(10, 132, 255, 0.15) !important;
        }
      }
    }

    &.x-btn--outline {
      &.x-btn--default {
        border-color: rgba(255, 255, 255, 0.15) !important;
        color: #f5f5f7 !important;
      }

      &.x-btn--primary {
        border-color: #0a84ff !important;
        color: #0a84ff !important;
      }

      &:hover:not(.x-btn--disabled) {
        background: rgba(255, 255, 255, 0.04) !important;
      }

      &:active:not(.x-btn--disabled) {
        background: rgba(255, 255, 255, 0.08) !important;
      }
    }
  }
}
</style>
