<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import SelectionControlPanel from './SelectionControlPanel.vue';
import { useScratchStore } from 'src/stores/scratch';
import { useCueStore } from 'src/stores/cue';
import { useOutputEngineStore } from 'src/stores/output-playback';
import { useSelectionStore } from 'src/stores/selection';
import { useUIStore } from 'src/stores/ui';
import { useProgrammerStore, PROGRAMMER_FEATURE_GROUPS } from 'src/stores/programmer';
import { usePresetPoolStore } from 'src/stores/preset-pool';
import { useShowStore } from 'src/stores/show';
import { useDMXStore } from 'src/stores/dmx';
import { useChannelControl } from 'src/composables/useChannelControl';
import { filterScratchEntries } from 'src/utils/programmer-filter';
import { applyWingOffset, wingScaleForIndex } from '@softdmx/engine';
import type { AlignMode, WingDirection } from '@softdmx/engine';
import XTabs from 'src/components/controls/XTabs.vue';
import XTab from 'src/components/controls/XTab.vue';

const scratch = useScratchStore();
const cueStore = useCueStore();
const engine = useOutputEngineStore();
const selection = useSelectionStore();
const ui = useUIStore();
const programmer = useProgrammerStore();
const presetPool = usePresetPoolStore();
const showStore = useShowStore();
const dmx = useDMXStore();
const { clearScratch, setChannel } = useChannelControl();

const filterSelection = ref(false);
const showSavePreset = ref(false);
const presetName = ref('');
const programmerPage = ref<'controls' | 'scratch'>('controls');

const alignModeOptions: Array<{ label: string; value: AlignMode }> = [
  { label: 'None', value: 'none' },
  { label: 'Pan', value: 'pan' },
  { label: 'Tilt', value: 'tilt' },
  { label: 'X', value: 'x' },
  { label: 'Y', value: 'y' },
];

const wingDirectionOptions: Array<{ label: string; value: WingDirection }> = [
  { label: 'Out', value: 'out' },
  { label: 'In', value: 'in' },
  { label: 'Alt', value: 'alternate' },
];

const storeModeOptions = [
  { label: 'Store', value: 'store' },
  { label: 'Update', value: 'update' },
  { label: 'Merge', value: 'merge' },
  { label: 'Remove', value: 'remove' },
] as const;

const poolOptions = computed(() =>
  presetPool.pools.map((pool) => ({ label: pool.name, value: pool.id }))
);

const entries = computed(() => {
  let list = Array.from(scratch.entries.values());
  list = filterScratchEntries(list, programmer.attributeFilter());
  if (filterSelection.value && selection.hasSelection) {
    list = list.filter((entry) => {
      const fixtureMatch = Array.from(selection.selectedFixtures).some((name) =>
        entry.path.includes(name)
      );
      const groupMatch = Array.from(selection.selectedGroups).some((name) =>
        entry.path.includes(name)
      );
      return fixtureMatch || groupMatch;
    });
  }
  return list;
});

function toggleBlind() {
  scratch.toggleBlind();
  engine.requestMerge();
}

function applyWingsToSelection(attributeName: string, baseValue: number) {
  const show = showStore.document;
  const fixtureNames = new Set<string>();
  for (const name of selection.selectedFixtures) fixtureNames.add(name);
  for (const groupName of selection.selectedGroups) {
    const group = show.groups.find((entry) => entry.name === groupName);
    for (const name of group?.fixtures ?? []) fixtureNames.add(name);
  }
  const fixtures = Array.from(fixtureNames);
  if (fixtures.length === 0) return;

  const wings = Math.max(0, selection.wings);
  fixtures.forEach((fixtureName, index) => {
    const mapped = dmx.showfileFixturesMapped.find((fixture) => fixture.fixtureName === fixtureName);
    const channel = mapped?.def.channels.find((entry) =>
      entry.name.toLowerCase().includes(attributeName.toLowerCase())
    );
    if (!channel?.reference.path) return;
    const scale = wingScaleForIndex(index, fixtures.length, wings, selection.wingDirection);
    setChannel(channel.reference.path, applyWingOffset(baseValue, scale), channel.type);
  });
}

