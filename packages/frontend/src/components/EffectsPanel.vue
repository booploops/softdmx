<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { EffectDefinition } from '@softdmx/engine';
import { SdmxButton, SdmxEmptyState, SdmxStatusChip, SdmxToggle } from 'src/components/ui';
import { useInfoText } from 'src/composables/useInfoText';
import { useOutputEngineStore } from 'src/stores/output-playback';
import { useShowStore } from 'src/stores/show';
import { computed, ref, watch } from 'vue';
import EffectEditor from './EffectEditor.vue';

const showStore = useShowStore();
const outputEngine = useOutputEngineStore();
const { info } = useInfoText();

const effects = computed(() => showStore.document.effects);
const showEffectEditor = ref(false);
const editorEffectId = ref<string | null>(null);
const selectedEffectId = ref<string | null>(null);

watch(
  effects,
  (next) => {
    if (!next.length) {
      selectedEffectId.value = null;
      return;
    }
    if (!selectedEffectId.value || !next.some((effect) => effect.id === selectedEffectId.value)) {
      selectedEffectId.value = next[0]?.id ?? null;
    }
  },
  { immediate: true },
);

function selectEffect(effectId: string) {
  selectedEffectId.value = effectId;
}

function openEditor(effectId?: string) {
  editorEffectId.value = effectId ?? selectedEffectId.value;
  showEffectEditor.value = true;
  // Avoid focus returning to the card with a visible focus ring after Esc closes the dialog.
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

function onEffectActivate(effect: EffectDefinition) {
  openEditor(effect.id);
}

function closeEditor() {
  showEffectEditor.value = false;
  editorEffectId.value = null;
}

function toggleEffect(effectId: string, enabled: boolean) {
  showStore.updateDocument((doc) => {
    const effect = doc.effects.find((entry) => entry.id === effectId);
    if (effect) effect.enabled = enabled;
  });
  outputEngine.requestMerge();
}

function duplicateEffect(source: EffectDefinition) {
  const copy = JSON.parse(JSON.stringify(source)) as EffectDefinition;
  copy.id = `fx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  copy.name = `${source.name} Copy`;
  showStore.updateDocument((doc) => {
    doc.effects.push(copy);
  });
  selectedEffectId.value = copy.id;
  outputEngine.requestMerge();
}

function effectTypeLabel(type: EffectDefinition['type']): string {
  switch (type) {
    case 'sine':
      return 'Sine';
    case 'saw':
      return 'Saw';
    case 'step':
      return 'Step';
    case 'chase':
      return 'Chase';
    case 'phaser':
      return 'Phaser';
    case 'random_hold':
      return 'Random';
    default:
      return type;
  }
}

function targetSummary(effect: EffectDefinition): string {
  const groupNames = [
    ...(effect.target.groups ?? []),
    ...(effect.target.group ? [effect.target.group] : []),
  ];
  const fixtureCount = effect.target.fixtures?.length ?? 0;
  const parts: string[] = [];
  if (fixtureCount > 0) parts.push(`${fixtureCount} fixture${fixtureCount === 1 ? '' : 's'}`);
  if (groupNames.length === 1) parts.push(groupNames[0]!);
  else if (groupNames.length > 1) parts.push(`${groupNames.length} groups`);
  return parts.length ? parts.join(' · ') : 'No target';
}

function attrSummary(effect: EffectDefinition): string {
  const names = effect.target.attrs?.length
    ? effect.target.attrs
    : effect.target.attr
      ? [effect.target.attr]
      : [];
  if (!names.length) return 'No attrs';
  if (names.length === 1) return names[0]!;
  return `${names.length} attrs`;
}

function isRunning(effect: EffectDefinition): boolean {
  return effect.enabled && outputEngine.isGlobalPlaying;
}
</script>

<template>
  <div class="effects-panel">
    <div class="effects-panel__header">
      <div class="text-h6">Effects</div>
      <div class="effects-panel__actions">
        <SdmxButton
          variant="ghost"
          icon="pencil"
          label="Edit effects"
          info="program.effects.editEffect"
          @click="openEditor()"
        />
      </div>
    </div>

    <div
      v-if="effects.length"
      class="effects-panel__grid"
    >
      <div
        v-for="effect in effects"
        :key="effect.id"
        role="button"
        tabindex="0"
        class="effect-card sdmx-focus-ring"
        :class="{ 'effect-card--active': selectedEffectId === effect.id }"
        :data-sdmx-info="info('program.effects.editEffect')"
        @click="selectEffect(effect.id)"
        @dblclick="onEffectActivate(effect)"
        @keydown.enter.prevent="onEffectActivate(effect)"
        @keydown.space.prevent="selectEffect(effect.id)"
      >
        <div class="effect-card__top">
          <div class="effect-card__title">{{ effect.name }}</div>
          <SdmxStatusChip
            :label="effectTypeLabel(effect.type)"
            variant="info"
          />
        </div>
        <div class="effect-card__meta sdmx-text-caption sdmx-text-mono">
          {{ targetSummary(effect) }} · {{ attrSummary(effect) }}
        </div>
        <div class="effect-card__status">
          <SdmxStatusChip
            :label="effect.enabled ? 'Enabled' : 'Disabled'"
            :variant="effect.enabled ? 'positive' : 'default'"
          />
          <SdmxStatusChip
            :label="isRunning(effect) ? 'Running' : 'Idle'"
            :variant="isRunning(effect) ? 'armed' : 'default'"
          />
        </div>
        <div
          class="effect-card__actions"
          @click.stop
          @dblclick.stop
        >
          <SdmxToggle
            :model-value="effect.enabled"
            info="program.effects.enableEffect"
            @update:model-value="(value) => toggleEffect(effect.id, value)"
          />
          <XButton
            v-info="'program.effects.duplicateEffect'"
            flat
            size="sm"
            icon="copy"
            @click="duplicateEffect(effect)"
          />
          <XButton
            v-info="'program.effects.editEffect'"
            flat
            size="sm"
            icon="pencil"
            @click="openEditor(effect.id)"
          />
        </div>
      </div>
    </div>

    <SdmxEmptyState
      v-else
      icon="sparkles"
      title="No effects yet"
      hint="Create an effect in the editor, then double-click a card to edit it."
    >
      <SdmxButton
        variant="primary"
        icon="pencil"
        label="Edit effects"
        info="program.effects.editEffect"
        @click="openEditor()"
      />
    </SdmxEmptyState>

    <q-dialog
      v-model="showEffectEditor"
      maximized
      transition-show="fade"
      transition-hide="fade"
      class="effect-editor-dialog-host"
    >
      <div class="effect-editor-dialog-shell">
        <EffectEditor
          :initial-effect-id="editorEffectId"
          @close="closeEditor"
        />
      </div>
    </q-dialog>
  </div>
</template>

<style scoped>
.effects-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  padding: var(--sdmx-space-md);
  gap: var(--sdmx-space-md);
  overflow: hidden;
}

.effects-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sdmx-space-md);
  flex-wrap: wrap;
  flex-shrink: 0;
}

.effects-panel__actions {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-sm);
}

.effects-panel__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--sdmx-space-sm);
  align-content: start;
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding-bottom: var(--sdmx-space-sm);
}

.effect-card {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-sm);
  min-width: 0;
  min-height: var(--sdmx-space-touch);
  padding: var(--sdmx-space-md);
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-md);
  background: var(--sdmx-color-bg-elevated);
  color: var(--sdmx-color-text);
  text-align: left;
  cursor: pointer;
}

.effect-card:hover {
  background: var(--sdmx-color-hover);
  border-color: var(--sdmx-color-border);
}

.effect-card--active {
  border-color: var(--sdmx-color-primary);
  background: var(--sdmx-color-primary-soft);
}

/* Active selection already signals focus; don't stack a second outline after dialog close. */
.effect-card--active:focus-visible {
  outline: none;
}

.effect-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sdmx-space-sm);
}

.effect-card__title {
  font-weight: var(--sdmx-font-weight-bold);
  font-size: var(--sdmx-font-size-label);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.effect-card__meta {
  color: var(--sdmx-color-text-muted);
}

.effect-card__status {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sdmx-space-xs);
}

.effect-card__actions {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-xs);
  margin-top: auto;
}

.effect-editor-dialog-shell {
  width: 100%;
  height: 100%;
  max-width: 100vw;
  max-height: 100vh;
  overflow: hidden;
  background: var(--sdmx-color-bg-page);
}
</style>
