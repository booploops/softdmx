<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { ref, watch, inject, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import { debounce } from 'lodash-es';
import { useWorkspaceStore } from 'src/stores/workspace';
import XButton from 'src/components/controls/XButton.vue';
import XButtonGroup from 'src/components/controls/XButtonGroup.vue';

const $q = useQuasar();
const workspaceStore = useWorkspaceStore();

// Retrieve the unique Dockview panel ID provided by WSWorkspacePanel.vue
const panelId = inject<string>('dockview-panel-id', 'default-text');

// Component reactive states
const text = ref('');
const fontSize = ref<'sm' | 'md' | 'lg'>('md');
const fontFamily = ref<'sans' | 'mono'>('sans');
const isSaving = ref(false);
const isSaved = ref(true);
const copied = ref(false);

// Watch the store's textContents to populate initial value upon hydration
watch(
  () => workspaceStore.textContents[panelId],
  (newVal) => {
    // Only apply the value if the user hasn't typed anything locally yet
    if (newVal !== undefined && text.value === '') {
      text.value = newVal || '';
    }
  },
  { immediate: true }
);

// Debounced save operation to optimize disk I/O and avoid thrashing workspace.yml
const debouncedSave = debounce((val: string) => {
  workspaceStore.saveTextContent(panelId, val);
  isSaving.value = false;
  isSaved.value = true;
}, 500);

watch(text, (newVal) => {
  isSaving.value = true;
  isSaved.value = false;
  debouncedSave(newVal);
});

onUnmounted(() => {
  debouncedSave.cancel();
});

// Copy text utility with temporary visual indicator
const copyToClipboard = async () => {
  if (!text.value) return;
  try {
    await navigator.clipboard.writeText(text.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy text:', err);
  }
};

// Confirm dialog to protect against accidental clear
const confirmClear = () => {
  if (!text.value) return;
  $q.dialog({
    title: 'Clear Notes',
    message: 'Are you sure you want to erase all notes in this panel? This action cannot be undone.',
    cancel: true,
    persistent: true,
    dark: true,
  }).onOk(() => {
    text.value = '';
  });
};
</script>

<template>
  <div class="sdmx-text-panel">
    <!-- Header Toolbar -->
    <div class="sdmx-text-panel__toolbar q-px-md q-py-sm">
      <div class="sdmx-text-panel__title-group">
        <q-icon
          name="edit_note"
          size="20px"
          class="sdmx-text-panel__title-icon text-primary"
        />
        <span class="sdmx-text-panel__title-text text-weight-bold">Notes</span>
      </div>

      <div class="sdmx-text-panel__controls">
        <!-- Persistent save indicator -->
        <div
          class="sdmx-text-panel__status"
          :class="{ 'is-saving': isSaving, 'is-saved': isSaved }"
          :title="isSaving ? 'Saving changes to workspace.yml...' : 'All changes saved to workspace.yml'"
        >
          <span class="sdmx-text-panel__status-dot"></span>
          <span class="sdmx-text-panel__status-text">{{ isSaving ? 'Saving...' : 'Saved' }}</span>
        </div>

        <div class="sdmx-text-panel__divider"></div>

        <!-- Typography styling selectors -->
        <XButtonGroup
          size="sm"
          class="q-mr-sm"
        >
          <XButton
            :flat="fontFamily !== 'sans'"
            label="Sans"
            @click="fontFamily = 'sans'"
            title="Clean Proportional Font"
          />
          <XButton
            :flat="fontFamily !== 'mono'"
            label="Mono"
            @click="fontFamily = 'mono'"
            title="Code/Programming Monospace Font"
          />
        </XButtonGroup>

        <!-- Text sizing selectors -->
        <XButtonGroup
          size="sm"
          class="q-mr-md"
        >
          <XButton
            :flat="fontSize !== 'sm'"
            label="A-"
            @click="fontSize = 'sm'"
            title="Smaller Font Size"
          />
          <XButton
            :flat="fontSize !== 'md'"
            label="A"
            @click="fontSize = 'md'"
            title="Medium Font Size"
          />
          <XButton
            :flat="fontSize !== 'lg'"
            label="A+"
            @click="fontSize = 'lg'"
            title="Larger Font Size"
          />
        </XButtonGroup>

        <div class="sdmx-text-panel__divider"></div>

        <!-- Copy to clipboard utility -->
        <XButton
          size="sm"
          flat
          :icon="copied ? 'check' : 'content_copy'"
          :color="copied ? 'success' : 'default'"
          class="q-mr-xs sdmx-action-btn"
          @click="copyToClipboard"
          :title="copied ? 'Copied successfully!' : 'Copy all to Clipboard'"
        />

        <!-- Destroy / erase notes with confirmation -->
        <XButton
          size="sm"
          flat
          icon="delete_outline"
          color="danger"
          class="sdmx-action-btn"
          @click="confirmClear"
          title="Clear Notes"
          :disable="!text"
        />
      </div>
    </div>

    <!-- Scrollable content and custom styled textarea -->
    <div class="sdmx-text-panel__body">
      <textarea
        v-model="text"
        class="sdmx-text-panel__textarea"
        :class="[
          `font-size--${fontSize}`,
          `font-family--${fontFamily}`
        ]"
        placeholder="Type show notes, custom macro guides, or patching configurations here..."
        spellcheck="false"
      ></textarea>
    </div>
  </div>
</template>

<style scoped lang="scss">
.sdmx-text-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--sdmx-color-bg-inset);
  color: var(--sdmx-color-text);
  overflow: hidden;

  &__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--sdmx-color-bg-surface);
    border-bottom: 1px solid var(--sdmx-color-border-faint);
    flex-shrink: 0;
    user-select: none;
    height: 38px;
  }

  &__title-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__title-icon {
    opacity: 0.85;
  }

  &__title-text {
    font-size: 13px;
    letter-spacing: 0.02em;
    color: var(--sdmx-color-text-muted);
  }

  &__controls {
    display: flex;
    align-items: center;
  }

  &__divider {
    height: 16px;
    width: 1px;
    background: var(--sdmx-color-border-faint);
    margin: 0 8px;
  }

  &__status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 500;
    padding: 2px 6px;
    border-radius: 4px;
    color: var(--sdmx-color-text-faint);
    transition: all 0.25s ease;

    .sdmx-text-panel__status-dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--sdmx-color-text-faint);
      transition: background 0.25s ease;
    }

    &.is-saving {
      color: var(--sdmx-color-warning);

      .sdmx-text-panel__status-dot {
        background: var(--sdmx-color-warning);
        animation: pulse 1.2s infinite ease-in-out;
      }
    }

    &.is-saved {
      color: var(--sdmx-color-positive-soft, #4caf50);

      .sdmx-text-panel__status-dot {
        background: var(--sdmx-color-positive, #4caf50);
      }
    }
  }

  &__body {
    flex: 1;
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  &__textarea {
    width: 100%;
    height: 100%;
    padding: 16px;
    background: transparent;
    border: none;
    resize: none;
    outline: none;
    color: var(--sdmx-color-text);
    box-sizing: border-box;
    transition: color 0.15s ease;

    // Use customized modern scrollbars as defined by web best practices
    scrollbar-color: var(--sdmx-color-border-strong) transparent;
    scrollbar-width: thin;

    @supports not (scrollbar-color: auto) {
      &::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }

      &::-webkit-scrollbar-thumb {
        background: var(--sdmx-color-border-strong);
        border-radius: 3px;
      }

      &::-webkit-scrollbar-track {
        background: transparent;
      }
    }

    &::placeholder {
      color: var(--sdmx-color-text-faint);
      opacity: 0.6;
    }

    &.font-family--mono {
      font-family: var(--sdmx-font-mono, 'Fira Code', 'Fira Mono', Consolas, Monaco, 'Andale Mono', monospace);
    }

    // Font-size adjustments
    &.font-size--sm {
      font-size: 12px;
      line-height: 1.45;
    }

    &.font-size--md {
      font-size: 14px;
      line-height: 1.55;
    }

    &.font-size--lg {
      font-size: 18px;
      line-height: 1.65;
    }
  }
}

.sdmx-action-btn {
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  &:hover {
    transform: scale(1.08);
  }

  &:active {
    transform: scale(0.95);
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }

  50% {
    transform: scale(1.2);
    opacity: 1;
  }

  100% {
    transform: scale(1);
    opacity: 0.6;
  }
}
</style>
