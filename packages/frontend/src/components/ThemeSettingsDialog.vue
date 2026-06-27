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
        <q-btn icon="close" flat round dense @click="onDialogCancel" />
      </q-card-section>

    <q-card-section class="q-gutter-y-md dialog-body">
      <div class="text-subtitle2">Theme gallery</div>
      <ThemeGallery />

      <q-separator dark />

      <q-select
        :model-value="themeStore.activeThemeId"
        :options="themeOptions"
        label="Theme preset"
        dark
        filled
        dense
        emit-value
        map-options
        @update:model-value="themeStore.setActiveThemeId"
      />

      <div class="text-subtitle2">Quick token overrides</div>
      <div class="row q-col-gutter-sm">
        <div class="col-6 col-sm-4">
          <q-input v-model="tokenDraft.primary" label="Primary" dark filled dense />
        </div>
        <div class="col-6 col-sm-4">
          <q-input v-model="tokenDraft.bgPage" label="Page background" dark filled dense />
        </div>
        <div class="col-6 col-sm-4">
          <q-input v-model="tokenDraft.bgSurface" label="Surface background" dark filled dense />
        </div>
        <div class="col-6 col-sm-4">
          <q-input v-model="tokenDraft.text" label="Text" dark filled dense />
        </div>
        <div class="col-6 col-sm-4">
          <q-input v-model="tokenDraft.scratch" label="Scratch bar" dark filled dense />
        </div>
        <div class="col-6 col-sm-4">
          <q-input v-model="tokenDraft.plotBackground" label="Plot background" dark filled dense />
        </div>
        <div class="col-6 col-sm-4">
          <q-input v-model="tokenDraft.plotFixture" label="Plot fixture" dark filled dense />
        </div>
        <div class="col-6 col-sm-4">
          <q-input v-model="tokenDraft.plotSelected" label="Plot selected" dark filled dense />
        </div>
        <div class="col-6 col-sm-4">
          <q-input v-model="tokenDraft.plotGrid" label="Plot grid" dark filled dense />
        </div>
        <div class="col-6 col-sm-4">
          <q-input v-model="tokenDraft.plotCenter" label="Plot center marker" dark filled dense />
        </div>
        <div class="col-6 col-sm-4">
          <q-input v-model="tokenDraft.plotLabel" label="Plot labels" dark filled dense />
        </div>
      </div>
      <div class="row q-gutter-sm">
        <q-btn color="primary" dense label="Apply token overrides" @click="applyTokenDraft" />
        <q-btn flat dense label="Reset overrides" @click="resetTheme" />
      </div>

      <q-separator dark />

      <div class="text-subtitle2">Custom CSS</div>
      <div class="text-caption sdmx-text-muted q-mb-sm">
        Injected after theme tokens. Override any token or target app classes directly.
      </div>
      <q-input
        v-model="customCss"
        type="textarea"
        autogrow
        dark
        filled
        class="custom-css-input"
        placeholder=":root { --sdmx-color-primary: #ff00aa; }"
      />
      <q-btn color="secondary" dense label="Apply custom CSS" @click="applyCustomCss" />

      <q-separator dark />

      <div class="text-subtitle2">CSS variables</div>
      <div class="token-reference">
        <code v-for="token in THEME_CSS_VAR_KEYS" :key="token" class="token-chip">{{ token }}</code>
      </div>

      <div class="row q-gutter-sm">
        <q-btn flat dense icon="download" label="Export theme JSON" @click="exportTheme" />
        <q-btn flat dense icon="upload" label="Import theme JSON" @click="importTheme" />
      </div>
    </q-card-section>

      <q-card-actions align="right" class="q-pa-md sdmx-border-top">
        <q-btn label="Close" flat color="grey-5" @click="onDialogOK" />
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

.custom-css-input :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  min-height: 120px;
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
