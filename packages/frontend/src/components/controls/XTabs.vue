<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { provide, computed } from 'vue';

type TabAlignment = 'left' | 'center' | 'right' | 'justify';

const props = withDefaults(
  defineProps<{
    modelValue: string | number;
    align?: TabAlignment;
    dense?: boolean;
  }>(),
  {
    align: 'left',
    dense: false,
  }
);

const emit = defineEmits<{
  'update:modelValue': [string | number];
}>();

// Compute active value reactively
const activeTab = computed(() => props.modelValue);

// Handle selection of a tab
function selectTab(name: string | number) {
  emit('update:modelValue', name);
}

// Provide context to any descendant XTab components
provide('xTabsContext', {
  activeTab,
  selectTab,
  dense: computed(() => props.dense),
});
</script>

<template>
  <div
    class="x-tabs"
    :class="[
      `x-tabs--align-${align}`,
      { 'x-tabs--dense': dense }
    ]"
    role="tablist"
  >
    <slot />
  </div>
</template>

<style scoped lang="scss">
.x-tabs {
  display: flex;
  flex-direction: row;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  width: 100%;
  box-sizing: border-box;

  &--align-left {
    justify-content: flex-start;
  }

  &--align-center {
    justify-content: center;
  }

  &--align-right {
    justify-content: flex-end;
  }

  &--align-justify {
    justify-content: space-between;

    // Use :deep to style nested XTab components when justified
    :deep(.x-tab) {
      flex: 1 1 0;
    }
  }
}

/* Global dark mode overrides */
.body--dark {
  .x-tabs {
    border-bottom-color: rgba(255, 255, 255, 0.08) !important;
  }
}
</style>
