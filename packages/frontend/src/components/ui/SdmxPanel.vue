<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
defineProps<{
  title?: string;
  inset?: boolean;
  footer?: boolean;
}>();
</script>

<template>
  <section class="sdmx-panel" :class="{ 'sdmx-panel--inset': inset }">
    <header v-if="title || $slots.header" class="sdmx-panel__header">
      <slot name="header">
        <span class="sdmx-panel__title">{{ title }}</span>
      </slot>
    </header>
    <div class="sdmx-panel__body">
      <slot />
    </div>
    <footer v-if="footer || $slots.footer" class="sdmx-panel__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<style scoped>
.sdmx-panel {
  display: flex;
  flex-direction: column;
  background: var(--sdmx-color-bg-surface);
  border-radius: var(--sdmx-radius-md);
  overflow: hidden;
}

.sdmx-panel--inset {
  background: var(--sdmx-color-bg-inset);
  border: 1px solid var(--sdmx-color-border-subtle);
}

.sdmx-panel__header {
  padding: var(--sdmx-space-sm) var(--sdmx-space-md);
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
  background: var(--sdmx-color-bg-elevated);
}

.sdmx-panel__title {
  font-size: var(--sdmx-font-size-label);
  font-weight: var(--sdmx-font-weight-bold);
}

.sdmx-panel__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

.sdmx-panel__footer {
  padding: var(--sdmx-space-sm) var(--sdmx-space-md);
  border-top: 1px solid var(--sdmx-color-border-subtle);
  background: var(--sdmx-color-bg-toolbar);
}
</style>
