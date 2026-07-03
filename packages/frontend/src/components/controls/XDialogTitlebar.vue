<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">

const props = defineProps<{
  title?: string;
}>();

const emit = defineEmits([
  'close',
]);

function onClose() {
  emit('close');
}

</script>

<template>
  <div class="titlebar">
    <div
      class="titlebar-text"
      v-if="title"
    >
      {{ title }}
    </div>
    <!-- Close -->
    <button
      class="dialog-button"
      @click="onClose"
    >
      <div class="codicon codicon-close"></div>
    </button>
  </div>
</template>

<style scoped lang="scss">
.titlebar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--sdmx-color-bg-toolbar);
  color: var(--text-primary);
  height: 32px;
  user-select: none;
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
  overflow: hidden;
  flex: 0 auto;
  z-index: 1;
}

.titlebar-text {
  padding-left: 1rem;
  font-weight: var(--sdmx-font-weight-bold);
}

.dialog-button {
  background: none;
  border: none;
  color: var(--text-primary);
  display: grid;
  place-content: center;
  height: 100%;
  width: 44px;

  &:hover {
    background: var(--sdmx-color-primary);
  }

  &:active {
    background: color-mix(in srgb, var(--sdmx-color-primary), #000 80%);
  }
}
</style>