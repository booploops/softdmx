<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { EffectDefinition } from '@softdmx/engine';
import {
  SdmxButton,
  SdmxEmptyState,
  SdmxIconButton,
  SdmxOptionChecklist,
  SdmxSelect,
  SdmxStatusChip,
  SdmxToggle,
  SdmxWindowChrome,
} from 'src/components/ui';
import { useDMXStore } from 'src/stores/dmx';
import { useOutputEngineStore } from 'src/stores/output-playback';
import { useShowStore } from 'src/stores/show';
import { computed, ref, watch } from 'vue';

const props = defineProps<{
  initialEffectId?: string | null;
}>();

const emit = defineEmits<{ close: [] }>();

const showStore = useShowStore();
const engine = useOutputEngineStore();
const dmx = useDMXStore();

const effects = computed(() => showStore.document.effects);
const selectedEffectId = ref<string | null>(props.initialEffectId ?? null);

const typeOptions = [
  { label: 'Sine', value: 'sine' },
  { label: 'Saw', value: 'saw' },
  { label: 'Step', value: 'step' },
  { label: 'Chase', value: 'chase' },
  { label: 'Phaser', value: 'phaser' },
  { label: 'Random Hold', value: 'random_hold' },
] as const;

const syncOptions = [
  { label: 'Free', value: 'free' },
  { label: 'Link', value: 'link' },
] as const;

const directionOptions = [
  { label: 'Forward', value: 'forward' },
  { label: 'Reverse', value: 'reverse' },
] as const;

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

const selectedEffect = computed(() => {
  if (!selectedEffectId.value) return null;
  return effects.value.find((effect) => effect.id === selectedEffectId.value) ?? null;
});

watch(
  () => props.initialEffectId,
  (effectId) => {
    if (effectId && effects.value.some((effect) => effect.id === effectId)) {
      selectedEffectId.value = effectId;
    }
  },
);

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
  { immediate: true },
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
      attrs: attributeOptions.value[0]?.value ? [attributeOptions.value[0].value] : ['Dimmer'],
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

