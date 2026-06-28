<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { Dialog, useDialogPluginComponent } from 'quasar';
import { useThemeStore } from 'src/stores/theme';
import { THEME_CSS_VAR_KEYS } from 'src/themes/css-vars';
import ThemeGallery from 'src/components/ThemeGallery.vue';
import XButton from 'src/components/controls/XButton.vue';
import XSelect from 'src/components/controls/XSelect.vue';
import XInput from 'src/components/controls/XInput.vue';

const themeStore = useThemeStore();

defineEmits([
  ...useDialogPluginComponent.emits
]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

const themeOptions = computed(() =>
  themeStore.availableThemes.map((theme) => ({
    label: theme.name,
    value: theme.id,
    caption: theme.description,
  }))
);

const customCss = ref(themeStore.overrides.customCss ?? '');
const tokenDraft = ref({
  primary: themeStore.resolvedTheme.tokens.colors.primary,
  bgPage: themeStore.resolvedTheme.tokens.colors.bgPage,
  bgSurface: themeStore.resolvedTheme.tokens.colors.bgSurface,
  text: themeStore.resolvedTheme.tokens.colors.text,
  scratch: themeStore.resolvedTheme.tokens.colors.scratch,
  plotBackground: themeStore.resolvedTheme.tokens.colors.plotBackground,
  plotFixture: themeStore.resolvedTheme.tokens.colors.plotFixture,
  plotSelected: themeStore.resolvedTheme.tokens.colors.plotSelected,
  plotGrid: themeStore.resolvedTheme.tokens.colors.plotGrid,
  plotCenter: themeStore.resolvedTheme.tokens.colors.plotCenter,
  plotLabel: themeStore.resolvedTheme.tokens.colors.plotLabel,
});

watch(
  () => themeStore.resolvedTheme,
  (theme) => {
    tokenDraft.value = {
      primary: theme.tokens.colors.primary,
      bgPage: theme.tokens.colors.bgPage,
      bgSurface: theme.tokens.colors.bgSurface,
      text: theme.tokens.colors.text,
      scratch: theme.tokens.colors.scratch,
      plotBackground: theme.tokens.colors.plotBackground,
      plotFixture: theme.tokens.colors.plotFixture,
      plotSelected: theme.tokens.colors.plotSelected,
      plotGrid: theme.tokens.colors.plotGrid,
      plotCenter: theme.tokens.colors.plotCenter,
      plotLabel: theme.tokens.colors.plotLabel,
    };
  },
  { deep: true }
);

function applyTokenDraft() {
  themeStore.patchTokenOverrides({
    colors: { ...tokenDraft.value },
  });
}

function applyCustomCss() {
  themeStore.setCustomCss(customCss.value);
}

function exportTheme() {
  const blob = new Blob([themeStore.exportActiveTheme()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${themeStore.resolvedTheme.id}.theme.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function importTheme() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,.theme.json,application/json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      themeStore.importTheme(text);
      customCss.value = themeStore.overrides.customCss ?? '';
      Dialog.create({
        title: 'Theme imported',
        message: `Loaded "${themeStore.resolvedTheme.name}".`,
      });
    } catch (error) {
      Dialog.create({
        title: 'Import failed',
        message: error instanceof Error ? error.message : 'Invalid theme file',
      });
    }
  };
  input.click();
}

function resetTheme() {
  themeStore.resetOverrides();
  customCss.value = '';
}
</script>

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="sdmx-dialog-card theme-dialog q-dialog-plugin">
      <q-card-section class="row items-center q-pb-md sdmx-border-bottom">
        <div>
          <div class="text-h6 font-weight-bold">Theme</div>
          <div class="text-caption sdmx-text-muted">Presets, token overrides, and custom CSS</div>
        </div>
        <q-space />
        <XButton icon="close" flat size="sm" @click="onDialogCancel" />
      </q-card-section>

    <q-card-section class="q-gutter-y-md dialog-body">
      <div class="text-subtitle2">Theme gallery</div>
      <ThemeGallery />

      <hr class="sdmx-separator">

      <div class="q-mb-xs text-subtitle2 text-grey-4">Theme preset</div>
      <XSelect
        :model-value="themeStore.activeThemeId"
        :options="themeOptions"
        @update:model-value="themeStore.setActiveThemeId"
      />

      <div class="text-subtitle2">Quick token overrides</div>
      <div class="row q-col-gutter-sm">
        <div class="col-6 col-sm-4">
          <div class="q-mb-xs text-caption text-grey-4">Primary</div>
          <XInput v-model="tokenDraft.primary" />
        </div>
        <div class="col-6 col-sm-4">
          <div class="q-mb-xs text-caption text-grey-4">Page background</div>
          <XInput v-model="tokenDraft.bgPage" />
        </div>
        <div class="col-6 col-sm-4">
          <div class="q-mb-xs text-caption text-grey-4">Surface background</div>
          <XInput v-model="tokenDraft.bgSurface" />
        </div>
        <div class="col-6 col-sm-4">
          <div class="q-mb-xs text-caption text-grey-4">Text</div>
          <XInput v-model="tokenDraft.text" />
        </div>
        <div class="col-6 col-sm-4">
          <div class="q-mb-xs text-caption text-grey-4">Scratch bar</div>
          <XInput v-model="tokenDraft.scratch" />
        </div>
        <div class="col-6 col-sm-4">
          <div class="q-mb-xs text-caption text-grey-4">Plot background</div>
          <XInput v-model="tokenDraft.plotBackground" />
        </div>
        <div class="col-6 col-sm-4">
          <div class="q-mb-xs text-caption text-grey-4">Plot fixture</div>
          <XInput v-model="tokenDraft.plotFixture" />
        </div>
        <div class="col-6 col-sm-4">
          <div class="q-mb-xs text-caption text-grey-4">Plot selected</div>
          <XInput v-model="tokenDraft.plotSelected" />
        </div>
        <div class="col-6 col-sm-4">
          <div class="q-mb-xs text-caption text-grey-4">Plot grid</div>
          <XInput v-model="tokenDraft.plotGrid" />
        </div>
        <div class="col-6 col-sm-4">
          <div class="q-mb-xs text-caption text-grey-4">Plot center marker</div>
          <XInput v-model="tokenDraft.plotCenter" />
        </div>
        <div class="col-6 col-sm-4">
          <div class="q-mb-xs text-caption text-grey-4">Plot labels</div>
          <XInput v-model="tokenDraft.plotLabel" />
        </div>
      </div>
      <div class="row q-gutter-sm">
        <XButton color="primary" label="Apply token overrides" @click="applyTokenDraft" />
        <XButton flat label="Reset overrides" @click="resetTheme" />
      </div>

      <hr class="sdmx-separator">

      <div class="text-subtitle2">Custom CSS</div>
      <div class="text-caption sdmx-text-muted q-mb-sm">
        Injected after theme tokens. Override any token or target app classes directly.
      </div>
      <textarea
        v-model="customCss"
        class="sdmx-textarea"
        placeholder=":root { --sdmx-color-primary: #ff00aa; }"
      />
      <div class="q-mt-sm">
        <XButton color="primary" label="Apply custom CSS" @click="applyCustomCss" />
      </div>

      <hr class="sdmx-separator">

      <div class="text-subtitle2">CSS variables</div>
      <div class="token-reference">
        <code v-for="token in THEME_CSS_VAR_KEYS" :key="token" class="token-chip">{{ token }}</code>
      </div>

      <div class="row q-gutter-sm">
        <XButton flat icon="download" label="Export theme JSON" @click="exportTheme" />
        <XButton flat icon="upload" label="Import theme JSON" @click="importTheme" />
      </div>
    </q-card-section>

      <q-card-actions align="right" class="q-pa-md sdmx-border-top">
        <XButton label="Close" flat color="default" @click="onDialogOK" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.theme-dialog {
  width: min(720px, 96vw);
}

.dialog-body {
  max-height: min(640px, 72vh);
  overflow-y: auto;
}

.sdmx-textarea {
  width: 100%;
  min-height: 120px;
  border-radius: 5px;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
  color: #f5f5f7;
  padding: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 13px;
  outline: none;
  resize: vertical;
}
.sdmx-textarea:focus {
  box-shadow: 0 0 0 2.5px rgba(10, 132, 255, 0.5);
  border-color: #0a84ff;
}

.token-reference {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.token-chip {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--sdmx-color-bg-muted);
  font-size: 11px;
}
</style>
