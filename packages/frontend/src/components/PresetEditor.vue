<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import {
  SdmxButton,
  SdmxEmptyState,
  SdmxIconButton,
  SdmxOptionChecklist,
  SdmxStatusChip,
  SdmxWindowChrome,
} from 'src/components/ui';
import { useDMXStore } from 'src/stores/dmx';
import { useShowStore } from 'src/stores/show';
import { computed, ref, watch } from 'vue';

const props = defineProps<{
  initialPresetId?: string | null;
}>();

const emit = defineEmits<{ close: [] }>();
const showStore = useShowStore();
const dmx = useDMXStore();

const fixtureOptions = computed(() =>
  showStore.document.fixtures.map((fixture) => ({ label: fixture.name, value: fixture.name })),
);
const groupOptions = computed(() =>
  showStore.document.groups.map((group) => ({ label: group.name, value: group.name })),
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
const presets = computed(() => showStore.document.presets);

const selectedPresetId = ref<string | null>(props.initialPresetId ?? null);

const selectedPreset = computed(() => {
  if (!selectedPresetId.value) return null;
  return presets.value.find((preset) => preset.id === selectedPresetId.value) ?? null;
});

watch(
  () => props.initialPresetId,
  (presetId) => {
    if (presetId && presets.value.some((preset) => preset.id === presetId)) {
      selectedPresetId.value = presetId;
    }
  },
);

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
  { immediate: true },
);

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function selectedAttrNames(attrs: Record<string, number>): string[] {
  return Object.keys(attrs);
}

function setTargetAttrNames(index: number, names: string[]) {
  if (!selectedPreset.value) return;
  showStore.updateDocument((doc) => {
    const preset = doc.presets.find((entry) => entry.id === selectedPreset.value?.id);
    const target = preset?.targets[index];
    if (!target) return;
    const next: Record<string, number> = {};
    for (const name of names) {
      next[name] = target.attrs[name] ?? 0;
    }
    target.attrs = next;
  });
}

function setTargetAttrValue(index: number, name: string, value: unknown) {
  if (!selectedPreset.value) return;
  const nextValue = Math.max(0, Math.min(255, Math.round(Number(value) || 0)));
  showStore.updateDocument((doc) => {
    const preset = doc.presets.find((entry) => entry.id === selectedPreset.value?.id);
    const target = preset?.targets[index];
    if (!target) return;
    target.attrs[name] = nextValue;
  });
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

function deleteSelectedPreset() {
  if (!selectedPresetId.value) return;
  deletePreset(selectedPresetId.value);
}

function updatePreset(
  presetId: string,
  updates: Partial<{ name: string; color: string | undefined }>,
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
      groups: [],
      attrs: {},
    });
  });
}

function targetGroupNames(target: { groups?: string[]; group?: string }): string[] {
  if (target.groups?.length) return target.groups;
  return target.group ? [target.group] : [];
}

function isGroupTarget(target: { fixtures?: string[]; groups?: string[]; group?: string }): boolean {
  return target.fixtures === undefined;
}