function deleteSelectedEffect() {
  if (!selectedEffectId.value) return;
  deleteEffect(selectedEffectId.value);
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

function effectGroupNames(target: { groups?: string[]; group?: string }): string[] {
  if (target.groups?.length) return target.groups;
  return target.group ? [target.group] : [];
}

function setTargetFixtures(values: string[]) {
  const effect = selectedEffect.value;
  if (!effect) return;
  updateEffect(effect.id, (entry) => {
    entry.target.fixtures = values;
  });
}

function setTargetGroups(values: string[]) {
  const effect = selectedEffect.value;
  if (!effect) return;
  updateEffect(effect.id, (entry) => {
    entry.target.groups = values;
    delete entry.target.group;
  });
}

function effectAttrNames(target: { attr?: string; attrs?: string[] }): string[] {
  if (target.attrs?.length) return target.attrs;
  return target.attr ? [target.attr] : [];
}

function setTargetAttrs(values: string[]) {
  const effect = selectedEffect.value;
  if (!effect) return;
  updateEffect(effect.id, (entry) => {
    entry.target.attrs = values;
    entry.target.attr = values[0] ?? entry.target.attr ?? 'Dimmer';
  });
}

function attrSummary(target: { attr?: string; attrs?: string[] }): string {
  const names = effectAttrNames(target);
  if (!names.length) return 'No attrs';
  if (names.length === 1) return names[0]!;
  return `${names.length} attrs`;
}

function asType(value: string | number | boolean | null, fallback: EffectDefinition['type']): EffectDefinition['type'] {
  const next = String(value ?? fallback);
  if (
    next === 'sine' ||
    next === 'saw' ||
    next === 'step' ||
    next === 'chase' ||
    next === 'phaser' ||
    next === 'random_hold'
  ) {
    return next;
  }
  return fallback;
}

function asSync(value: string | number | boolean | null): 'free' | 'link' {
  return value === 'link' ? 'link' : 'free';
}

function asDirection(value: string | number | boolean | null): 'forward' | 'reverse' {
  return value === 'reverse' ? 'reverse' : 'forward';
}

function typeLabel(type: EffectDefinition['type']): string {
  return typeOptions.find((option) => option.value === type)?.label ?? type;
}
</script>

<template>
  <SdmxWindowChrome
    class="effect-editor"
    title="Effect Editor"
    icon="sparkles"
    info="program.effects.editEffect"
    closable
    close-info="program.effects.closeEditor"
    @close="emit('close')"
  >
    <template #actions>
      <SdmxStatusChip
        v-if="selectedEffect"
        :label="typeLabel(selectedEffect.type)"
        :variant="selectedEffect.enabled ? 'positive' : 'default'"
      />
    </template>

    <div class="effect-editor__body">
      <header class="effect-editor__toolbar">
        <div class="effect-editor__toolbar-group">
          <SdmxButton
            size="sm"
            variant="primary"
            icon="plus"
            label="Add effect"
            info="program.effects.addEffect"
            @click="addEffect"
          />
          <SdmxButton
            size="sm"
            variant="danger"
            icon="trash"
            label="Delete"
            info="program.effects.deleteEffect"
            :disabled="!selectedEffect"
            @click="deleteSelectedEffect"
          />
        </div>
      </header>

      <div
        v-if="effects.length"
        class="effect-editor__workspace"
      >
        <aside class="effect-editor__list">
          <button
            v-for="effect in effects"
            :key="effect.id"
            type="button"
            class="effect-editor__list-item sdmx-focus-ring"
            :class="{ 'effect-editor__list-item--active': effect.id === selectedEffectId }"
            @click="selectedEffectId = effect.id"
          >
            <div class="effect-editor__list-main">
              <span
                class="effect-editor__swatch"
                :class="{ 'effect-editor__swatch--on': effect.enabled }"
              />
              <div class="effect-editor__list-text">
                <div class="effect-editor__list-name">{{ effect.name }}</div>
                <div class="effect-editor__list-meta sdmx-text-caption">
                  {{ typeLabel(effect.type) }} · {{ attrSummary(effect.target) }}
                </div>
              </div>
            </div>
            <SdmxIconButton
              icon="trash"
              info-key="program.effects.deleteEffect"
              @click.stop="deleteEffect(effect.id)"
            />
          </button>
        </aside>

        <section
          v-if="selectedEffect"
          class="effect-editor__detail"
        >
          <div class="effect-editor__meta">
            <XInput
              :model-value="selectedEffect.name"
              label="Name"
              dense
              class="effect-editor__name-input"
              @update:model-value="
                (value) => updateEffect(selectedEffect!.id, (effect) => { effect.name = String(value || 'Effect'); })
              "
            />
            <SdmxSelect
              :model-value="selectedEffect.type"
              :options="[...typeOptions]"
              label="Type"
              size="sm"
              class="effect-editor__type-select"
              @update:model-value="(value) => changeEffectType(selectedEffect!.id, asType(value, selectedEffect!.type))"
            />
            <SdmxSelect
              :model-value="selectedEffect.sync ?? 'free'"
              :options="[...syncOptions]"
              label="Sync"
              size="sm"
              class="effect-editor__sync-select"
              @update:model-value="
                (value) => updateEffect(selectedEffect!.id, (effect) => { effect.sync = asSync(value); })
              "
            />
            <SdmxToggle
              :model-value="selectedEffect.enabled"
              label="Enabled"
              info="program.effects.enableEffect"
              @update:model-value="
                (value) => updateEffect(selectedEffect!.id, (effect) => { effect.enabled = value; })
              "
            />
          </div>

          <div class="effect-editor__targets-header">
            <span class="sdmx-text-label">Target</span>
          </div>

          <div class="effect-target-card">
            <div class="effect-target-card__header">
              <SdmxStatusChip
                label="Fixtures"
                variant="info"
              />
            </div>
            <SdmxOptionChecklist
              :model-value="selectedEffect.target.fixtures ?? []"
              :options="fixtureOptions"
              multiple
              empty-hint="No fixtures in show"
              @update:model-value="(value) => setTargetFixtures(Array.isArray(value) ? value : [])"
            />
          </div>

          <div class="effect-target-card">
            <div class="effect-target-card__header">
              <SdmxStatusChip
                label="Groups"
                variant="armed"
              />
            </div>
            <SdmxOptionChecklist
              :model-value="effectGroupNames(selectedEffect.target)"
              :options="groupOptions"
              multiple
              empty-hint="No groups in show"
              @update:model-value="(value) => setTargetGroups(Array.isArray(value) ? value : [])"
            />
          </div>

          <div class="effect-target-card">
            <div class="effect-target-card__header">
              <SdmxStatusChip
                label="Attributes"
                variant="info"
              />
            </div>
            <SdmxOptionChecklist
              :model-value="effectAttrNames(selectedEffect.target)"
              :options="attributeOptions"
              multiple
              empty-hint="No channel attributes in show"
              @update:model-value="(value) => setTargetAttrs(Array.isArray(value) ? value : [])"
            />
          </div>

          <div class="effect-editor__targets-header">
            <span class="sdmx-text-label">Parameters</span>
          </div>

          <div class="effect-target-card">
            <div class="effect-target-card__params">
              <XInput
                v-if="'rate' in selectedEffect"
                :model-value="selectedEffect.rate"
                type="number"
                min="0"
                step="0.1"
                dense
                label="Rate (Hz)"
                class="effect-editor__field"
                @update:model-value="
                  (value) =>
                    updateEffect(selectedEffect!.id, (effect) => {
                      (effect as { rate: number }).rate = Number(value) || 0;
                    })
                "
              />

              <template v-if="selectedEffect.type === 'sine' || selectedEffect.type === 'phaser'">
                <XInput
                  :model-value="selectedEffect.depth"
                  type="number"
                  min="0"
                  max="255"
                  dense
                  label="Depth"
                  class="effect-editor__field"
                  @update:model-value="
                    (value) =>
                      updateEffect(selectedEffect!.id, (effect) => {
                        (effect as { depth: number }).depth = Number(value) || 0;
                      })
                  "
                />
                <XInput
                  :model-value="selectedEffect.offset ?? 128"
                  type="number"
                  min="0"
                  max="255"
                  dense
                  label="Offset"
                  class="effect-editor__field"
                  @update:model-value="
                    (value) =>
                      updateEffect(selectedEffect!.id, (effect) => {
                        (effect as { offset?: number }).offset = Number(value) || 0;
                      })
                  "
                />
                <XInput
                  v-if="selectedEffect.type === 'phaser'"
                  :model-value="selectedEffect.phaseSpread ?? 0.125"
                  type="number"
                  min="0"
                  step="0.01"
                  dense
                  label="Phase spread"
                  class="effect-editor__field"
                  @update:model-value="
                    (value) =>
                      updateEffect(selectedEffect!.id, (effect) => {
                        (effect as { phaseSpread?: number }).phaseSpread = Number(value) || 0;
                      })
                  "
                />
              </template>

              <template v-if="selectedEffect.type === 'saw' || selectedEffect.type === 'random_hold'">
                <XInput
                  :model-value="selectedEffect.min"
                  type="number"
                  min="0"
                  max="255"
                  dense
                  label="Min"
                  class="effect-editor__field"
                  @update:model-value="
                    (value) =>
                      updateEffect(selectedEffect!.id, (effect) => {
                        (effect as { min: number }).min = Number(value) || 0;
                      })
                  "
                />
                <XInput
                  :model-value="selectedEffect.max"
                  type="number"
                  min="0"
                  max="255"
                  dense
                  label="Max"
                  class="effect-editor__field"
                  @update:model-value="
                    (value) =>
                      updateEffect(selectedEffect!.id, (effect) => {
                        (effect as { max: number }).max = Number(value) || 0;
                      })
                  "
                />
                <XInput
                  v-if="selectedEffect.type === 'random_hold'"
                  :model-value="selectedEffect.seed ?? 0"
                  type="number"
                  dense
                  label="Seed"
                  class="effect-editor__field"
                  @update:model-value="
                    (value) =>
                      updateEffect(selectedEffect!.id, (effect) => {
                        (effect as { seed?: number }).seed = Number(value) || 0;
                      })
                  "
                />
              </template>

              <template v-if="selectedEffect.type === 'step'">
                <XInput
                  :model-value="stringifySteps(selectedEffect.steps)"
                  dense
                  label="Steps"
                  class="effect-editor__field effect-editor__field--wide"
                  @update:model-value="
                    (value) =>
                      updateEffect(selectedEffect!.id, (effect) => {
                        (effect as { steps: number[] }).steps = parseSteps(String(value || ''));
                      })
                  "
                />
                <span class="sdmx-text-caption effect-target-card__caption effect-editor__field--wide">
                  Comma-separated DMX values
                </span>
              </template>

              <template v-if="selectedEffect.type === 'chase'">
                <XInput
                  :model-value="selectedEffect.width"
                  type="number"
                  min="1"
                  dense
                  label="Width"
                  class="effect-editor__field"
                  @update:model-value="
                    (value) =>
                      updateEffect(selectedEffect!.id, (effect) => {
                        (effect as { width: number }).width = Math.max(1, Number(value) || 1);
                      })
                  "
                />
                <SdmxSelect
                  :model-value="selectedEffect.direction"
                  :options="[...directionOptions]"
                  label="Direction"
                  size="sm"
                  class="effect-editor__field"
                  @update:model-value="
                    (value) =>
                      updateEffect(selectedEffect!.id, (effect) => {
                        (effect as { direction: 'forward' | 'reverse' }).direction = asDirection(value);
                      })
                  "
                />
                <XInput
                  :model-value="selectedEffect.wings ?? 1"
                  type="number"
                  min="1"
                  dense
                  label="Wings"
                  class="effect-editor__field"
                  @update:model-value="
                    (value) =>
                      updateEffect(selectedEffect!.id, (effect) => {
                        (effect as { wings?: number }).wings = Math.max(1, Number(value) || 1);
                      })
                  "
                />
              </template>
            </div>
          </div>
        </section>
      </div>

      <SdmxEmptyState
        v-else
        icon="sparkles"
        title="No effects yet"
        hint="Add an effect to start modulating fixture attributes."
      >
        <SdmxButton
          variant="primary"
          icon="plus"
          label="Add effect"
          info="program.effects.addEffect"
          @click="addEffect"
        />
      </SdmxEmptyState>
    </div>
  </SdmxWindowChrome>
</template>

<style scoped>
.effect-editor {
  height: 100%;
  width: 100%;
  border-radius: 0;
  border: none;
}

.effect-editor__body {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
}

.effect-editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sdmx-space-sm);
  padding: var(--sdmx-space-sm) var(--sdmx-space-md);
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
  background: var(--sdmx-color-bg-toolbar);
  flex-shrink: 0;
}

