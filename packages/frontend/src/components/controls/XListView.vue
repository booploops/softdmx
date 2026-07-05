<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { provide } from 'vue';

const props = withDefaults(
  defineProps<{
    bordered?: boolean;
    dense?: boolean;
    zebra?: boolean;
    separator?: boolean;
  }>(),
  {
    bordered: true,
    dense: false,
    zebra: false,
    separator: false,
  }
);

// Provide configuration to child XListItems so they can inherit properties like density
provide('listViewProps', props);
</script>

<template>
  <div
    class="x-list-view"
    :class="{
      'x-list-view--bordered': bordered,
      'x-list-view--dense': dense,
      'x-list-view--zebra': zebra,
      'x-list-view--separator': separator,
    }"
  >
    <div class="x-list-view__content">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped lang="scss">
.x-list-view {
  width: 100%;
  max-height: 300px;
  overflow-y: auto;
  box-sizing: border-box;
  background-color: #ffffff;
  font-size: 13px;

  &--bordered {
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 5px;
  }

  &--separator {
    :deep(.x-list-item:not(:last-child)) {
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }
  }

  &__content {
    display: flex;
    flex-direction: column;
    width: 100%;
  }
}
</style>

<style lang="scss">
/* Global dark mode overrides for XListView inside .body--dark */
.body--dark {
  .x-list-view {
    background-color: #1e1e1e !important;

    &--bordered {
      border-color: rgba(255, 255, 255, 0.15) !important;
    }

    &--separator {
      .x-list-item:not(:last-child) {
        border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
      }
    }
  }
}
</style>