function storeProgrammerPreset() {
  const name = presetName.value.trim() || `Preset ${Date.now()}`;
  cueStore.recordScratchAsPreset(name, {
    mode: programmer.storeMode,
    attributeFilter: programmer.attributeFilter(),
    poolId: programmer.selectedPoolId,
    poolSlot: programmer.selectedPoolSlot,
  });
  presetName.value = '';
  showSavePreset.value = false;
  engine.requestMerge();
}

function saveAsPreset() {
  storeProgrammerPreset();
}

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || el.isContentEditable;
}

function switchProgrammerPage(direction: 1 | -1) {
  const order: Array<'controls' | 'scratch'> = ['controls', 'scratch'];
  const index = order.indexOf(programmerPage.value);
  const next = (index + direction + order.length) % order.length;
  programmerPage.value = order[next]!;
}

function onProgrammerKeydown(event: KeyboardEvent) {
  if (isEditableTarget(event.target)) return;

  // Ctrl+Tab / Ctrl+Shift+Tab cycles programmer pages.
  if (event.ctrlKey && event.key === 'Tab') {
    event.preventDefault();
    switchProgrammerPage(event.shiftKey ? -1 : 1);
    return;
  }

  if (event.key === '[') {
    event.preventDefault();
    switchProgrammerPage(-1);
    return;
  }
  if (event.key === ']') {
    event.preventDefault();
    switchProgrammerPage(1);
  }
}
</script>