.effect-editor__toolbar-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sdmx-space-xs);
}

.effect-editor__workspace {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  gap: 0;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.effect-editor__list {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-xs);
  padding: var(--sdmx-space-sm);
  border-right: 1px solid var(--sdmx-color-border-subtle);
  overflow: auto;
  min-height: 0;
  background: var(--sdmx-color-bg-elevated);
}

.effect-editor__list-item {
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

.effect-editor__list-item:hover {
  background: var(--sdmx-color-hover);
  border-color: var(--sdmx-color-border);
}

.effect-editor__list-item--active {
  border-color: var(--sdmx-color-primary);
  background: var(--sdmx-color-primary-soft);
  box-shadow: inset 0 0 0 1px var(--sdmx-color-primary);
}

.effect-editor__list-main {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-sm);
  min-width: 0;
  flex: 1 1 auto;
}

.effect-editor__swatch {
  width: 14px;
  height: 14px;
  border-radius: var(--sdmx-radius-sm);
  border: 1px solid var(--sdmx-color-border-subtle);
  background: var(--sdmx-color-bg-muted, var(--sdmx-color-border-subtle));
  flex-shrink: 0;
}

.effect-editor__swatch--on {
  background: var(--sdmx-color-positive, var(--sdmx-color-primary));
  border-color: var(--sdmx-color-positive, var(--sdmx-color-primary));
}

