<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    dense?: boolean;
  }>(),
  {
    dense: false,
  }
);
</script>

<template>
  <div
    class="x-well"
    :class="{ 'x-well--dense': dense }"
  >
    <slot></slot>
  </div>
</template>

<style scoped lang="scss">
.x-well {
  background-color: #f5f5f7;
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 6px;
  padding: 12px;
  box-sizing: border-box;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.03);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 13px;
  color: #1d1d1f;

  &--dense {
    padding: 8px;
    font-size: 12px;
  }
}
</style>

<style lang="scss">
/* Global dark mode overrides for XWell */
.body--dark {
  .x-well {
    background-color: rgba(0, 0, 0, 0.2) !important;
    border-color: rgba(255, 255, 255, 0.05) !important;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2) !important;
    color: #f5f5f7 !important;
  }
}
</style>
