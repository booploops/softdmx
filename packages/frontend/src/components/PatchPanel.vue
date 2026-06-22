<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Notify } from 'quasar';
import { useShowStore } from 'src/stores/show';
import { useDMXStore } from 'src/stores/dmx';
import { useChannelControl } from 'src/composables/useChannelControl';
import { getAllFixtures, getFixtureDefinition } from 'src/fixture-library/registry';
import { resolveFixtureChannelsForMode } from '@softdmx/engine';
import type { FixtureChannelWithReference, ShowfileFixture } from '@softdmx/engine';
import { computeAimPanTilt16Bit, resolveFixturePosition } from '@softdmx/engine';
import { useFixtureImport } from 'src/composables/useFixtureImport';
import PatchGrid from './PatchGrid.vue';
import PixelMapPanel from './PixelMapPanel.vue';
import VisualizerPanel from './VisualizerPanel.vue';

const showStore = useShowStore();
const dmx = useDMXStore();
const control = useChannelControl();
const { importFixtureFile, exportFixture } = useFixtureImport();

const importInputRef = ref<HTMLInputElement | null>(null);

const destinations = computed(() => showStore.document.destinations);
const destinationOptions = computed(() =>
  destinations.value.map((dest) => ({
    label: `${dest.name} (${dest.type.toUpperCase()})`,
    value: dest.id,
  }))
);

const showAddFixtureDialog = ref(false);
const selectedFixtureType = ref<string>('');
const newFixtureName = ref('');
const newFixtureDestinationId = ref<string>('default-gridnode');
const newFixtureStartingChannel = ref<number | undefined>(undefined);
const newFixtureModeId = ref<string>('');
const selectedGridDestinationId = ref<string>('default-gridnode');
const selectedPatchTab = ref<'fixtures' | 'pixel-maps'>('fixtures');

const availableFixtures = computed(() => getAllFixtures());
const fixtureTypeOptions = computed(() =>
  availableFixtures.value.map((fixture) => ({
    label: `${fixture.name} (${fixture.channels.length} ch)`,
    value: fixture.id,
  }))
);

const patchedFixtures = computed(() => {
  const doc = showStore.document;
  if (!doc.fixtures.length) return [];

  const destinationIndices = new Map<string, number>();

  const list = doc.fixtures.map((fixture, index) => {
    const def = getFixtureDefinition(fixture.fixtureId);
    const modeChannels = def ? resolveFixtureChannelsForMode(def, fixture.modeId) : [];
    const channelCount = modeChannels.length || def?.channels.length || 0;

    const destId = fixture.outputDestinationId || 'default-gridnode';
    const autoIndex = destinationIndices.get(destId) ?? 1;
    const startChannel = fixture.startingChannel ?? autoIndex;
    const endChannel = Math.max(startChannel, startChannel + channelCount - 1);

    destinationIndices.set(destId, endChannel + 1);

    return {
      fixture,
      index,
      destId,
      startChannel,
      endChannel,
      channelCount,
      hasOverlap: false,
      outOfRange: endChannel > 512 || startChannel < 1,
      overlapsWith: [] as string[],
    };
  });

  for (let i = 0; i < list.length; i++) {
    const f1 = list[i]!;
    for (let j = i + 1; j < list.length; j++) {
      const f2 = list[j]!;
      if (f1.destId === f2.destId) {
        if (f1.startChannel <= f2.endChannel && f2.startChannel <= f1.endChannel) {
          f1.hasOverlap = true;
          f2.hasOverlap = true;
          f1.overlapsWith.push(f2.fixture.name);
          f2.overlapsWith.push(f1.fixture.name);
        }
      }
    }
  }

  return list;
});

watch(
  destinations,
  (nextDestinations) => {
    if (!nextDestinations.some((d) => d.id === newFixtureDestinationId.value)) {
      newFixtureDestinationId.value = nextDestinations[0]?.id || 'default-gridnode';
    }
    if (!nextDestinations.some((d) => d.id === selectedGridDestinationId.value)) {
      selectedGridDestinationId.value = nextDestinations[0]?.id || 'default-gridnode';
    }
  },
  { immediate: true }
);

watch(selectedFixtureType, (fixtureId) => {
  if (!fixtureId) return;
  const fixture = availableFixtures.value.find((f) => f.id === fixtureId);
  if (!fixture) return;
  if (!newFixtureName.value.trim()) {
    newFixtureName.value = createDefaultFixtureName(fixture.name);
  }
  newFixtureModeId.value = fixture.defaultModeId ?? fixture.modes?.[0]?.id ?? '';
});