function updateTarget(index: number, key: 'fixtures' | 'groups', value: unknown) {
  if (!selectedPreset.value) return;
  showStore.updateDocument((doc) => {
    const preset = doc.presets.find((entry) => entry.id === selectedPreset.value?.id);
    const target = preset?.targets[index];
    if (!target) return;

    if (key === 'fixtures') {
      target.fixtures = (value as string[]) ?? [];
      delete target.group;
      delete target.groups;
      return;
    }
    target.groups = (value as string[]) ?? [];
    delete target.group;
    delete target.fixtures;
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
  <SdmxWindowChrome
    class="preset-editor"
    title="Preset Editor"
    icon="palette"
    info="program.presets.editPreset"
    closable
    close-info="program.presets.closeEditor"
    @close="emit('close')"
  >
    <template #actions>
      <SdmxStatusChip
        v-if="selectedPreset"
        :label="`${selectedPreset.targets.length} target${selectedPreset.targets.length === 1 ? '' : 's'}`"
        variant="info"
      />
    </template>

    <div class="preset-editor__body">
      <header class="preset-editor__toolbar">
        <div class="preset-editor__toolbar-group">
          <SdmxButton
            size="sm"
            variant="primary"
            icon="plus"
            label="Add preset"
            info="program.presets.addPreset"
            @click="addPreset"
          />
          <SdmxButton
            size="sm"
            variant="danger"
            icon="trash"
            label="Delete"
            info="program.presets.deletePreset"
            :disabled="!selectedPreset"
            @click="deleteSelectedPreset"
          />
        </div>
      </header>

      <div
        v-if="presets.length"
        class="preset-editor__workspace"
      >
        <aside class="preset-editor__list">
          <button
            v-for="preset in presets"
            :key="preset.id"
            type="button"
            class="preset-editor__list-item sdmx-focus-ring"
            :class="{ 'preset-editor__list-item--active': preset.id === selectedPresetId }"
            @click="selectedPresetId = preset.id"
          >
            <div class="preset-editor__list-main">
              <span
                class="preset-editor__swatch"
                :style="{ background: preset.color || 'var(--sdmx-color-primary)' }"
              />
              <div class="preset-editor__list-text">
                <div class="preset-editor__list-name">{{ preset.name }}</div>
                <div class="preset-editor__list-meta sdmx-text-caption">
                  {{ preset.targets.length }} target{{ preset.targets.length === 1 ? '' : 's' }}
                </div>
              </div>
            </div>
            <SdmxIconButton
              icon="trash"
              info-key="program.presets.deletePreset"
              @click.stop="deletePreset(preset.id)"
            />
          </button>
        </aside>

        <section
          v-if="selectedPreset"
          class="preset-editor__detail"
        >
          <div class="preset-editor__meta">
            <XInput
              :model-value="selectedPreset.name"
              label="Name"
              dense
              class="preset-editor__name-input"
              @update:model-value="(value) => updatePreset(selectedPreset!.id, { name: String(value || 'Preset') })"
            />
            <XInput
              :model-value="selectedPreset.color"
              label="Color"
              dense
              class="preset-editor__color-input"
              @update:model-value="(value) => updatePreset(selectedPreset!.id, { color: value ? String(value) : undefined })"
            />
          </div>

          <div class="preset-editor__targets-header">
            <span class="sdmx-text-label">Targets</span>
            <div class="preset-editor__targets-actions">
              <SdmxButton
                size="sm"
                variant="ghost"
                icon="user-plus"
                label="Fixture"
                info="program.presets.addFixtureTarget"
                @click="addFixtureTarget"
              />
              <SdmxButton
                size="sm"
                variant="ghost"
                icon="hierarchy"
                label="Groups"
                info="program.presets.addGroupTarget"
                @click="addGroupTarget"
              />
            </div>
          </div>

          <div
            v-if="selectedPreset.targets.length"
            class="preset-editor__targets"
          >
            <div
              v-for="(target, index) in selectedPreset.targets"
              :key="`${selectedPreset.id}-${index}`"
              class="preset-target-card"
            >
              <div class="preset-target-card__header">
                <SdmxStatusChip
                  :label="isGroupTarget(target) ? 'Groups' : 'Fixtures'"
                  :variant="isGroupTarget(target) ? 'armed' : 'info'"
                />
                <SdmxIconButton
                  icon="trash"
                  info-key="program.presets.deleteTarget"
                  @click="removeTarget(index)"
                />
              </div>

              <SdmxOptionChecklist
                v-if="!isGroupTarget(target)"
                :model-value="target.fixtures ?? []"
                :options="fixtureOptions"
                multiple
                empty-hint="No fixtures in show"
                @update:model-value="(value) => updateTarget(index, 'fixtures', value)"
              />
              <SdmxOptionChecklist
                v-else
                :model-value="targetGroupNames(target)"
                :options="groupOptions"
                multiple
                empty-hint="No groups in show"
                @update:model-value="(value) => updateTarget(index, 'groups', value)"
              />

              <div class="preset-target-card__attrs">
                <SdmxStatusChip
                  label="Attributes"
                  variant="info"
                />
                <SdmxOptionChecklist
                  :model-value="selectedAttrNames(target.attrs)"
                  :options="attributeOptions"
                  multiple
                  empty-hint="No channel attributes in show"
                  @update:model-value="
                    (value) => setTargetAttrNames(index, Array.isArray(value) ? value : [])
                  "
                />
                <div
                  v-if="selectedAttrNames(target.attrs).length"
                  class="preset-target-card__attr-values"
                >
                  <XInput
                    v-for="name in selectedAttrNames(target.attrs)"
                    :key="`${selectedPreset.id}-${index}-${name}`"
                    :model-value="target.attrs[name]"
                    type="number"
                    min="0"
                    max="255"
                    dense
                    :label="name"
                    class="preset-target-card__attr-input"
                    @update:model-value="(value) => setTargetAttrValue(index, name, value)"
                  />
                </div>
                <span
                  v-else
                  class="sdmx-text-caption preset-target-card__caption"
                >Select attributes to set their values.</span>
              </div>
            </div>
          </div>

          <SdmxEmptyState
            v-else
            icon="focus-2"
            title="No targets"
            hint="Add a fixture or group target, then select attributes and set values."
          />
        </section>
      </div>

      <SdmxEmptyState
        v-else
        icon="palette"
        title="No presets yet"
        hint="Add a preset to start defining fixture or group looks."
      >
        <SdmxButton
          variant="primary"
          icon="plus"
          label="Add preset"
          info="program.presets.addPreset"
          @click="addPreset"
        />
      </SdmxEmptyState>
    </div>
  </SdmxWindowChrome>
</template>

<style scoped>
.preset-editor {
  height: 100%;
  width: 100%;
  border-radius: 0;
  border: none;
}

.preset-editor__body {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
}

.preset-editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sdmx-space-sm);
  padding: var(--sdmx-space-sm) var(--sdmx-space-md);
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
  background: var(--sdmx-color-bg-toolbar);
  flex-shrink: 0;
}

.preset-editor__toolbar-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sdmx-space-xs);
}

