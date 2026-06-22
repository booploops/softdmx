<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useShowStore } from 'src/stores/show';
import { useOutputEngineStore } from 'src/stores/output-playback';
import { useDMXStore } from 'src/stores/dmx';
import type { EffectDefinition } from '@softdmx/engine';

const showStore = useShowStore();
const engine = useOutputEngineStore();
const dmx = useDMXStore();

const effects = computed(() => showStore.document.effects);
const selectedEffectId = ref<string | null>(null);

const fixtureOptions = computed(() =>
  showStore.document.fixtures.map((fixture) => ({ label: fixture.name, value: fixture.name }))
);
const groupOptions = computed(() =>
  showStore.document.groups.map((group) => ({ label: group.name, value: group.name }))
);
const attributeOptions = computed(() => {
  const names = new Set<string>();
  for (const fixture of showStore.document.fixtures) {
    const fixtureMap = dmx.showfileFixturesMapped.find((entry) => entry.fixtureName === fixture.name);
    for (const channel of fixtureMap?.def.channels ?? []) {
      names.add(channel.name);
    }
  }
  return Array.from(names).map((name) => ({ label: name, value: name }));
});

const selectedEffect = computed(() => {
  if (!selectedEffectId.value) return null;
  return effects.value.find((effect) => effect.id === selectedEffectId.value) ?? null;
});

watch(
  effects,
  (nextEffects) => {
    if (nextEffects.length === 0) {
      selectedEffectId.value = null;
      return;
    }
    if (!selectedEffectId.value || !nextEffects.some((effect) => effect.id === selectedEffectId.value)) {
      selectedEffectId.value = nextEffects[0]?.id ?? null;
    }
  },
  { immediate: true }
);

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createDefaultEffect(): EffectDefinition {
  return {
    id: generateId(),
    name: 'New Effect',
    enabled: false,
    type: 'sine',
    rate: 1,
    depth: 64,
    offset: 128,
    target: {
      fixtures: [],
      attr: attributeOptions.value[0]?.value ?? 'Dimmer',
    },
    sync: 'free',
  };
}

function addEffect() {
  const effect = createDefaultEffect();
  showStore.updateDocument((doc) => {
    doc.effects.push(effect);
  });
  selectedEffectId.value = effect.id;
  engine.requestMerge();
}

function deleteEffect(effectId: string) {
  showStore.updateDocument((doc) => {
    doc.effects = doc.effects.filter((effect) => effect.id !== effectId);
  });
  engine.requestMerge();
}

function updateEffect(effectId: string, mutator: (effect: EffectDefinition) => void) {
  showStore.updateDocument((doc) => {
    const effect = doc.effects.find((entry) => entry.id === effectId);
    if (!effect) return;
    mutator(effect);
  });
  engine.requestMerge();
}

function changeEffectType(effectId: string, type: EffectDefinition['type']) {
  updateEffect(effectId, (effect) => {
    const base = {
      id: effect.id,
      name: effect.name,
      enabled: effect.enabled,
      target: effect.target,
      sync: effect.sync,
    };
    switch (type) {
      case 'sine':
        Object.assign(effect, { ...base, type, rate: 1, depth: 64, offset: 128 });
        break;
      case 'saw':
        Object.assign(effect, { ...base, type, rate: 1, min: 0, max: 255 });
        break;
      case 'step':
        Object.assign(effect, { ...base, type, rate: 1, steps: [0, 255] });
        break;
      case 'chase':
        Object.assign(effect, { ...base, type, rate: 1, width: 1, direction: 'forward', wings: 1 });
        break;
      case 'phaser':
        Object.assign(effect, { ...base, type, rate: 1, depth: 96, offset: 128, phaseSpread: 0.125 });
        break;
      case 'random_hold':
        Object.assign(effect, { ...base, type, rate: 2, min: 0, max: 255, seed: 0 });
        break;
    }
  });
}

function parseSteps(input: string): number[] {
  const steps = input
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((value) => !Number.isNaN(value))
    .map((value) => Math.max(0, Math.min(255, Math.round(value))));
  return steps.length > 0 ? steps : [0, 255];
}

function stringifySteps(steps: number[]): string {
  return steps.join(', ');
}
</script>