const selectedFixtureModes = computed(() => {
  const fixture = availableFixtures.value.find((f) => f.id === selectedFixtureType.value);
  return fixture?.modes ?? [];
});

async function onImportFixtureSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const fixture = await importFixtureFile(file);
  if (fixture) {
    selectedFixtureType.value = fixture.id;
    newFixtureModeId.value = fixture.defaultModeId ?? fixture.modes?.[0]?.id ?? '';
  }
  input.value = '';
}

function triggerImportFixture() {
  importInputRef.value?.click();
}

function getDestinationById(destId: string) {
  return destinations.value.find((dest) => dest.id === destId);
}

function getDestName(destId: string): string {
  const d = destinations.value.find(dest => dest.id === destId);
  return d ? `${d.name} (${d.type.toUpperCase()})` : `Unknown (${destId})`;
}

function getDestUniverseLabel(destId: string): string {
  const destination = getDestinationById(destId);
  if (!destination) return 'Universe: unknown';

  if (destination.type === 'artnet') {
    const net = destination.settings.Net ?? 0;
    const subnet = destination.settings.Subnet ?? 0;
    const universe = destination.settings.Universe ?? 0;
    return `Art-Net ${net}.${subnet}.${universe}`;
  }

  if (destination.type === 'sacn') {
    const universe = destination.settings.Universe ?? 1;
    return `sACN Universe ${universe}`;
  }

  if (destination.type === 'dmx_usb') {
    return `USB ${destination.settings.PortPath || '(unassigned)'}`;
  }

  return 'GridNode Overlay';
}

function createDefaultFixtureName(baseName: string): string {
  const existing = new Set(showStore.document.fixtures.map((f) => f.name));
  if (!existing.has(baseName)) return baseName;

  let counter = 2;
  while (existing.has(`${baseName} ${counter}`)) {
    counter += 1;
  }
  return `${baseName} ${counter}`;
}

function updatePatch(index: number, updates: Partial<ShowfileFixture>) {
  showStore.updateDocument((doc) => {
    const fixture = doc.fixtures[index];
    if (!fixture) return;
    doc.fixtures[index] = { ...fixture, ...updates };
  });
  dmx.rebuildFromShow(showStore.document);
}

