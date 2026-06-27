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
import { SdmxEmptyState } from 'src/components/ui';

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
      <div class="text-h6">Effects</div>
      <q-space />
      <q-chip dense color="primary" text-color="white">Enabled {{ enabledCount }}</q-chip>
      <q-chip dense color="secondary" text-color="white" class="q-ml-xs">Running {{ runningCount }}</q-chip>
      <q-btn
        dense
        flat
        icon="open_in_new"
        label="Open Editor"
        class="q-ml-sm"
        @click="showEffectEditor = true"
      />
    </div>

    <div class="row items-center q-mb-md q-gutter-sm">
      <q-btn-toggle
        v-model="editorMode"
        dense
        no-caps
        toggle-color="primary"
        :options="[
          { label: 'Inline editor', value: 'inline' },
          { label: 'Modal editor', value: 'modal' },
        ]"
      />
    </div>

    <q-list v-if="effects.length" bordered class="rounded-borders q-mb-md">
      <q-item v-for="effect in effects" :key="effect.id">
        <q-item-section>
          <q-item-label>{{ effect.name }}</q-item-label>
          <q-item-label caption>{{ effect.type }}</q-item-label>
          <div class="row items-center q-gutter-xs q-mt-xs">
            <q-chip
              v-for="chip in targetSummary(effect)"
              :key="`${effect.id}-${chip}`"
              dense
              size="sm"
              color="grey-8"
              text-color="grey-2"
            >
              {{ chip }}
            </q-chip>
          </div>
        </q-item-section>
        <q-item-section side class="row no-wrap items-center q-gutter-xs">
          <q-chip
            dense
            size="sm"
            :color="effect.enabled ? 'positive' : 'grey-7'"
            :text-color="effect.enabled ? 'black' : 'grey-3'"
          >
            {{ effect.enabled ? 'Enabled' : 'Disabled' }}
          </q-chip>
          <q-chip
            dense
            size="sm"
            :color="effect.enabled && outputEngine.isGlobalPlaying ? 'accent' : 'grey-7'"
            :text-color="effect.enabled && outputEngine.isGlobalPlaying ? 'black' : 'grey-3'"
          >
            {{ effect.enabled && outputEngine.isGlobalPlaying ? 'Running' : 'Idle' }}
          </q-chip>
          <q-toggle
            :model-value="effect.enabled"
            @update:model-value="(value) => toggleEffect(effect.id, Boolean(value))"
          />
          <q-btn dense flat round icon="content_copy" @click="duplicateEffect(effect)">
            <q-tooltip>Duplicate effect</q-tooltip>
          </q-btn>
        </q-item-section>
      </q-item>
    </q-list>

    <SdmxEmptyState
      v-else
      icon="auto_awesome"
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