<template>
  <div class="programmer-window" tabindex="0" @keydown="onProgrammerKeydown">
    <div v-if="ui.programmerCollapsed" class="row items-center q-px-sm q-py-xs q-gutter-xs">
      <q-icon v-if="scratch.isActive" name="mdi-circle" color="white" size="xs" class="pulse" />
      <span class="text-caption">{{ scratch.activeCount }} active</span>
      <q-chip dense :color="scratch.blindMode ? 'warning' : 'green-8'" text-color="white" size="sm">
        {{ scratch.blindMode ? 'Blind' : 'Live' }}
      </q-chip>
      <q-space />
      <q-btn v-info="'desk.programmer.expand'" dense flat label="Expand" @click="ui.programmerCollapsed = false" />
    </div>
    <template v-else>
      <div class="row items-center q-px-sm q-py-xs q-gutter-xs flex-wrap programmer-toolbar">
        <q-chip dense :color="scratch.blindMode ? 'warning' : 'green-8'" text-color="white">
          {{ scratch.blindMode ? 'Blind Preview' : 'Live Output' }}
        </q-chip>
        <q-space />
        <q-btn v-info="'desk.programmer.blind'" dense flat label="Blind" @click="toggleBlind" />
        <q-btn v-info="'desk.programmer.undo'" dense flat label="Undo" :disable="!scratch.canUndo" @click="scratch.undo()" />
        <q-btn v-info="'desk.programmer.redo'" dense flat label="Redo" :disable="!scratch.canRedo" @click="scratch.redo()" />
        <q-btn v-info="'desk.programmer.record'" dense flat label="Record" @click="cueStore.recordFrame()" />
        <q-btn v-info="'desk.programmer.store'" dense flat label="Store" @click="showSavePreset = true" />
        <q-btn v-info="'desk.programmer.clear'" dense flat label="Clear" @click="clearScratch" />
        <q-btn v-info="'desk.programmer.collapse'" dense flat icon="expand_more" @click="ui.programmerCollapsed = true" />
      </div>

      <div class="row q-px-sm q-pb-xs q-gutter-xs flex-wrap">
        <q-btn-toggle
          v-info="'desk.programmer.featureGroup'"
          v-model="programmer.activeFeatureGroup"
          dense
          no-caps
          toggle-color="primary"
          :options="PROGRAMMER_FEATURE_GROUPS.map((group) => ({ label: group.label, value: group.id }))"
        />
      </div>

      <XTabs
        v-model="programmerPage"
        dense
        align="left"
        class="programmer-page-tabs q-px-sm"
      >
        <XTab v-info="'desk.programmer.scratchTab'" name="scratch" label="Scratch" />
        <XTab v-info="'desk.programmer.controlsTab'" name="controls" label="Controls" />
      </XTabs>

      <q-tab-panels v-model="programmerPage" animated class="programmer-pages">
        <q-tab-panel name="scratch" class="programmer-page programmer-page--scratch q-pa-none">
          <div class="programmer-scratch-header row items-center q-px-sm q-py-xs">
            <span class="text-caption text-weight-bold">Scratch</span>
            <q-space />
            <q-toggle v-info="'desk.programmer.filterSelection'" v-model="filterSelection" dense label="Filter to selection" />
          </div>

          <div v-if="entries.length" class="programmer-grid programmer-body">
            <div v-for="entry in entries" :key="entry.path" class="programmer-row">
              <div class="col text-caption" style="min-width: 0; flex: 1">
                <div class="text-weight-bold ellipsis">
                  {{ entry.attributeName ?? entry.path.split('/').pop() }}
                </div>
                <div class="ellipsis text-grey-5">
                  {{ entry.feature ?? entry.attributeType }} · {{ entry.path }}
                </div>
              </div>
              <div class="programmer-row-bar">
                <div class="programmer-row-fill" :style="{ width: `${(entry.value / 255) * 100}%` }" />
              </div>
              <div class="text-caption text-weight-bold" style="width: 36px; text-align: right">{{ entry.value }}</div>
            </div>
          </div>
          <div v-else class="programmer-body q-pa-md text-center text-grey-5 text-caption">
            No scratch values for {{ programmer.activeFeatureGroup }}. Adjust selection controls above.
          </div>
        </q-tab-panel>

        <q-tab-panel name="controls" class="programmer-page programmer-page--controls q-pa-none">
          <div class="row q-px-sm q-pb-xs q-gutter-xs flex-wrap items-center programmer-secondary-toolbar">
            <q-btn-toggle
              v-info="'desk.programmer.storeMode'"
              v-model="programmer.storeMode"
              dense
              no-caps
              toggle-color="secondary"
              :options="storeModeOptions.map((option) => ({ label: option.label, value: option.value }))"
            />
            <q-select
              v-info="'desk.programmer.pool'"
              v-model="programmer.selectedPoolId"
              dense
              outlined
              emit-value
              map-options
              :options="poolOptions"
              label="Pool"
              style="min-width: 120px"
            />
            <q-input
              v-info="'desk.programmer.slot'"
              v-model.number="programmer.selectedPoolSlot"
              dense
              outlined
              type="number"
              min="0"
              label="Slot"
              style="width: 90px"
            />
            <q-select
              v-info="'desk.programmer.align'"
              v-model="selection.alignMode"
              dense
              outlined
              emit-value
              map-options
              :options="alignModeOptions"
              label="Align"
              style="min-width: 110px"
            />
            <q-input
              v-info="'desk.programmer.wings'"
              v-model.number="selection.wings"
              dense
              outlined
              type="number"
              min="0"
              label="Wings"
              style="width: 90px"
            />
            <q-select
              v-info="'desk.programmer.wingDirection'"
              v-model="selection.wingDirection"
              dense
              outlined
              emit-value
              map-options
              :options="wingDirectionOptions"
              label="Wing Dir"
              style="min-width: 110px"
            />
            <q-btn v-info="'desk.programmer.applyWings'" dense flat label="Apply Wings @128" @click="applyWingsToSelection('Pan', 128)" />
          </div>

          <SelectionControlPanel class="programmer-selection-panel" />
        </q-tab-panel>
      </q-tab-panels>
    </template>
  </div>

  <q-dialog v-model="showSavePreset">
    <q-card style="min-width: 320px">
      <q-card-section class="text-h6">Programmer Store</q-card-section>
      <q-card-section class="q-gutter-sm">
        <q-input v-model="presetName" label="Preset name" autofocus @keyup.enter="saveAsPreset" />
        <div class="text-caption text-grey-5">
          Mode: {{ programmer.storeMode }} · Group: {{ programmer.activeFeatureGroup }} · Pool slot
          {{ programmer.selectedPoolSlot }}
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Cancel" v-close-popup />
        <q-btn flat label="Apply" color="primary" @click="saveAsPreset" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.programmer-window {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.programmer-toolbar,
.programmer-secondary-toolbar {
  flex-shrink: 0;
}

.programmer-page-tabs {
  flex-shrink: 0;
  border-top: 1px solid var(--sdmx-color-border-subtle);
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
}

.programmer-pages {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.programmer-page {
  min-height: 0;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.programmer-scratch-header {
  flex-shrink: 0;
}

.programmer-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

.programmer-selection-panel {
  max-height: none;
  flex: 1 1 auto;
  min-height: 0;
  border-bottom: 0;
}

.pulse {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
