<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import type { EffectDefinition } from '@softdmx/engine';
import { useShowStore } from 'src/stores/show';
import { useOutputEngineStore } from 'src/stores/output-playback';
import EffectEditor from './EffectEditor.vue';

const showStore = useShowStore();
const outputEngine = useOutputEngineStore();

const showEffectEditor = ref(false);
const editorMode = ref<'modal' | 'inline'>('inline');

const effects = computed(() => showStore.document.effects);
const enabledCount = computed(() => effects.value.filter((effect) => effect.enabled).length);
const runningCount = computed(() =>
  effects.value.filter((effect) => effect.enabled && outputEngine.isGlobalPlaying).length
);

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
  outputEngine.requestMerge();
}

function targetSummary(effect: EffectDefinition): string[] {
  const targets: string[] = [];
  if (effect.target.group) targets.push(effect.target.group);
  if (effect.target.fixtures?.length) targets.push(`${effect.target.fixtures.length} fixtures`);
  targets.push(effect.target.attr);
  return targets;
}
</script>

<template>
  <div class="effects-panel">
    <div class="effects-panel__header">
      <div class="text-h6 font-weight-bold">Effects</div>
      <div class="effects-panel__header-meta">
        <span class="sdmx-badge sdmx-badge--primary">Enabled {{ enabledCount }}</span>
        <span class="sdmx-badge sdmx-badge--accent">Running {{ runningCount }}</span>
        <XButton
          v-info="'program.effects.addEffect'"
          flat
          icon="external-link"
          label="Open Editor"
          @click="showEffectEditor = true"
        />
      </div>
    </div>

    <div class="effects-panel__modes">
      <XButtonGroup>
        <XButton
          :color="editorMode === 'inline' ? 'primary' : 'default'"
          label="Inline editor"
          size="sm"
          @click="editorMode = 'inline'"
        />
        <XButton
          :color="editorMode === 'modal' ? 'primary' : 'default'"
          label="Modal editor"
          size="sm"
          @click="editorMode = 'modal'"
        />
      </XButtonGroup>
    </div>

    <XListView
      v-if="effects.length"
      :bordered="true"
      class="effects-panel__list"
    >
      <XListItem
        v-for="effect in effects"
        :key="effect.id"
        :clickable="false"
      >
        <div class="effects-panel-item-main">
          <div class="effect-name">{{ effect.name }}</div>
          <div class="effect-type text-grey-5">{{ effect.type }}</div>
          <div class="effects-panel__chips">
            <span
              v-for="chip in targetSummary(effect)"
              :key="`${effect.id}-${chip}`"
              class="sdmx-badge sdmx-badge--grey"
            >
              {{ chip }}
            </span>
          </div>
        </div>
        <template #append>
          <div class="effects-panel__item-actions">
            <span
              class="sdmx-badge"
              :class="effect.enabled ? 'sdmx-badge--positive' : 'sdmx-badge--grey'"
            >
              {{ effect.enabled ? 'Enabled' : 'Disabled' }}
            </span>
            <span
              class="sdmx-badge"
              :class="effect.enabled && outputEngine.isGlobalPlaying ? 'sdmx-badge--accent' : 'sdmx-badge--grey'"
            >
              {{ effect.enabled && outputEngine.isGlobalPlaying ? 'Running' : 'Idle' }}
            </span>
            <XSwitch
              v-info="'program.effects.enableEffect'"
              :model-value="effect.enabled"
              @update:model-value="(value) => toggleEffect(effect.id, Boolean(value))"
            />
            <XButton
              v-info="'program.effects.duplicateEffect'"
              flat
              size="sm"
              icon="copy"
              @click="duplicateEffect(effect)"
            />
          </div>
        </template>
      </XListItem>
    </XListView>

    <XWell
      v-else
      class="effects-panel__empty"
    >
      <XIcon
        name="sparkles"
        class="effects-panel__empty-icon"
      />
      <div class="effects-panel__empty-title">No effects configured</div>
      <div class="effects-panel__empty-hint">Open the editor to add your first effect.</div>
    </XWell>

    <EffectEditor v-if="editorMode === 'inline'" />

    <XDialog
      v-model="showEffectEditor"
      maximized
    >
      <XDialogTitlebar
        title="Effect Editor"
        @close="showEffectEditor = false"
      />
      <XDialogBody class="effects-panel__editor-body">
        <EffectEditor />
      </XDialogBody>
    </XDialog>
  </div>
</template>

<style scoped>
.effects-panel {
  padding: var(--sdmx-space-md, 16px);
}

.effects-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.effects-panel__header-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.effects-panel__modes {
  margin-bottom: 16px;
}

.effects-panel__list {
  max-height: none;
  margin-bottom: 16px;
}

.effects-panel__chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.effects-panel__item-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.effects-panel__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  text-align: center;
}

.effects-panel__empty-icon {
  font-size: 28px;
  opacity: 0.55;
}

.effects-panel__empty-title {
  font-weight: 600;
}

.effects-panel__empty-hint {
  font-size: 12px;
  color: var(--sdmx-color-text-muted);
}

.effects-panel__editor-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

.effects-panel-item-main {
  display: flex;
  flex-direction: column;
}

.effect-name {
  font-weight: 500;
  font-size: 13px;
}

.effect-type {
  font-size: 11px;
}

/* Custom Semantic Badge Styles (Flat Big Sur macOS style) */
.sdmx-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 4px;
  line-height: 1;
  border: 1px solid transparent;
}

.sdmx-badge--primary {
  background-color: #007aff;
  color: #ffffff;
}

.sdmx-badge--accent {
  background-color: #af52de;
  color: #ffffff;
}

.sdmx-badge--grey {
  background-color: rgba(0, 0, 0, 0.05);
  border-color: rgba(0, 0, 0, 0.1);
  color: #1d1d1f;
}

.sdmx-badge--positive {
  background-color: #34c759;
  color: #ffffff;
}

/* Dark theme semantic badge overrides */
.body--dark .sdmx-badge--grey {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.15);
  color: #f5f5f7;
}

.body--dark .sdmx-badge--primary {
  background-color: #0a84ff;
}

.body--dark .sdmx-badge--accent {
  background-color: #bf5af2;
}

.body--dark .sdmx-badge--positive {
  background-color: #30d158;
}
</style>