<template>
  <div class="effect-editor q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h6">Effect Editor</div>
      <q-btn color="primary" icon="add" label="Add Effect" @click="addEffect" />
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-4">
        <q-list bordered separator class="rounded-borders">
          <q-item
            v-for="effect in effects"
            :key="effect.id"
            clickable
            :active="effect.id === selectedEffectId"
            active-class="bg-primary text-white"
            @click="selectedEffectId = effect.id"
          >
            <q-item-section>
              <q-item-label>{{ effect.name }}</q-item-label>
              <q-item-label caption>{{ effect.type }} · {{ effect.target.attr }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn dense flat round icon="delete" color="negative" @click.stop="deleteEffect(effect.id)" />
            </q-item-section>
          </q-item>
          <q-item v-if="effects.length === 0">
            <q-item-section class="text-grey-5">No effects yet</q-item-section>
          </q-item>
        </q-list>
      </div>

      <div class="col-8" v-if="selectedEffect">
        <q-card flat bordered>
          <q-card-section class="q-gutter-md">
            <q-input
              :model-value="selectedEffect.name"
              label="Effect Name"
              @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { effect.name = value || 'Effect'; })"
            />

            <div class="row q-col-gutter-sm">
              <div class="col-4">
                <q-select
                  :model-value="selectedEffect.type"
                  :options="[
                    { label: 'Sine', value: 'sine' },
                    { label: 'Saw', value: 'saw' },
                    { label: 'Step', value: 'step' },
                    { label: 'Chase', value: 'chase' },
                    { label: 'Phaser', value: 'phaser' },
                    { label: 'Random Hold', value: 'random_hold' },
                  ]"
                  emit-value
                  map-options
                  label="Type"
                  @update:model-value="(value) => changeEffectType(selectedEffect.id, value)"
                />
              </div>
              <div class="col-4">
                <q-select
                  :model-value="selectedEffect.sync ?? 'free'"
                  :options="[
                    { label: 'Free', value: 'free' },
                    { label: 'Link', value: 'link' },
                  ]"
                  emit-value
                  map-options
                  label="Sync"
                  @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { effect.sync = value; })"
                />
              </div>
              <div class="col-4">
                <q-toggle
                  :model-value="selectedEffect.enabled"
                  label="Enabled"
                  @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { effect.enabled = !!value; })"
                />
              </div>
            </div>

            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-select
                  :model-value="selectedEffect.target.group"
                  :options="groupOptions"
                  emit-value
                  map-options
                  clearable
                  label="Target Group"
                  @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { effect.target.group = value || undefined; if (value) delete effect.target.fixtures; })"
                />
              </div>
              <div class="col-6">
                <q-select
                  :model-value="selectedEffect.target.fixtures ?? []"
                  :options="fixtureOptions"
                  emit-value
                  map-options
                  multiple
                  use-chips
                  label="Target Fixtures"
                  @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { effect.target.fixtures = value; if (value.length > 0) delete effect.target.group; })"
                />
              </div>
            </div>

            <q-select
              :model-value="selectedEffect.target.attr"
              :options="attributeOptions"
              emit-value
              map-options
              label="Target Attribute"
              @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { effect.target.attr = value; })"
            />

            <q-input
              v-if="'rate' in selectedEffect"
              :model-value="selectedEffect.rate"
              type="number"
              min="0"
              step="0.1"
              label="Rate (Hz)"
              @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { (effect as { rate: number }).rate = Number(value) || 0; })"
            />

            <div class="row q-col-gutter-sm" v-if="selectedEffect.type === 'sine' || selectedEffect.type === 'phaser'">
              <div class="col-4">
                <q-input
                  :model-value="selectedEffect.depth"
                  type="number"
                  min="0"
                  max="255"
                  label="Depth"
                  @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { (effect as { depth: number }).depth = Number(value) || 0; })"
                />
              </div>
              <div class="col-4">
                <q-input
                  :model-value="selectedEffect.offset ?? 128"
                  type="number"
                  min="0"
                  max="255"
                  label="Offset"
                  @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { (effect as { offset?: number }).offset = Number(value) || 0; })"
                />
              </div>
              <div class="col-4" v-if="selectedEffect.type === 'phaser'">
                <q-input
                  :model-value="selectedEffect.phaseSpread ?? 0.125"
                  type="number"
                  min="0"
                  step="0.01"
                  label="Phase Spread"
                  @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { (effect as { phaseSpread?: number }).phaseSpread = Number(value) || 0; })"
                />
              </div>
            </div>

            <div class="row q-col-gutter-sm" v-if="selectedEffect.type === 'saw' || selectedEffect.type === 'random_hold'">
              <div class="col-6">
                <q-input
                  :model-value="selectedEffect.min"
                  type="number"
                  min="0"
                  max="255"
                  label="Min"
                  @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { (effect as { min: number }).min = Number(value) || 0; })"
                />
              </div>
              <div class="col-6">
                <q-input
                  :model-value="selectedEffect.max"
                  type="number"
                  min="0"
                  max="255"
                  label="Max"
                  @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { (effect as { max: number }).max = Number(value) || 0; })"
                />
              </div>
              <div class="col-6" v-if="selectedEffect.type === 'random_hold'">
                <q-input
                  :model-value="selectedEffect.seed ?? 0"
                  type="number"
                  label="Seed"
                  @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { (effect as { seed?: number }).seed = Number(value) || 0; })"
                />
              </div>
            </div>

            <q-input
              v-if="selectedEffect.type === 'step'"
              :model-value="stringifySteps(selectedEffect.steps)"
              label="Steps"
              hint="Comma-separated DMX values"
              @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { (effect as { steps: number[] }).steps = parseSteps(value || ''); })"
            />

            <div class="row q-col-gutter-sm" v-if="selectedEffect.type === 'chase'">
              <div class="col-4">
                <q-input
                  :model-value="selectedEffect.width"
                  type="number"
                  min="1"
                  label="Width"
                  @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { (effect as { width: number }).width = Math.max(1, Number(value) || 1); })"
                />
              </div>
              <div class="col-4">
                <q-select
                  :model-value="selectedEffect.direction"
                  :options="[
                    { label: 'Forward', value: 'forward' },
                    { label: 'Reverse', value: 'reverse' },
                  ]"
                  emit-value
                  map-options
                  label="Direction"
                  @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { (effect as { direction: 'forward' | 'reverse' }).direction = value; })"
                />
              </div>
              <div class="col-4">
                <q-input
                  :model-value="selectedEffect.wings ?? 1"
                  type="number"
                  min="1"
                  label="Wings"
                  @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { (effect as { wings?: number }).wings = Math.max(1, Number(value) || 1); })"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>
