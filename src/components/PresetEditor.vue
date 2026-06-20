<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useShowStore } from 'src/stores/show';

const showStore = useShowStore();

const fixtureOptions = computed(() =>
  showStore.document.fixtures.map((fixture) => ({ label: fixture.name, value: fixture.name }))
);
const groupOptions = computed(() =>
  showStore.document.groups.map((group) => ({ label: group.name, value: group.name }))
);
const presets = computed(() => showStore.document.presets);

const selectedPresetId = ref<string | null>(null);

const selectedPreset = computed(() => {
  if (!selectedPresetId.value) return null;
  return presets.value.find((preset) => preset.id === selectedPresetId.value) ?? null;
});

watch(
  presets,
  (nextPresets) => {
    if (nextPresets.length === 0) {
      selectedPresetId.value = null;
      return;
    }
    if (!selectedPresetId.value || !nextPresets.some((preset) => preset.id === selectedPresetId.value)) {
      selectedPresetId.value = nextPresets[0]?.id ?? null;
    }
  },
  { immediate: true }
);

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function stringifyAttrs(attrs: Record<string, number>): string {
  return Object.entries(attrs)
    .map(([name, value]) => `${name}=${Math.round(value)}`)
    .join(', ');
}

function parseAttrs(input: string): Record<string, number> {
  const parsed: Record<string, number> = {};
  for (const pair of input.split(',')) {
    const [rawKey, rawValue] = pair.split('=');
    const key = rawKey?.trim();
    const value = Number(rawValue?.trim());
    if (!key || Number.isNaN(value)) continue;
    parsed[key] = Math.max(0, Math.min(255, Math.round(value)));
  }
  return parsed;
}

function addPreset() {
  const presetId = generateId();
  showStore.updateDocument((doc) => {
    doc.presets.push({
      id: presetId,
      name: `Preset ${doc.presets.length + 1}`,
      color: 'var(--sdmx-color-primary)',
      targets: [],
    });
  });
  selectedPresetId.value = presetId;
}

function deletePreset(presetId: string) {
  showStore.updateDocument((doc) => {
    doc.presets = doc.presets.filter((preset) => preset.id !== presetId);
  });
}

function updatePreset(
  presetId: string,
  updates: Partial<{ name: string; color: string | undefined }>
) {
  showStore.updateDocument((doc) => {
    const preset = doc.presets.find((entry) => entry.id === presetId);
    if (!preset) return;
    Object.assign(preset, updates);
  });
}

function addFixtureTarget() {
  if (!selectedPreset.value) return;
  showStore.updateDocument((doc) => {
    const preset = doc.presets.find((entry) => entry.id === selectedPreset.value?.id);
    if (!preset) return;
    preset.targets.push({
      fixtures: [],
      attrs: {},
    });
  });
}

function addGroupTarget() {
  if (!selectedPreset.value) return;
  showStore.updateDocument((doc) => {
    const preset = doc.presets.find((entry) => entry.id === selectedPreset.value?.id);
    if (!preset) return;
    preset.targets.push({
      group: doc.groups[0]?.name,
      attrs: {},
    });
  });
}

function updateTarget(index: number, key: 'fixtures' | 'group' | 'attrs', value: unknown) {
  if (!selectedPreset.value) return;
  showStore.updateDocument((doc) => {
    const preset = doc.presets.find((entry) => entry.id === selectedPreset.value?.id);
    const target = preset?.targets[index];
    if (!target) return;

    if (key === 'fixtures') {
      target.fixtures = (value as string[]) ?? [];
      delete target.group;
      return;
    }
    if (key === 'group') {
      target.group = (value as string) ?? undefined;
      delete target.fixtures;
      return;
    }
    target.attrs = value as Record<string, number>;
  });
}

function removeTarget(index: number) {
  if (!selectedPreset.value) return;
  showStore.updateDocument((doc) => {
    const preset = doc.presets.find((entry) => entry.id === selectedPreset.value?.id);
    if (!preset) return;
    preset.targets.splice(index, 1);
  });
}
</script>

<template>
  <div class="preset-editor q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h6">Preset Editor</div>
      <q-btn color="primary" icon="add" label="Add Preset" @click="addPreset" />
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-4">
        <q-list bordered separator class="rounded-borders">
          <q-item
            v-for="preset in presets"
            :key="preset.id"
            clickable
            :active="preset.id === selectedPresetId"
            active-class="bg-primary text-white"
            @click="selectedPresetId = preset.id"
          >
            <q-item-section>
              <q-item-label>{{ preset.name }}</q-item-label>
              <q-item-label caption>{{ preset.targets.length }} target(s)</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn dense flat round icon="delete" color="negative" @click.stop="deletePreset(preset.id)" />
            </q-item-section>
          </q-item>
          <q-item v-if="presets.length === 0">
            <q-item-section class="text-grey-5">No presets yet</q-item-section>
          </q-item>
        </q-list>
      </div>

      <div class="col-8" v-if="selectedPreset">
        <q-card flat bordered>
          <q-card-section class="q-gutter-md">
            <q-input
              :model-value="selectedPreset.name"
              label="Preset Name"
              @update:model-value="(value) => updatePreset(selectedPreset.id, { name: value || 'Preset' })"
            />
            <q-input
              :model-value="selectedPreset.color"
              label="Color (hex)"
              @update:model-value="(value) => updatePreset(selectedPreset.id, { color: value || undefined })"
            />
          </q-card-section>

          <q-separator />
          <q-card-section>
            <div class="row items-center justify-between q-mb-sm">
              <div class="text-subtitle1">Targets</div>
              <div class="row q-gutter-xs">
                <q-btn dense flat icon="person_add" label="Fixture Target" @click="addFixtureTarget" />
                <q-btn dense flat icon="group_add" label="Group Target" @click="addGroupTarget" />
              </div>
            </div>

            <q-list bordered separator class="rounded-borders">
              <q-item v-for="(target, index) in selectedPreset.targets" :key="`${selectedPreset.id}-${index}`">
                <q-item-section>
                  <div class="row q-col-gutter-sm">
                    <div class="col-5">
                      <q-select
                        v-if="target.group"
                        :model-value="target.group"
                        :options="groupOptions"
                        emit-value
                        map-options
                        label="Group"
                        @update:model-value="(value) => updateTarget(index, 'group', value)"
                      />
                      <q-select
                        v-else
                        :model-value="target.fixtures ?? []"
                        :options="fixtureOptions"
                        emit-value
                        map-options
                        multiple
                        use-chips
                        label="Fixtures"
                        @update:model-value="(value) => updateTarget(index, 'fixtures', value)"
                      />
                    </div>
                    <div class="col-7">
                      <q-input
                        :model-value="stringifyAttrs(target.attrs)"
                        label="Attributes (name=value)"
                        hint="Example: Dimmer=255, Red=180"
                        @update:model-value="(value) => updateTarget(index, 'attrs', parseAttrs(value || ''))"
                      />
                    </div>
                  </div>
                </q-item-section>
                <q-item-section side>
                  <q-btn dense flat round color="negative" icon="delete" @click="removeTarget(index)" />
                </q-item-section>
              </q-item>
              <q-item v-if="selectedPreset.targets.length === 0">
                <q-item-section class="text-grey-5">No targets configured</q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>
