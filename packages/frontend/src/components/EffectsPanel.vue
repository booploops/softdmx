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
import { SdmxEmptyState, SdmxIconButton } from 'src/components/ui';
import XButton from 'src/components/controls/XButton.vue';
import XButtonGroup from 'src/components/controls/XButtonGroup.vue';
import XListView from 'src/components/controls/XListView.vue';
import XListItem from 'src/components/controls/XListItem.vue';
import XSwitch from 'src/components/controls/XSwitch.vue';

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
  <div class="effects-panel q-pa-md">
    <div class="row items-center q-mb-sm">
      <div class="text-h6 font-weight-bold">Effects</div>
      <div class="row items-center q-ml-auto q-gutter-x-xs">
        <span class="sdmx-badge sdmx-badge--primary">Enabled {{ enabledCount }}</span>
        <span class="sdmx-badge sdmx-badge--accent">Running {{ runningCount }}</span>
        <XButton
          v-info="'program.effects.addEffect'"
          dense
          flat
          icon="external-link"
          label="Open Editor"
          @click="showEffectEditor = true"
        />
      </div>
    </div>

    <div class="row items-center q-mb-md">
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

    <XListView v-if="effects.length" :bordered="true" class="q-mb-md">
      <XListItem v-for="effect in effects" :key="effect.id" :clickable="false">
        <div class="effects-panel-item-main">
          <div class="effect-name">{{ effect.name }}</div>
          <div class="effect-type text-grey-5">{{ effect.type }}</div>
          <div class="row items-center q-gutter-xs q-mt-xs">
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
          <div class="row items-center q-gutter-x-sm">
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
            <SdmxIconButton icon="copy" info-key="program.effects.duplicateEffect" @click="duplicateEffect(effect)" />
          </div>
        </template>
      </XListItem>
    </XListView>

    <SdmxEmptyState
      v-else
      icon="sparkles"
      title="No effects configured"
      description="Open the editor to add your first effect."
      class="q-mb-md"
    />

    <EffectEditor v-if="editorMode === 'inline'" />

    <q-dialog v-model="showEffectEditor" maximized>
      <q-card><EffectEditor /></q-card>
    </q-dialog>
  </div>
</template>

<style scoped>
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
