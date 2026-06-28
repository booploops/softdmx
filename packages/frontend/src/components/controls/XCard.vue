<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title?: string;
    bordered?: boolean;
    flat?: boolean;
  }>(),
  {
    bordered: true,
    flat: false,
  }
);
</script>

<template>
  <div
    class="x-card"
    :class="{
      'x-card--bordered': bordered,
      'x-card--flat': flat,
    }"
  >
    <!-- Header -->
    <div v-if="title || $slots.header" class="x-card__header">
      <slot name="header">
        <h3 class="x-card__title">{{ title }}</h3>
      </slot>
    </div>

    <!-- Content -->
    <div class="x-card__content">
      <slot></slot>
    </div>

    <!-- Footer -->
    <div v-if="$slots.footer" class="x-card__footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<style scoped lang="scss">
.x-card {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border-radius: 6px;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 13px;
  color: #1d1d1f;
  
  &--bordered {
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  &:not(.x-card--flat) {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  &__header {
    padding: 12px 16px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }

  &__title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #1d1d1f;
  }

  &__content {
    padding: 16px;
    flex: 1 1 auto;
  }

  &__footer {
    padding: 12px 16px;
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    display: flex;
    align-items: center;
    gap: 8px;
  }
}
</style>

<style lang="scss">
/* Global dark mode overrides for XCard */
.body--dark {
  .x-card {
    background-color: #1a1a1a !important;
    color: #f5f5f7 !important;

    &--bordered {
      border-color: rgba(255, 255, 255, 0.08) !important;
    }

    .x-card__header {
      border-bottom-color: rgba(255, 255, 255, 0.08) !important;
    }

    .x-card__title {
      color: #f5f5f7 !important;
    }

    .x-card__footer {
      border-top-color: rgba(255, 255, 255, 0.08) !important;
    }
  }
}
</style>
