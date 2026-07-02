<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useShowStore } from 'src/stores/show';
import XButton from 'src/components/controls/XButton.vue';
import XInput from 'src/components/controls/XInput.vue';
import XSelect from 'src/components/controls/XSelect.vue';
import XListView from 'src/components/controls/XListView.vue';
import XListItem from 'src/components/controls/XListItem.vue';
import XCard from 'src/components/controls/XCard.vue';
import XCheckbox from 'src/components/controls/XCheckbox.vue';
import XDropdown from 'src/components/controls/XDropdown.vue';

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
      <XButton color="primary" icon="plus" label="Add Preset" @click="addPreset" />
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-4">
        <XListView :bordered="true">
          <XListItem
            v-for="preset in presets"
            :key="preset.id"
            :active="preset.id === selectedPresetId"
            @click="selectedPresetId = preset.id"
          >
            <div>
              <div class="text-weight-bold">{{ preset.name }}</div>
              <div class="text-caption text-grey-5">{{ preset.targets.length }} target(s)</div>
            </div>
            <template #append>
              <XButton flat icon="trash" color="danger" @click.stop="deletePreset(preset.id)" />
            </template>
          </XListItem>
          <XListItem v-slot v-if="presets.length === 0" :clickable="false">
            <div class="text-grey-5">No presets yet</div>
          </XListItem>
        </XListView>
      </div>

      <div class="col-8" v-if="selectedPreset">
        <XCard>
          <div class="q-gutter-y-md q-pa-md">
            <XInput
              :model-value="selectedPreset.name"
              label="Preset Name"
              @update:model-value="(value) => updatePreset(selectedPreset.id, { name: value || 'Preset' })"
            />
            <XInput
              :model-value="selectedPreset.color"
              label="Color (hex)"
              @update:model-value="(value) => updatePreset(selectedPreset.id, { color: value || undefined })"
            />
          </div>

          <hr class="sdmx-separator" />
          <div class="q-pa-md">
            <div class="row items-center justify-between q-mb-sm">
              <div class="text-subtitle1">Targets</div>
              <div class="row q-gutter-xs">
                <XButton flat icon="user-plus" label="Fixture Target" @click="addFixtureTarget" />
                <XButton flat icon="user-plus" label="Group Target" @click="addGroupTarget" />
              </div>
            </div>

            <XListView :bordered="true">
              <XListItem v-for="(target, index) in selectedPreset.targets" :key="`${selectedPreset.id}-${index}`" :clickable="false">
                <div class="row full-width items-center q-col-gutter-sm">
                  <div class="col-5">
                    <div v-if="target.group" class="column">
                      <div class="q-mb-xs text-caption text-grey-4">Group</div>
                      <XSelect
                        :model-value="target.group"
                        :options="groupOptions"
                        @update:model-value="(value) => updateTarget(index, 'group', value)"
                      />
                    </div>
                    <div v-else class="column">
                      <div class="q-mb-xs text-caption text-grey-4">Fixtures</div>
                      <XDropdown :label="target.fixtures && target.fixtures.length > 0 ? `${target.fixtures.length} selected` : 'Select fixtures'">
                        <div class="column q-pa-sm q-gutter-y-xs" style="max-height: 200px; overflow-y: auto; min-width: 160px;" @click.stop>
                          <XCheckbox
                            v-for="opt in fixtureOptions"
                            :key="opt.value"
                            :label="opt.label"
                            :model-value="(target.fixtures ?? []).includes(opt.value)"
                            @update:model-value="(checked) => {
                              const current = [...(target.fixtures ?? [])];
                              if (checked) {
                                if (!current.includes(opt.value)) current.push(opt.value);
                              } else {
                                const idx = current.indexOf(opt.value);
                                if (idx > -1) current.splice(idx, 1);
                              }
                              updateTarget(index, 'fixtures', current);
                            }"
                          />
                        </div>
                      </XDropdown>
                    </div>
                  </div>
                  <div class="col-7">
                    <div class="column">
                      <div class="q-mb-xs text-caption text-grey-4">Attributes (name=value)</div>
                      <XInput
                        :model-value="stringifyAttrs(target.attrs)"
                        @update:model-value="(value) => updateTarget(index, 'attrs', parseAttrs(value || ''))"
                      />
                    </div>
                    <div class="text-caption text-grey-5 q-mt-xs">Example: Dimmer=255, Red=180</div>
                  </div>
                </div>
                <template #append>
                  <XButton flat icon="trash" color="danger" @click="removeTarget(index)" />
                </template>
              </XListItem>
              <XListItem v-if="selectedPreset.targets.length === 0" :clickable="false">
                <div class="text-grey-5">No targets configured</div>
              </XListItem>
            </XListView>
          </div>
        </XCard>
      </div>
    </div>
  </div>
</template>
