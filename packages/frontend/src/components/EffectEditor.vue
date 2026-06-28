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
import XButton from 'src/components/controls/XButton.vue';
import XListView from 'src/components/controls/XListView.vue';
import XListItem from 'src/components/controls/XListItem.vue';
import XSelect from 'src/components/controls/XSelect.vue';
import XInput from 'src/components/controls/XInput.vue';
import XSwitch from 'src/components/controls/XSwitch.vue';
import XCheckbox from 'src/components/controls/XCheckbox.vue';

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
      <div class="text-h6 font-weight-bold">Effect Editor</div>
      <XButton color="primary" icon="add" label="Add Effect" @click="addEffect" />
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-4">
        <XListView :bordered="true">
          <XListItem
            v-for="effect in effects"
            :key="effect.id"
            clickable
            :active="effect.id === selectedEffectId"
            @click="selectedEffectId = effect.id"
          >
            <div class="effect-item-content">
              <div class="effect-item-name">{{ effect.name }}</div>
              <div class="effect-item-caption text-grey-5">{{ effect.type }} · {{ effect.target.attr }}</div>
            </div>
            <template #append>
              <XButton flat size="sm" icon="delete" color="danger" @click.stop="deleteEffect(effect.id)" />
            </template>
          </XListItem>
          <XListItem v-if="effects.length === 0" :clickable="false">
            <div class="text-grey-5">No effects yet</div>
          </XListItem>
        </XListView>
      </div>

      <div class="col-8" v-if="selectedEffect">
        <div class="sdmx-editor-card">
          <div class="sdmx-editor-card-body q-gutter-y-md">
            <div>
              <div class="q-mb-xs text-caption text-grey-4">Effect Name</div>
              <XInput
                :model-value="selectedEffect.name"
                @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { effect.name = value || 'Effect'; })"
              />
            </div>

            <div class="row q-col-gutter-sm items-end">
              <div class="col-4">
                <div class="q-mb-xs text-caption text-grey-4">Type</div>
                <XSelect
                  :model-value="selectedEffect.type"
                  :options="[
                    { label: 'Sine', value: 'sine' },
                    { label: 'Saw', value: 'saw' },
                    { label: 'Step', value: 'step' },
                    { label: 'Chase', value: 'chase' },
                    { label: 'Phaser', value: 'phaser' },
                    { label: 'Random Hold', value: 'random_hold' },
                  ]"
                  @update:model-value="(value) => changeEffectType(selectedEffect.id, value)"
                />
              </div>
              <div class="col-4">
                <div class="q-mb-xs text-caption text-grey-4">Sync</div>
                <XSelect
                  :model-value="selectedEffect.sync ?? 'free'"
                  :options="[
                    { label: 'Free', value: 'free' },
                    { label: 'Link', value: 'link' },
                  ]"
                  @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { effect.sync = value; })"
                />
              </div>
              <div class="col-4 q-pb-xs">
                <XSwitch
                  :model-value="selectedEffect.enabled"
                  label="Enabled"
                  @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { effect.enabled = !!value; })"
                />
              </div>
            </div>

            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <div class="q-mb-xs text-caption text-grey-4">Target Group</div>
                <XSelect
                  :model-value="selectedEffect.target.group ?? ''"
                  :options="[{ label: 'None', value: '' }, ...groupOptions]"
                  @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { effect.target.group = value || undefined; if (value) delete effect.target.fixtures; })"
                />
              </div>
              <div class="col-6">
                <div class="q-mb-xs text-caption text-grey-4">Target Fixtures</div>
                <div class="fixtures-checklist">
                  <XCheckbox
                    v-for="opt in fixtureOptions"
                    :key="opt.value"
                    :model-value="(selectedEffect.target.fixtures ?? []).includes(opt.value)"
                    :label="opt.label"
                    @update:model-value="(checked) => {
                      const current = [...(selectedEffect.target.fixtures ?? [])];
                      if (checked) {
                        if (!current.includes(opt.value)) current.push(opt.value);
                      } else {
                        const index = current.indexOf(opt.value);
                        if (index > -1) current.splice(index, 1);
                      }
                      updateEffect(selectedEffect.id, (effect) => {
                        effect.target.fixtures = current;
                        if (current.length > 0) delete effect.target.group;
                      });
                    }"
                  />
                </div>
              </div>
            </div>

            <div>
              <div class="q-mb-xs text-caption text-grey-4">Target Attribute</div>
              <XSelect
                :model-value="selectedEffect.target.attr"
                :options="attributeOptions"
                @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { effect.target.attr = value; })"
              />
            </div>

            <div v-if="'rate' in selectedEffect">
              <div class="q-mb-xs text-caption text-grey-4">Rate (Hz)</div>
              <XInput
                :model-value="selectedEffect.rate"
                type="number"
                min="0"
                step="0.1"
                @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { (effect as { rate: number }).rate = Number(value) || 0; })"
              />
            </div>

            <div class="row q-col-gutter-sm" v-if="selectedEffect.type === 'sine' || selectedEffect.type === 'phaser'">
              <div class="col-4">
                <div class="q-mb-xs text-caption text-grey-4">Depth</div>
                <XInput
                  :model-value="selectedEffect.depth"
                  type="number"
                  min="0"
                  max="255"
                  @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { (effect as { depth: number }).depth = Number(value) || 0; })"
                />
              </div>
              <div class="col-4">
                <div class="q-mb-xs text-caption text-grey-4">Offset</div>
                <XInput
                  :model-value="selectedEffect.offset ?? 128"
                  type="number"
                  min="0"
                  max="255"
                  @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { (effect as { offset?: number }).offset = Number(value) || 0; })"
                />
              </div>
              <div class="col-4" v-if="selectedEffect.type === 'phaser'">
                <div class="q-mb-xs text-caption text-grey-4">Phase Spread</div>
                <XInput
                  :model-value="selectedEffect.phaseSpread ?? 0.125"
                  type="number"
                  min="0"
                  step="0.01"
                  @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { (effect as { phaseSpread?: number }).phaseSpread = Number(value) || 0; })"
                />
              </div>
            </div>

            <div class="row q-col-gutter-sm" v-if="selectedEffect.type === 'saw' || selectedEffect.type === 'random_hold'">
              <div class="col-6">
                <div class="q-mb-xs text-caption text-grey-4">Min</div>
                <XInput
                  :model-value="selectedEffect.min"
                  type="number"
                  min="0"
                  max="255"
                  @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { (effect as { min: number }).min = Number(value) || 0; })"
                />
              </div>
              <div class="col-6">
                <div class="q-mb-xs text-caption text-grey-4">Max</div>
                <XInput
                  :model-value="selectedEffect.max"
                  type="number"
                  min="0"
                  max="255"
                  @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { (effect as { max: number }).max = Number(value) || 0; })"
                />
              </div>
              <div class="col-6" v-if="selectedEffect.type === 'random_hold'">
                <div class="q-mb-xs text-caption text-grey-4">Seed</div>
                <XInput
                  :model-value="selectedEffect.seed ?? 0"
                  type="number"
                  @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { (effect as { seed?: number }).seed = Number(value) || 0; })"
                />
              </div>
            </div>

            <div v-if="selectedEffect.type === 'step'">
              <div class="q-mb-xs text-caption text-grey-4">Steps</div>
              <XInput
                :model-value="stringifySteps(selectedEffect.steps)"
                placeholder="Comma-separated DMX values"
                @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { (effect as { steps: number[] }).steps = parseSteps(value || ''); })"
              />
              <div class="text-caption text-grey-5 q-mt-xs">Comma-separated DMX values</div>
            </div>

            <div class="row q-col-gutter-sm" v-if="selectedEffect.type === 'chase'">
              <div class="col-4">
                <div class="q-mb-xs text-caption text-grey-4">Width</div>
                <XInput
                  :model-value="selectedEffect.width"
                  type="number"
                  min="1"
                  @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { (effect as { width: number }).width = Math.max(1, Number(value) || 1); })"
                />
              </div>
              <div class="col-4">
                <div class="q-mb-xs text-caption text-grey-4">Direction</div>
                <XSelect
                  :model-value="selectedEffect.direction"
                  :options="[
                    { label: 'Forward', value: 'forward' },
                    { label: 'Reverse', value: 'reverse' },
                  ]"
                  @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { (effect as { direction: 'forward' | 'reverse' }).direction = value; })"
                />
              </div>
              <div class="col-4">
                <div class="q-mb-xs text-caption text-grey-4">Wings</div>
                <XInput
                  :model-value="selectedEffect.wings ?? 1"
                  type="number"
                  min="1"
                  @update:model-value="(value) => updateEffect(selectedEffect.id, (effect) => { (effect as { wings?: number }).wings = Math.max(1, Number(value) || 1); })"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.effect-item-content {
  display: flex;
  flex-direction: column;
}

.effect-item-name {
  font-weight: 500;
  font-size: 13px;
}

.effect-item-caption {
  font-size: 11px;
}

.sdmx-editor-card {
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  background-color: #ffffff;
}

.body--dark .sdmx-editor-card {
  border-color: rgba(255, 255, 255, 0.15);
  background-color: #1e1e1e;
}

.sdmx-editor-card-body {
  padding: 16px;
}

.fixtures-checklist {
  max-height: 120px;
  overflow-y: auto;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 5px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: #ffffff;
}

.body--dark .fixtures-checklist {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.15);
}
</style>
