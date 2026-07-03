<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { Dialog } from 'quasar';
import { computed, ref, watch } from 'vue';
import ThemeGallery from 'src/components/ThemeGallery.vue';
import XButton from 'src/components/controls/XButton.vue';
import XCard from 'src/components/controls/XCard.vue';
import XInput from 'src/components/controls/XInput.vue';
import XSelect from 'src/components/controls/XSelect.vue';
import { useThemeStore } from 'src/stores/theme';
import { THEME_CSS_VAR_KEYS } from 'src/themes/css-vars';

const themeStore = useThemeStore();

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

const themeOptions = computed(() =>
  themeStore.availableThemes.map((theme) => ({
    label: theme.name,
    value: theme.id,
  }))
);

const dockviewThemeOptions = [
  { label: 'Dark', value: 'dark' },
  { label: 'Light', value: 'light' },
  { label: 'Dracula', value: 'dracula' },
  { label: 'Nord', value: 'nord' },
  { label: 'Nord (Spaced)', value: 'nord-spaced' },
  { label: 'Abyss', value: 'abyss' },
  { label: 'Abyss (Spaced)', value: 'abyss-spaced' },
  { label: 'Catppuccin Mocha', value: 'catppuccin-mocha' },
  { label: 'Catppuccin Mocha (Spaced)', value: 'catppuccin-mocha-spaced' },
  { label: 'GitHub Dark', value: 'github-dark' },
  { label: 'GitHub Dark (Spaced)', value: 'github-dark-spaced' },
  { label: 'GitHub Light', value: 'github-light' },
  { label: 'GitHub Light (Spaced)', value: 'github-light-spaced' },
  { label: 'Light (Spaced)', value: 'light-spaced' },
  { label: 'Monokai', value: 'monokai' },
  { label: 'Solarized Light', value: 'solarized-light' },
  { label: 'Solarized Light (Spaced)', value: 'solarized-light-spaced' },
  { label: 'VS', value: 'vs' },
];

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

function resetThemeOverrides() {
  themeStore.resetOverrides();
  customCss.value = '';
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
</script>

<template>
  <XCard title="Theme">
    <div class="q-gutter-y-md">
      <ThemeGallery />

      <XSelect
        :model-value="themeStore.activeThemeId"
        :options="themeOptions"
        label="Theme preset"
        @update:model-value="themeStore.setActiveThemeId"
      />

      <XSelect
        :model-value="themeStore.dockviewTheme"
        :options="dockviewThemeOptions"
        label="Dockview theme"
        @update:model-value="themeStore.setDockviewTheme"
      />

      <div class="settings-subtitle">Quick Token Overrides</div>
      <div class="row q-col-gutter-sm">
        <div class="col-6 col-lg-4"><XInput v-model="tokenDraft.primary" label="Primary" /></div>
        <div class="col-6 col-lg-4"><XInput v-model="tokenDraft.bgPage" label="Page background" /></div>
        <div class="col-6 col-lg-4"><XInput v-model="tokenDraft.bgSurface" label="Surface background" /></div>
        <div class="col-6 col-lg-4"><XInput v-model="tokenDraft.text" label="Text" /></div>
        <div class="col-6 col-lg-4"><XInput v-model="tokenDraft.scratch" label="Scratch bar" /></div>
        <div class="col-6 col-lg-4"><XInput v-model="tokenDraft.plotBackground" label="Plot background" /></div>
        <div class="col-6 col-lg-4"><XInput v-model="tokenDraft.plotFixture" label="Plot fixture" /></div>
        <div class="col-6 col-lg-4"><XInput v-model="tokenDraft.plotSelected" label="Plot selected" /></div>
        <div class="col-6 col-lg-4"><XInput v-model="tokenDraft.plotGrid" label="Plot grid" /></div>
        <div class="col-6 col-lg-4"><XInput v-model="tokenDraft.plotCenter" label="Plot center" /></div>
        <div class="col-6 col-lg-4"><XInput v-model="tokenDraft.plotLabel" label="Plot labels" /></div>
      </div>

      <div class="row q-gutter-sm">
        <XButton color="primary" label="Apply token overrides" @click="applyTokenDraft" />
        <XButton flat label="Reset overrides" @click="resetThemeOverrides" />
      </div>

      <XInput v-model="customCss" label="Custom CSS" />
      <XButton color="primary" label="Apply custom CSS" @click="applyCustomCss" />

      <div class="token-reference">
        <code v-for="token in THEME_CSS_VAR_KEYS" :key="token" class="token-chip">{{ token }}</code>
      </div>

      <div class="row q-gutter-sm">
        <XButton flat icon="download" label="Export theme JSON" @click="exportTheme" />
        <XButton flat icon="upload" label="Import theme JSON" @click="importTheme" />
      </div>
    </div>
  </XCard>
</template>

<style scoped lang="scss">
.settings-subtitle {
  font-size: 12px;
  color: var(--sdmx-color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 700;
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
