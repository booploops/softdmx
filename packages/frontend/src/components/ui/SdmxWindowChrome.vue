<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    icon?: string;
    info?: string;
    /** Show a clickable close control in the header (needed for touch / no-keyboard). */
    closable?: boolean;
    closeInfo?: string;
  }>(),
  {
    closable: false,
    closeInfo: undefined,
  }
);

const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <div class="sdmx-window-chrome">
    <header class="sdmx-window-chrome__header">
      <XIcon v-if="icon" :name="icon" size="16px" class="sdmx-window-chrome__icon" />
      <span class="sdmx-window-chrome__title" :data-sdmx-info="info">{{ title }}</span>
      <div class="sdmx-window-chrome__actions">
        <slot name="actions" />
        <button
          v-if="closable"
          type="button"
          class="sdmx-window-chrome__close sdmx-focus-ring"
          aria-label="Close"
          :data-sdmx-info="closeInfo"
          @click="emit('close')"
        >
          <XIcon name="x" size="18px" />
        </button>
      </div>
    </header>
    <div class="sdmx-window-chrome__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.sdmx-window-chrome {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  flex: 1 1 auto;
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-md);
  background: var(--sdmx-color-bg-surface);
  overflow: hidden;
}

.sdmx-window-chrome__header {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-xs);
  padding: 0 var(--sdmx-space-sm);
  min-height: var(--sdmx-layout-window-header-height);
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
  background: var(--sdmx-color-bg-elevated);
  flex-shrink: 0;
}

.sdmx-window-chrome__icon {
  color: var(--sdmx-color-text-muted);
}

.sdmx-window-chrome__title {
  flex: 1 1 auto;
  font-size: var(--sdmx-font-size-label);
  font-weight: var(--sdmx-font-weight-bold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sdmx-window-chrome__actions {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-xs);
  flex-shrink: 0;
}

.sdmx-window-chrome__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--sdmx-space-touch, 44px);
  height: var(--sdmx-space-touch, 44px);
  border: none;
  border-radius: var(--sdmx-radius-sm);
  background: transparent;
  color: var(--sdmx-color-text-muted);
  cursor: pointer;
  flex-shrink: 0;
}

.sdmx-window-chrome__close:hover {
  background: var(--sdmx-color-hover);
  color: var(--sdmx-color-text);
}

.sdmx-window-chrome__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