.effect-editor__list-text {
  min-width: 0;
}

.effect-editor__list-name {
  font-weight: var(--sdmx-font-weight-bold);
  font-size: var(--sdmx-font-size-label);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.effect-editor__list-meta {
  color: var(--sdmx-color-text-muted);
}

.effect-editor__detail {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-md);
  padding: var(--sdmx-space-md);
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

.effect-editor__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sdmx-space-sm);
  align-items: flex-end;
}

.effect-editor__name-input {
  min-width: 180px;
  flex: 1 1 220px;
}

.effect-editor__type-select,
.effect-editor__sync-select {
  min-width: 140px;
  flex: 0 1 160px;
}

.effect-editor__targets-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sdmx-space-sm);
  flex-wrap: wrap;
}

.effect-target-card {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-sm);
  padding: var(--sdmx-space-md);
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-md);
  background: var(--sdmx-color-bg-elevated);
}

.effect-target-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sdmx-space-sm);
}

.effect-target-card__field {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-xs);
  min-width: 0;
}

.effect-target-card__params {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sdmx-space-sm);
  align-items: flex-end;
}

.effect-target-card__caption {
  color: var(--sdmx-color-text-muted);
}

.effect-editor__field {
  min-width: 140px;
  flex: 0 1 160px;
}

.effect-editor__field--wide {
  flex: 1 1 100%;
  min-width: 100%;
}

@media (max-width: 800px) {
  .effect-editor__workspace {
    grid-template-columns: 1fr;
  }

  .effect-editor__list {
    border-right: none;
    border-bottom: 1px solid var(--sdmx-color-border-subtle);
    max-height: 220px;
  }
}
</style>