function parseOptionalCoordinate(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

function updateFixturePosition(index: number, axis: 'x' | 'y' | 'z', value: unknown) {
  showStore.updateDocument((doc) => {
    const fixture = doc.fixtures[index];
    if (!fixture) return;

    const nextPosition = { ...(fixture.position ?? {}) };
    const parsed = parseOptionalCoordinate(value);
    if (parsed === undefined) {
      delete nextPosition[axis];
    } else {
      nextPosition[axis] = parsed;
    }

    const hasPosition = nextPosition.x !== undefined || nextPosition.y !== undefined || nextPosition.z !== undefined;
    doc.fixtures[index] = {
      ...fixture,
      position: hasPosition ? nextPosition : undefined,
    };
  });
}

function resolveFocusChannels(channels: FixtureChannelWithReference[]) {
  const pan = channels.find((channel) => {
    const name = channel.name.toLowerCase();
    return name.includes('pan') && !name.includes('fine');
  });
  const panFine = channels.find((channel) => {
    const name = channel.name.toLowerCase();
    return name.includes('pan') && name.includes('fine');
  });
  const tilt = channels.find((channel) => {
    const name = channel.name.toLowerCase();
    return name.includes('tilt') && !name.includes('fine');
  });
  const tiltFine = channels.find((channel) => {
    const name = channel.name.toLowerCase();
    return name.includes('tilt') && name.includes('fine');
  });

  if (!pan || !tilt) return null;
  return { pan, panFine, tilt, tiltFine };
}

function aimFixtureAtCenter(index: number) {
  const fixture = showStore.document.fixtures[index];
  if (!fixture) return;

  const mappedFixture = dmx.showfileFixturesMapped.find((mapped) => mapped.fixtureName === fixture.name);
  if (!mappedFixture) {
    Notify.create({ type: 'warning', message: `Fixture "${fixture.name}" is unavailable in the DMX map.` });
    return;
  }

  const focusChannels = resolveFocusChannels(mappedFixture.def.channels);
  if (!focusChannels) {
    Notify.create({ type: 'warning', message: `Fixture "${fixture.name}" has no pan/tilt channels.` });
    return;
  }

  const source = resolveFixturePosition(fixture.position, index, showStore.document.fixtures.length);
  const aim = computeAimPanTilt16Bit(source, { x: 0, y: 0, z: 0 });
  if (!aim) {
    Notify.create({ type: 'warning', message: `Fixture "${fixture.name}" is already at stage center.` });
    return;
  }

  control.setChannel(focusChannels.pan.reference.path, aim.pan, 'position');
  control.setChannel(focusChannels.tilt.reference.path, aim.tilt, 'position');
  if (focusChannels.panFine) {
    control.setChannel(focusChannels.panFine.reference.path, aim.panFine, 'position');
  }
  if (focusChannels.tiltFine) {
    control.setChannel(focusChannels.tiltFine.reference.path, aim.tiltFine, 'position');
  }

  Notify.create({ type: 'positive', message: `Aimed "${fixture.name}" at stage center.` });
}

function autoPatchAll() {
  const destinationIndices = new Map<string, number>();

  showStore.updateDocument((doc) => {
    doc.fixtures.forEach((fixture, index) => {
      const def = getFixtureDefinition(fixture.fixtureId);
      if (!def) return;
      const destId = fixture.outputDestinationId || 'default-gridnode';
      const nextFreeChannel = destinationIndices.get(destId) ?? 1;
      doc.fixtures[index] = { ...fixture, startingChannel: nextFreeChannel };
      destinationIndices.set(destId, nextFreeChannel + def.channels.length);
    });
  });
  dmx.rebuildFromShow(showStore.document);
}

const overlapCount = computed(() => patchedFixtures.value.filter((f) => f.hasOverlap).length);
const outOfRangeCount = computed(() => patchedFixtures.value.filter((f) => f.outOfRange).length);
const selectedGridFixtures = computed(() =>
  patchedFixtures.value
    .filter((fixture) => fixture.destId === selectedGridDestinationId.value)
    .map((fixture) => ({
      name: fixture.fixture.name,
      startChannel: fixture.startChannel,
      endChannel: fixture.endChannel,
      channelCount: fixture.channelCount,
      hasOverlap: fixture.hasOverlap,
      outOfRange: fixture.outOfRange,
    }))
);
const visualizerFixtures = computed(() =>
  showStore.document.fixtures.map((fixture) => ({
    name: fixture.name,
    position: fixture.position,
  }))
);

function openAddFixtureDialog() {
  selectedFixtureType.value = '';
  newFixtureName.value = '';
  newFixtureModeId.value = '';
  newFixtureDestinationId.value = destinations.value[0]?.id || 'default-gridnode';
  newFixtureStartingChannel.value = undefined;
  showAddFixtureDialog.value = true;
}

function addFixtureFromLibrary() {
  if (!selectedFixtureType.value) return;

  const fixtureType = availableFixtures.value.find((f) => f.id === selectedFixtureType.value);
  if (!fixtureType) return;

  const fixtureName = newFixtureName.value.trim() || createDefaultFixtureName(fixtureType.name);

  showStore.updateDocument((doc) => {
    doc.fixtures.push({
      name: fixtureName,
      fixtureId: fixtureType.id,
      ...(newFixtureModeId.value ? { modeId: newFixtureModeId.value } : {}),
      outputDestinationId: newFixtureDestinationId.value,
      ...(newFixtureStartingChannel.value !== undefined && {
        startingChannel: newFixtureStartingChannel.value,
      }),
    });
  });

  dmx.rebuildFromShow(showStore.document);
  showAddFixtureDialog.value = false;
}
</script>

<template>
  <div class="patch-panel q-pa-md" style="height: 100%; display: flex; flex-direction: column;">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5 text-weight-bold">Patch Manager</div>
        <div class="text-caption text-grey-5">
          Route fixtures to destinations, set DMX starts, and verify universe layout.
        </div>
      </div>
      <div v-if="selectedPatchTab === 'fixtures'" class="row q-gutter-sm">
        <q-btn color="primary" icon="add" label="Add Fixture from Library" @click="openAddFixtureDialog" />
        <q-btn color="accent" icon="upload" label="Import GDTF/YAML" @click="triggerImportFixture" />
        <input
          ref="importInputRef"
          type="file"
          accept=".gdtf,.yaml,.yml"
          hidden
          @change="onImportFixtureSelected"
        />
        <q-btn
          v-if="showStore.document.fixtures.length > 0"
          color="secondary"
          icon="auto_fix_high"
          label="Auto Patch Sequentially"
          @click="autoPatchAll"
        >
          <q-tooltip>Re-allocate all fixture starting channels to prevent overlaps.</q-tooltip>
        </q-btn>
      </div>
    </div>

    <q-tabs v-model="selectedPatchTab" dense class="q-mb-md">
      <q-tab name="fixtures" icon="hub" label="Fixtures" />
      <q-tab name="pixel-maps" icon="grid_on" label="Pixel Maps" />
    </q-tabs>

    <div v-show="selectedPatchTab === 'fixtures'" class="row q-col-gutter-sm q-mb-md">
      <div class="col">
        <q-banner dense rounded class="bg-blue-grey-10 text-grey-2">
          <q-icon name="dataset" class="q-mr-sm" />
          {{ patchedFixtures.length }} patched fixture{{ patchedFixtures.length === 1 ? '' : 's' }}
        </q-banner>
      </div>
      <div class="col">
        <q-banner dense rounded :class="overlapCount ? 'bg-negative text-white' : 'bg-green-10 text-green-2'">
          <q-icon :name="overlapCount ? 'warning' : 'check_circle'" class="q-mr-sm" />
          {{ overlapCount }} overlap warning{{ overlapCount === 1 ? '' : 's' }}
        </q-banner>
      </div>
      <div class="col">
        <q-banner
          dense
          rounded
          :class="outOfRangeCount ? 'bg-orange-10 text-orange-3' : 'bg-green-10 text-green-2'"
        >
          <q-icon :name="outOfRangeCount ? 'report_problem' : 'check_circle'" class="q-mr-sm" />
          {{ outOfRangeCount }} range issue{{ outOfRangeCount === 1 ? '' : 's' }}
        </q-banner>
      </div>
    </div>

    <VisualizerPanel v-show="selectedPatchTab === 'fixtures'" :fixtures="visualizerFixtures" />

    <div v-show="selectedPatchTab === 'fixtures'" class="col scroll-area-container">
      <q-scroll-area v-if="showStore.document.fixtures.length > 0" class="fit">
        <q-list bordered class="rounded-borders bg-dark-card border-grey q-mb-md">
          <q-item class="patch-header q-py-sm">
            <q-item-section class="col-3 text-weight-bold text-caption text-uppercase text-grey-5">Fixture</q-item-section>
            <q-item-section class="col-4 text-weight-bold text-caption text-uppercase text-grey-5">Destination</q-item-section>
            <q-item-section class="col-3 text-weight-bold text-caption text-uppercase text-grey-5">Universe / Endpoint</q-item-section>
            <q-item-section class="col-2 text-weight-bold text-caption text-uppercase text-grey-5 text-right">Address</q-item-section>
          </q-item>
          <q-item v-for="item in patchedFixtures" :key="item.index" class="patch-item q-py-md border-bottom">
            <q-item-section class="col-3">
              <q-item-label class="text-weight-bold text-subtitle1">{{ item.fixture.name }}</q-item-label>
              <q-item-label caption class="text-grey-5">{{ item.fixture.fixtureId }}</q-item-label>
              <q-item-label class="q-mt-sm row q-gutter-xs">
                <q-chip
                  v-if="item.hasOverlap"
                  color="negative"
                  text-color="white"
                  dense
                  icon="warning"
                  label="Overlap"
                  size="sm"
                />
                <q-chip
                  v-if="item.outOfRange"
                  color="orange"
                  text-color="black"
                  dense
                  icon="straighten"
                  label="Out of 1-512"
                  size="sm"
                />
              </q-item-label>
              <q-item-label v-if="item.overlapsWith.length" caption class="text-negative">
                Conflicts with: {{ item.overlapsWith.join(', ') }}
              </q-item-label>
              <div class="row q-col-gutter-xs q-mt-sm">
                <div class="col-4">
                  <q-input
                    :model-value="item.fixture.position?.x"
                    type="number"
                    label="X"
                    dark
                    filled
                    dense
                    placeholder="auto"
                    @update:model-value="val => updateFixturePosition(item.index, 'x', val)"
                  />
                </div>
                <div class="col-4">
                  <q-input
                    :model-value="item.fixture.position?.y"
                    type="number"
                    label="Y"
                    dark
                    filled
                    dense
                    placeholder="auto"
                    @update:model-value="val => updateFixturePosition(item.index, 'y', val)"
                  />
                </div>
                <div class="col-4">
                  <q-input
                    :model-value="item.fixture.position?.z"
                    type="number"
                    label="Z"
                    dark
                    filled
                    dense
                    placeholder="auto"
                    @update:model-value="val => updateFixturePosition(item.index, 'z', val)"
                  />
                </div>
              </div>
              <q-btn
                flat
                dense
                size="sm"
                icon="my_location"
                label="Aim at center"
                class="q-mt-sm"
                @click="aimFixtureAtCenter(item.index)"
              />
            </q-item-section>

            <q-item-section class="col-4 q-px-sm">
              <q-select
                :model-value="item.destId"
                :options="destinationOptions"
                label="Output Destination"
                dark
                filled
                dense
                emit-value
                map-options
                @update:model-value="val => updatePatch(item.index, { outputDestinationId: val })"
              />
            </q-item-section>

            <q-item-section class="col-3 q-px-sm">
              <q-item-label class="text-grey-4 text-caption">
                {{ getDestUniverseLabel(item.destId) }}
              </q-item-label>
              <q-item-label caption class="text-grey-6">{{ getDestName(item.destId) }}</q-item-label>
            </q-item-section>

            <q-item-section class="col-2 text-right">
              <q-input
                :model-value="item.fixture.startingChannel"
                type="number"
                label="Start"
                dark
                filled
                dense
                min="1"
                max="512"
                placeholder="Auto"
                @update:model-value="val => updatePatch(item.index, { startingChannel: val ? Number(val) : undefined })"
              />
              <div class="text-caption text-grey-5 q-mt-xs">
                Ch {{ item.startChannel }}-{{ item.endChannel }} ({{ item.channelCount }})
              </div>
            </q-item-section>
          </q-item>
        </q-list>

        <div class="q-mb-sm row items-center q-col-gutter-sm">
          <div class="col-auto text-caption text-grey-4 text-uppercase">Patch Grid Destination</div>
          <div class="col-5">
            <q-select
              v-model="selectedGridDestinationId"
              :options="destinationOptions"
              dense
              dark
              filled
              emit-value
              map-options
            />
          </div>
        </div>

        <PatchGrid
          :fixtures="selectedGridFixtures"
          :title="`Channel Map: ${getDestName(selectedGridDestinationId)}`"
        />
      </q-scroll-area>

      <div v-else class="fit flex flex-center text-center text-grey-5">
        <div>
          <q-icon name="settings_ethernet" size="4rem" class="q-mb-md" />
          <div class="text-h6">No fixtures patched yet</div>
          <div class="text-subtitle2 q-mb-md">Add a fixture from the library to start patching.</div>
          <q-btn color="primary" icon="add" label="Add Fixture from Library" @click="openAddFixtureDialog" />
        </div>
      </div>
    </div>

    <div v-show="selectedPatchTab === 'pixel-maps'" class="col">
      <q-scroll-area class="fit">
        <PixelMapPanel />
      </q-scroll-area>
    </div>

    <q-dialog v-model="showAddFixtureDialog">
      <q-card style="min-width: 460px">
        <q-card-section>
          <div class="text-h6">Add Fixture from Library</div>
          <div class="text-caption text-grey-6">Select a fixture definition and patch destination.</div>
        </q-card-section>
        <q-card-section class="q-gutter-y-md">
          <q-select
            v-model="selectedFixtureType"
            :options="fixtureTypeOptions"
            label="Fixture Type"
            emit-value
            map-options
            dark
            filled
          />
          <q-input
            v-model="newFixtureName"
            label="Fixture Name"
            dark
            filled
            hint="Leave empty to auto-generate from fixture type"
          />
          <q-select
            v-if="selectedFixtureModes.length > 0"
            v-model="newFixtureModeId"
            :options="selectedFixtureModes.map((mode) => ({ label: mode.name, value: mode.id }))"
            label="DMX Mode"
            emit-value
            map-options
            dark
            filled
          />
          <div v-if="selectedFixtureType" class="row q-gutter-sm">
            <q-btn dense flat icon="download" label="Export YAML" @click="exportFixture(selectedFixtureType, 'yaml')" />
            <q-btn dense flat icon="download" label="Export GDTF" @click="exportFixture(selectedFixtureType, 'gdtf')" />
          </div>
          <q-select
            v-model="newFixtureDestinationId"
            :options="destinationOptions"
            label="Output Destination"
            emit-value
            map-options
            dark
            filled
          />
          <q-input
            v-model.number="newFixtureStartingChannel"
            type="number"
            min="1"
            max="512"
            label="Starting Channel (optional)"
            dark
            filled
            hint="Leave empty to auto-place based on fixture order"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="primary" label="Add Fixture" :disable="!selectedFixtureType" @click="addFixtureFromLibrary" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<style scoped>
.bg-dark-card {
  background-color: var(--sdmx-color-bg-inset);
}
.border-grey {
  border: 1px solid var(--sdmx-color-border-subtle);
}
.border-bottom {
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
}
.border-bottom:last-child {
  border-bottom: none;
}
.patch-header {
  background: var(--sdmx-color-bg-inset);
}
.patch-item {
  transition: background-color 0.2s ease;
}
.patch-item:hover {
  background-color: var(--sdmx-color-bg-muted);
}
.scroll-area-container {
  border-radius: 8px;
  overflow: hidden;
  height: 100%;
}
</style>
