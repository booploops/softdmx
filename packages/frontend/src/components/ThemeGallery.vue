<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useThemeStore } from 'src/stores/theme';
import type { ThemeDefinition } from 'src/themes/types';

const themeStore = useThemeStore();

const emit = defineEmits<{ select: [string] }>();

function selectTheme(theme: ThemeDefinition) {
  themeStore.setActiveThemeId(theme.id);
  emit('select', theme.id);
}

function previewStyle(theme: ThemeDefinition) {
  const { colors } = theme.tokens;
  return {
    background: `linear-gradient(135deg, ${colors.bgPage}, ${colors.bgElevated})`,
    borderColor: colors.primary,
  };
}
</script>

<template>
  <div class="theme-gallery">
    <button
      v-for="theme in themeStore.availableThemes"
      :key="theme.id"
      type="button"
      class="theme-gallery__card sdmx-focus-ring"
      :class="{ 'theme-gallery__card--active': themeStore.activeThemeId === theme.id }"
      :style="previewStyle(theme)"
      :aria-pressed="themeStore.activeThemeId === theme.id"
      @click="selectTheme(theme)"
    >
      <span class="theme-gallery__swatch" :style="{ background: theme.tokens.colors.primary }" />
      <span class="theme-gallery__swatch" :style="{ background: theme.tokens.colors.scratch }" />
      <span class="theme-gallery__swatch" :style="{ background: theme.tokens.colors.gm }" />
      <span class="theme-gallery__name">{{ theme.name }}</span>
      <span v-if="theme.description" class="theme-gallery__desc">{{ theme.description }}</span>
    </button>
  </div>
</template>

<style scoped>
.theme-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--sdmx-space-sm);
}

.theme-gallery__card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--sdmx-space-xs);
  padding: var(--sdmx-space-md);
  border: 2px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-md);
  cursor: pointer;
  text-align: left;
  min-height: 100px;
  transition: border-color var(--sdmx-motion-duration-fast) var(--sdmx-motion-easing);
}

.theme-gallery__card--active {
  border-color: var(--sdmx-color-primary);
  box-shadow: 0 0 0 1px var(--sdmx-color-primary-ring);
}

.theme-gallery__swatch {
  width: 16px;
  height: 16px;
  border-radius: var(--sdmx-radius-full);
  display: inline-block;
  margin-right: 2px;
}

.theme-gallery__name {
  font-size: var(--sdmx-font-size-label);
  font-weight: var(--sdmx-font-weight-bold);
  color: var(--sdmx-color-text);
}

.theme-gallery__desc {
  font-size: var(--sdmx-font-size-caption);
  color: var(--sdmx-color-text-muted);
  line-height: var(--sdmx-line-height-tight);
}
</style>
