<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { ref, watch, inject, onUnmounted } from 'vue';
import { debounce } from 'lodash-es';
import { useWorkspaceStore } from 'src/stores/workspace';
import XButton from 'src/components/controls/XButton.vue';
import XButtonGroup from 'src/components/controls/XButtonGroup.vue';
import XDropdown from 'src/components/controls/XDropdown.vue';
import { createConfirm } from 'src/lib/CommonDialogs';

const workspaceStore = useWorkspaceStore();

// Retrieve the unique Dockview panel ID provided by WSWorkspacePanel.vue
const panelId = inject<string>('dockview-panel-id', 'default-text');
const dockviewPanelProps = inject<any>('dockview-panel-props', null);

// Component reactive states
const text = ref('');
const fontSize = ref<'sm' | 'md' | 'lg'>('md');
const fontFamily = ref<'sans' | 'mono'>('sans');
const isSaving = ref(false);
const isSaved = ref(true);
const copied = ref(false);

// Watch the panel props textContent to populate initial value upon hydration / restore
if (dockviewPanelProps && dockviewPanelProps.params) {
  text.value = dockviewPanelProps.params.textContent || '';
  
  watch(
    () => dockviewPanelProps.params.textContent,
    (newVal) => {
      // Only apply the value if it's different and the user is not actively typing
      if (newVal !== undefined && text.value !== newVal) {
        text.value = newVal || '';
      }
    }
  );
}

// Debounced save operation to optimize disk I/O and avoid thrashing workspace.yml
const debouncedSave = debounce((val: string) => {
  if (dockviewPanelProps && dockviewPanelProps.api) {
    dockviewPanelProps.api.updateParameters({ textContent: val });
  }
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
const confirmClear = async () => {
  if (!text.value) return;
  const confirmed = await createConfirm({
    title: 'Clear Text',
    message: 'Are you sure you want to erase all text in this panel? This action cannot be undone.',
  });
  if (confirmed) {
    text.value = '';
  }
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

        <div class="sdmx-text-panel__divider sdmx-status-divider"></div>

        <!-- Typography styling selectors -->
        <XButtonGroup
          size="sm"
          class="q-mr-sm sdmx-typography-group"
        >
          <XButton
            :flat="fontFamily !== 'sans'"
            @click="fontFamily = 'sans'"
            title="Clean Proportional Font"
          >
            <span class="sdmx-btn-lbl-full">Sans</span>
            <span class="sdmx-btn-lbl-short">S</span>
          </XButton>
          <XButton
            :flat="fontFamily !== 'mono'"
            @click="fontFamily = 'mono'"
            title="Code/Programming Monospace Font"
          >
            <span class="sdmx-btn-lbl-full">Mono</span>
            <span class="sdmx-btn-lbl-short">M</span>
          </XButton>
        </XButtonGroup>

        <!-- Text sizing selectors -->
        <XButtonGroup
          size="sm"
          class="q-mr-md sdmx-sizing-group"
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

        <div class="sdmx-text-panel__divider sdmx-utility-divider"></div>

        <!-- Copy to clipboard utility -->
        <XButton
          :icon="copied ? 'check' : 'copy'"
          :color="copied ? 'success' : 'default'"
          class="q-mr-xs sdmx-action-btn"
          @click="copyToClipboard"
          :title="copied ? 'Copied successfully!' : 'Copy all to Clipboard'"
        />

        <!-- Destroy / erase notes with confirmation -->
        <XButton
          icon="trash"
          color="danger"
          class="sdmx-action-btn q-mr-xs"
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

  /* Setup container query context to enable modern inline-size queries */
  container-type: inline-size;
  container-name: textpanel;

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

    .sdmx-text-panel__status-dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--sdmx-color-text-faint);
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

    // Font-family configurations
    &.font-family--sans {
      font-family: inherit;
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

.sdmx-action-btn {}

/* Default label layouts for buttons */
.sdmx-btn-lbl-full {
  display: inline;
}

.sdmx-btn-lbl-short {
  display: none;
}

/* --- Collapsible Dropdown Styling --- */

.sdmx-more-dropdown {
  display: none;
}

.sdmx-dropdown-menu-content {
  display: flex;
  flex-direction: column;
  width: 170px;
  user-select: none;
  background: transparent;
}

.sdmx-dropdown-menu-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sdmx-dropdown-menu-header {
  font-size: 10px;
  font-weight: 700;
  color: var(--sdmx-color-text-faint);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 2px;
  padding-left: 2px;
}

.sdmx-dropdown-menu-divider {
  height: 1px;
  background: var(--sdmx-color-border-faint);
  margin: 6px -8px; // Extend slightly outside padding
}

// Ensure button groups in the dropdown list stretch full-width
.sdmx-dropdown-menu-content {
  .x-btn-group {
    display: flex !important;
    width: 100% !important;

    :deep(.x-btn) {
      flex: 1;
      min-width: 0;
    }
  }
}

/* --- Container Queries for Elegant Responsiveness --- */

@container textpanel (max-width: 540px) {

  // Hide panel title text, keep only icon
  .sdmx-text-panel__title-text {
    display: none !important;
  }

  .sdmx-text-panel__title-group {
    padding-right: 4px;
  }
}

// Collapsing typography styling elements into dropdown settings
@container textpanel (max-width: 460px) {

  .sdmx-typography-group,
  .sdmx-sizing-group,
  .sdmx-status-divider {
    display: none !important;
  }

  .sdmx-more-dropdown {
    display: inline-block !important;
  }

  // Inside dropdown settings, only keep styling rules (Sans/Mono, Sizing)
  // Actions are still directly visible on the main toolbar
  .sdmx-dropdown-actions,
  .sdmx-dropdown-actions-divider {
    display: none !important;
  }
}

// Keep save status text clean
@container textpanel (max-width: 320px) {
  .sdmx-text-panel__status-text {
    display: none !important;
  }

  .sdmx-text-panel__status {
    padding: 2px !important;
  }
}

// Move utility actions (Copy, Clear) entirely into the dropdown menu to prevent toolbar overflow
@container textpanel (max-width: 280px) {

  .sdmx-action-btn,
  .sdmx-utility-divider {
    display: none !important;
  }

  // Show copy and delete actions inside the collapsed settings dropdown instead
  .sdmx-dropdown-actions,
  .sdmx-dropdown-actions-divider {
    display: flex !important;
  }
}

// Minimal toolbar: only icon and dropdown, hide status dot
@container textpanel (max-width: 180px) {
  .sdmx-text-panel__status {
    display: none !important;
  }

  .sdmx-text-panel__toolbar {
    padding-left: 6px !important;
    padding-right: 6px !important;
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