.preset-editor__workspace {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  gap: 0;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.preset-editor__list {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-xs);
  padding: var(--sdmx-space-sm);
  border-right: 1px solid var(--sdmx-color-border-subtle);
  overflow: auto;
  min-height: 0;
  background: var(--sdmx-color-bg-elevated);
}

.preset-editor__list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sdmx-space-xs);
  width: 100%;
  min-height: var(--sdmx-space-touch);
  padding: var(--sdmx-space-sm);
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-md);
  background: var(--sdmx-color-bg-surface);
  color: var(--sdmx-color-text);
  text-align: left;
  cursor: pointer;
}

.preset-editor__list-item:hover {
  background: var(--sdmx-color-hover);
  border-color: var(--sdmx-color-border);
}

.preset-editor__list-item--active {
  border-color: var(--sdmx-color-primary);
  background: var(--sdmx-color-primary-soft);
  box-shadow: inset 0 0 0 1px var(--sdmx-color-primary);
}

.preset-editor__list-main {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-sm);
  min-width: 0;
  flex: 1 1 auto;
}

.preset-editor__swatch {
  width: 14px;
  height: 14px;
  border-radius: var(--sdmx-radius-sm);
  border: 1px solid var(--sdmx-color-border-subtle);
  flex-shrink: 0;
}

.preset-editor__list-text {
  min-width: 0;
}

.preset-editor__list-name {
  font-weight: var(--sdmx-font-weight-bold);
  font-size: var(--sdmx-font-size-label);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preset-editor__list-meta {
  color: var(--sdmx-color-text-muted);
}

.preset-editor__detail {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-md);
  padding: var(--sdmx-space-md);
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

.preset-editor__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sdmx-space-sm);
}

.preset-editor__name-input {
  min-width: 180px;
  flex: 1 1 220px;
}

.preset-editor__color-input {
  min-width: 140px;
  flex: 0 1 180px;
}

.preset-editor__targets-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sdmx-space-sm);
  flex-wrap: wrap;
}

.preset-editor__targets-actions {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-xs);
}

.preset-editor__targets {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-sm);
}

.preset-target-card {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-sm);
  padding: var(--sdmx-space-md);
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-md);
  background: var(--sdmx-color-bg-elevated);
}

.preset-target-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sdmx-space-sm);
}

.preset-target-card__attrs {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-sm);
  min-width: 0;
}

.preset-target-card__attr-values {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sdmx-space-sm);
}

.preset-target-card__attr-input {
  min-width: 120px;
  flex: 0 1 140px;
}

.preset-target-card__caption {
  color: var(--sdmx-color-text-muted);
}

@media (max-width: 800px) {
  .preset-editor__workspace {
    grid-template-columns: 1fr;
  }

  .preset-editor__list {
    border-right: none;
    border-bottom: 1px solid var(--sdmx-color-border-subtle);
    max-height: 220px;
  }
}
</style>
