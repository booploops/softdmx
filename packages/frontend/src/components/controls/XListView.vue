<script setup lang="ts">
import { provide } from 'vue';

const props = withDefaults(
  defineProps<{
    bordered?: boolean;
    dense?: boolean;
    zebra?: boolean;
  }>(),
  {
    bordered: true,
    dense: false,
    zebra: false,
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
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 13px;

  &--bordered {
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 5px;
  }

  &__content {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  // Custom macOS Catalina style scrollbars
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    border: 2px solid transparent;
    background-clip: padding-box;

    &:hover {
      background: rgba(0, 0, 0, 0.4);
      background-clip: padding-box;
    }
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

    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2) !important;
      border: 2px solid transparent !important;
      background-clip: padding-box !important;

      &:hover {
        background: rgba(255, 255, 255, 0.4) !important;
        background-clip: padding-box !important;
      }
    }
  }
}
</style>
