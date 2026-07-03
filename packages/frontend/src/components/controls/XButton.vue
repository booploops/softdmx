<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { computed, inject } from 'vue';

type ButtonSize = 'sm' | 'md' | 'lg';

const props = defineProps<{
  label?: string;
  icon?: string;
  disable?: boolean;
  loading?: boolean;
  color?: string;
  textColor?: string;
  flat?: boolean;
  outline?: boolean;
  size?: ButtonSize;
  type?: 'button' | 'submit' | 'reset';
  dropdown?: boolean;
}>();

const emit = defineEmits<{ click: [MouseEvent] }>();

const groupContext = inject<{
  size?: ButtonSize;
  color?: string;
  textColor?: string;
  flat?: boolean;
  outline?: boolean;
  disable?: boolean;
} | null>('x-btn-group', null);

const computedSize = computed(() => props.size ?? groupContext?.size ?? 'md');
const computedColor = computed(() => props.color ?? groupContext?.color ?? 'default');
const computedTextColor = computed(() => props.textColor ?? groupContext?.textColor);
const computedFlat = computed(() => props.flat ?? groupContext?.flat ?? false);
const computedOutline = computed(() => props.outline ?? groupContext?.outline ?? false);
const computedDisable = computed(() => props.disable ?? groupContext?.disable ?? false);
const computedLoading = computed(() => props.loading ?? false);
const computedType = computed(() => props.type ?? 'button');

const isCustomColor = computed(() => {
  return !['default', 'primary', 'danger'].includes(computedColor.value);
});

const isCssColor = (val?: string) => {
  if (!val) return false;
  return (
    val.startsWith('#') ||
    val.startsWith('rgb') ||
    val.startsWith('hsl') ||
    val.startsWith('var(') ||
    ['transparent', 'currentColor', 'inherit'].includes(val)
  );
};

const isColorCss = computed(() => isCssColor(computedColor.value));
const isTextColorCss = computed(() => isCssColor(computedTextColor.value));

const colorClasses = computed(() => {
  const list: string[] = [];

  // Handle custom text color from prop/context (non-CSS colors)
  if (computedTextColor.value && !isTextColorCss.value) {
    list.push(`text-${computedTextColor.value}`);
  }

  // Handle custom background/color (non-CSS colors)
  if (isCustomColor.value && !isColorCss.value) {
    if (computedFlat.value || computedOutline.value) {
      list.push(`text-${computedColor.value}`);
    } else {
      list.push(`bg-${computedColor.value}`);
      // Default text color if not specified
      if (!computedTextColor.value) {
        const lightColors = ['warning', 'secondary', 'yellow', 'amber', 'lime', 'positive-soft', 'warning-soft'];
        const isLight = lightColors.some(c => computedColor.value.includes(c));
        list.push(isLight ? 'text-black' : 'text-white');
      }
    }
  }

  return list;
});

const customStyles = computed(() => {
  const styles: Record<string, string> = {};

  if (isTextColorCss.value) {
    styles.color = computedTextColor.value!;
  }

  if (isCustomColor.value && isColorCss.value) {
    if (computedFlat.value || computedOutline.value) {
      styles.color = computedColor.value;
      if (computedOutline.value) {
        styles.borderColor = computedColor.value;
      }
    } else {
      styles.backgroundColor = computedColor.value;
      styles.borderColor = computedColor.value;
      if (!computedTextColor.value) {
        styles.color = '#ffffff';
      }
    }
  }

  return styles;
});

const classes = computed(() => [
  'x-btn',
  `x-btn--${computedSize.value}`,
  `x-btn--${isCustomColor.value ? 'custom' : computedColor.value}`,
  {
    'x-btn--flat': computedFlat.value,
    'x-btn--outline': computedOutline.value,
    'x-btn--disabled': computedDisable.value || computedLoading.value,
    'x-btn--loading': computedLoading.value,
  },
  ...colorClasses.value,
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
    :style="customStyles"
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
        <svg
          v-if="dropdown"
          viewBox="0 0 10 6"
          class="x-btn__arrow"
        >
          <path d="M5 6L0 0H10L5 6Z" fill="currentColor" />
        </svg>
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

  &--custom {
    box-shadow: var(--shadow);
    border-color: transparent;

    &:hover:not(.x-btn--disabled) {
      filter: brightness(0.92);
    }

    &:active:not(.x-btn--disabled) {
      filter: brightness(0.85);
    }

    &.x-btn--flat {
      background: transparent !important;
      border-color: transparent !important;
      box-shadow: none !important;

      &:hover:not(.x-btn--disabled) {
        background: rgba(0, 0, 0, 0.05) !important;
        filter: none;
      }

      &:active:not(.x-btn--disabled) {
        background: rgba(0, 0, 0, 0.1) !important;
        filter: none;
      }
    }

    &.x-btn--outline {
      background: transparent !important;
      border-color: currentColor;
      box-shadow: none !important;

      &:hover:not(.x-btn--disabled) {
        background: rgba(0, 0, 0, 0.03) !important;
        filter: none;
      }

      &:active:not(.x-btn--disabled) {
        background: rgba(0, 0, 0, 0.08) !important;
        filter: none;
      }
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

    &.x-btn--danger {
      color: #ff3b30;

      &:hover:not(.x-btn--disabled) {
        background: rgba(255, 59, 48, 0.08) !important;
      }

      &:active:not(.x-btn--disabled) {
        background: rgba(255, 59, 48, 0.15) !important;
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

  &__arrow {
    width: 8px;
    height: 5px;
    margin-left: 2px;
    opacity: 0.7;
    flex-shrink: 0;
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
        background: rgba(255, 255, 255, 0.15);
      }

      &:active:not(.x-btn--disabled) {
        background: rgba(255, 255, 255, 0.25);
        border-color: rgba(255, 255, 255, 0.25);
      }
    }

    &.x-btn--primary {
      &:hover:not(.x-btn--disabled) {
        background: #0076eb;
      }

      &:active:not(.x-btn--disabled) {
        background: #0068d6;
      }
    }

    &.x-btn--danger {
      &:hover:not(.x-btn--disabled) {
        background: #e03b30;
      }

      &:active:not(.x-btn--disabled) {
        background: #c92d22;
      }
    }

    &.x-btn--custom {
      border-color: transparent !important;

      &:hover:not(.x-btn--disabled) {
        filter: brightness(1.1) !important;
      }

      &:active:not(.x-btn--disabled) {
        filter: brightness(0.9) !important;
      }

      &.x-btn--flat {
        background: transparent !important;
        border-color: transparent !important;

        &:hover:not(.x-btn--disabled) {
          background: rgba(255, 255, 255, 0.08) !important;
          filter: none !important;
        }

        &:active:not(.x-btn--disabled) {
          background: rgba(255, 255, 255, 0.15) !important;
          filter: none !important;
        }
      }

      &.x-btn--outline {
        background: transparent !important;
        border-color: currentColor !important;

        &:hover:not(.x-btn--disabled) {
          background: rgba(255, 255, 255, 0.04) !important;
          filter: none !important;
        }

        &:active:not(.x-btn--disabled) {
          background: rgba(255, 255, 255, 0.08) !important;
          filter: none !important;
        }
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

      &.x-btn--danger {
        color: #ff453a !important;

        &:hover:not(.x-btn--disabled) {
          background: rgba(255, 69, 58, 0.08) !important;
        }

        &:active:not(.x-btn--disabled) {
          background: rgba(255, 69, 58, 0.15) !important;
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
