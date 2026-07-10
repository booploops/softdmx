<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useShowStore } from 'src/stores/show';
import { useDMXStore } from 'src/stores/dmx';
import { useChannelControl } from 'src/composables/useChannelControl';
import { getAllFixtures, getFixtureDefinition } from 'src/fixture-library/registry';
import { resolveFixtureChannelsForMode } from '@softdmx/engine';
import type { FixtureChannelWithReference, ShowfileFixture } from '@softdmx/engine';
import { computeAimPanTilt16Bit, resolveFixturePosition } from '@softdmx/engine';
import { useFixtureImport } from 'src/composables/useFixtureImport';
import { createAlert } from 'src/lib/CommonDialogs';
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
const visualizerSelectedFixtures = ref<string[]>([]);
const visualizerSnapEnabled = ref(true);
const visualizerSnapStep = ref(1);
const visualizerAutoAlignMode = ref<'row' | 'column'>('row');
const VISUALIZER_SNAP_STEPS = [0.25, 0.5, 1, 2] as const;

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

async function aimFixtureAtCenter(index: number) {
  const fixture = showStore.document.fixtures[index];
  if (!fixture) return;

  const mappedFixture = dmx.showfileFixturesMapped.find((mapped) => mapped.fixtureName === fixture.name);
  if (!mappedFixture) {
    await createAlert({
      title: 'Warning',
      message: `Fixture "${fixture.name}" is unavailable in the DMX map.`,
    });
    return;
  }

  const focusChannels = resolveFocusChannels(mappedFixture.def.channels);
  if (!focusChannels) {
    await createAlert({
      title: 'Warning',
      message: `Fixture "${fixture.name}" has no pan/tilt channels.`,
    });
    return;
  }

  const source = resolveFixturePosition(fixture.position, index, showStore.document.fixtures.length);
  const aim = computeAimPanTilt16Bit(source, { x: 0, y: 0, z: 0 });
  if (!aim) {
    await createAlert({
      title: 'Warning',
      message: `Fixture "${fixture.name}" is already at stage center.`,
    });
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

  await createAlert({
    title: 'Success',
    message: `Aimed "${fixture.name}" at stage center.`,
  });
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

function snapVisualizerValue(value: number): number {
  if (!visualizerSnapEnabled.value) return value;
  const step = Math.max(0.05, visualizerSnapStep.value);
  return Math.round(value / step) * step;
}

function cycleVisualizerSnapStep() {
  const currentIndex = VISUALIZER_SNAP_STEPS.findIndex((value) => value === visualizerSnapStep.value);
  const nextIndex = (currentIndex + 1) % VISUALIZER_SNAP_STEPS.length;
  visualizerSnapStep.value = VISUALIZER_SNAP_STEPS[nextIndex] ?? 1;
}

function cycleVisualizerAlignMode() {
  visualizerAutoAlignMode.value = visualizerAutoAlignMode.value === 'row' ? 'column' : 'row';
}

function onVisualizerFixtureSelect(name: string) {
  const selected = new Set(visualizerSelectedFixtures.value);
  if (selected.has(name)) {
    selected.delete(name);
  } else {
    selected.add(name);
  }
  visualizerSelectedFixtures.value = Array.from(selected);
}

function onVisualizerFixtureMove(name: string, position: { x: number; y?: number; z: number }) {
  const snappedX = snapVisualizerValue(position.x);
  const snappedZ = snapVisualizerValue(position.z);
  showStore.updateDocument((doc) => {
    const fixture = doc.fixtures.find((entry) => entry.name === name);
    if (!fixture) return;
    fixture.position = {
      ...(fixture.position ?? {}),
      x: snappedX,
      y: position.y ?? fixture.position?.y ?? 0,
      z: snappedZ,
    };
  });
}

function autoAlignVisualizerFixtures() {
  const fixtureList = showStore.document.fixtures;
  if (!fixtureList.length) return;

  const selectedSet = new Set(visualizerSelectedFixtures.value);
  const targetNames =
    selectedSet.size > 0
      ? fixtureList.filter((fixture) => selectedSet.has(fixture.name)).map((fixture) => fixture.name)
      : fixtureList.map((fixture) => fixture.name);
  if (!targetNames.length) return;
  const targetNameSet = new Set(targetNames);

  const positions = fixtureList
    .map((fixture, index) => ({
      name: fixture.name,
      position: resolveFixturePosition(fixture.position, index, fixtureList.length),
    }))
    .filter((entry) => targetNameSet.has(entry.name))
    .sort((a, b) =>
      visualizerAutoAlignMode.value === 'row'
        ? a.position.x - b.position.x || a.position.z - b.position.z
        : a.position.z - b.position.z || a.position.x - b.position.x
    );

  const count = positions.length;
  if (!count) return;

  const averageX = positions.reduce((sum, entry) => sum + entry.position.x, 0) / count;
  const averageZ = positions.reduce((sum, entry) => sum + entry.position.z, 0) / count;
  const spacing = visualizerSnapEnabled.value ? Math.max(visualizerSnapStep.value, 0.25) : 1;
  const positionByName = new Map(
    positions.map((entry, index) => {
      if (visualizerAutoAlignMode.value === 'row') {
        const startX = averageX - ((count - 1) * spacing) / 2;
        return [entry.name, { x: snapVisualizerValue(startX + index * spacing), z: snapVisualizerValue(averageZ) }];
      }
      const startZ = averageZ - ((count - 1) * spacing) / 2;
      return [entry.name, { x: snapVisualizerValue(averageX), z: snapVisualizerValue(startZ + index * spacing) }];
    })
  );

  showStore.updateDocument((doc) => {
    doc.fixtures.forEach((fixture) => {
      const next = positionByName.get(fixture.name);
      if (!next) return;
      fixture.position = {
        ...(fixture.position ?? {}),
        x: next.x,
        y: fixture.position?.y ?? 0,
        z: next.z,
      };
    });
  });
}

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
  <div class="patch-panel">
    <div class="patch-panel__header">
      <div>
        <div class="patch-panel__title">Patch Manager</div>
        <div class="patch-panel__subtitle">
          Route fixtures to destinations, set DMX starts, and verify universe layout.
        </div>
      </div>
      <div
        v-if="selectedPatchTab === 'fixtures'"
        class="patch-panel__actions"
      >
        <XButton
          v-info="'setup.patch.addFixture'"
          color="primary"
          icon="plus"
          label="Add Fixture from Library"
          @click="openAddFixtureDialog"
        />
        <XButton
          v-info="'setup.patch.importFixtures'"
          icon="upload"
          label="Import GDTF/YAML"
          @click="triggerImportFixture"
        />
        <input
          ref="importInputRef"
          type="file"
          accept=".gdtf,.yaml,.yml"
          hidden
          @change="onImportFixtureSelected"
        />
        <XButton
          v-if="showStore.document.fixtures.length > 0"
          v-info="'setup.patch.autoPatch'"
          icon="wand"
          label="Auto Patch Sequentially"
          @click="autoPatchAll"
        />
      </div>
    </div>

    <XTabs
      v-model="selectedPatchTab"
      class="patch-panel__tabs"
    >
      <XTab
        name="fixtures"
        icon="git-branch"
        label="Fixtures"
      />
      <XTab
        name="pixel-maps"
        icon="grid-3x3"
        label="Pixel Maps"
      />
    </XTabs>

    <div
      v-show="selectedPatchTab === 'fixtures'"
      class="patch-panel__stats"
    >
      <XWell
        dense
        class="patch-panel__stat"
      >
        <XIcon
          name="database"
          class="patch-panel__stat-icon"
        />
        {{ patchedFixtures.length }} patched fixture{{ patchedFixtures.length === 1 ? '' : 's' }}
      </XWell>
      <XWell
        dense
        class="patch-panel__stat"
        :class="overlapCount ? 'patch-panel__stat--danger' : 'patch-panel__stat--ok'"
      >
        <XIcon
          :name="overlapCount ? 'alert-triangle' : 'circle-check'"
          class="patch-panel__stat-icon"
        />
        {{ overlapCount }} overlap warning{{ overlapCount === 1 ? '' : 's' }}
      </XWell>
      <XWell
        dense
        class="patch-panel__stat"
        :class="outOfRangeCount ? 'patch-panel__stat--warn' : 'patch-panel__stat--ok'"
      >
        <XIcon
          :name="outOfRangeCount ? 'alert-triangle' : 'circle-check'"
          class="patch-panel__stat-icon"
        />
        {{ outOfRangeCount }} range issue{{ outOfRangeCount === 1 ? '' : 's' }}
      </XWell>
    </div>

    <div
      v-show="selectedPatchTab === 'fixtures'"
      class="patch-panel__toolbar"
    >
      <XButton
        size="sm"
        :color="visualizerSnapEnabled ? 'primary' : 'default'"
        :outline="!visualizerSnapEnabled"
        :label="visualizerSnapEnabled ? `Snap ${visualizerSnapStep}m` : 'Snap Off'"
        @click="visualizerSnapEnabled = !visualizerSnapEnabled"
      />
      <XButton
        size="sm"
        flat
        label="Snap Step"
        @click="cycleVisualizerSnapStep"
      />
      <XButton
        size="sm"
        flat
        :label="visualizerAutoAlignMode === 'row' ? 'Mode: Row' : 'Mode: Column'"
        @click="cycleVisualizerAlignMode"
      />
      <XButton
        size="sm"
        flat
        label="Auto Align"
        @click="autoAlignVisualizerFixtures"
      />
    </div>

    <VisualizerPanel
      v-show="selectedPatchTab === 'fixtures'"
      :fixtures="visualizerFixtures"
      :selected-fixtures="visualizerSelectedFixtures"
      :snap-enabled="visualizerSnapEnabled"
      :snap-step="visualizerSnapStep"
      @select-fixture="onVisualizerFixtureSelect"
      @move-fixture="onVisualizerFixtureMove"
    />

    <div
      v-show="selectedPatchTab === 'fixtures'"
      class="patch-panel__scroll"
    >
      <template v-if="showStore.document.fixtures.length > 0">
        <div class="patch-table">
          <div class="patch-table__header">
            <div>Fixture</div>
            <div>Destination</div>
            <div>Universe / Endpoint</div>
            <div class="patch-table__addr">Address</div>
          </div>
          <div
            v-for="item in patchedFixtures"
            :key="item.index"
            class="patch-table__row"
          >
            <div class="patch-table__fixture">
              <div class="patch-table__name">{{ item.fixture.name }}</div>
              <div class="patch-table__id">{{ item.fixture.fixtureId }}</div>
              <div class="patch-table__chips">
                <XChip
                  v-if="item.hasOverlap"
                  color="negative"
                  dense
                  size="sm"
                  icon="alert-triangle"
                  label="Overlap"
                />
                <XChip
                  v-if="item.outOfRange"
                  color="warning"
                  dense
                  size="sm"
                  icon="straighten"
                  label="Out of 1-512"
                />
              </div>
              <div
                v-if="item.overlapsWith.length"
                class="patch-table__conflict"
              >
                Conflicts with: {{ item.overlapsWith.join(', ') }}
              </div>
              <div class="patch-table__xyz">
                <XInput
                  :model-value="item.fixture.position?.x"
                  type="number"
                  label="X"
                  dense
                  placeholder="auto"
                  @update:model-value="val => updateFixturePosition(item.index, 'x', val)"
                />
                <XInput
                  :model-value="item.fixture.position?.y"
                  type="number"
                  label="Y"
                  dense
                  placeholder="auto"
                  @update:model-value="val => updateFixturePosition(item.index, 'y', val)"
                />
                <XInput
                  :model-value="item.fixture.position?.z"
                  type="number"
                  label="Z"
                  dense
                  placeholder="auto"
                  @update:model-value="val => updateFixturePosition(item.index, 'z', val)"
                />
              </div>
              <XButton
                flat
                size="sm"
                icon="current-location"
                label="Aim at center"
                class="patch-table__aim"
                @click="aimFixtureAtCenter(item.index)"
              />
            </div>

            <div>
              <XSelect
                :model-value="item.destId"
                :options="destinationOptions"
                label="Output Destination"
                dense
                @update:model-value="val => updatePatch(item.index, { outputDestinationId: String(val) })"
              />
            </div>

            <div>
              <div class="patch-table__universe">{{ getDestUniverseLabel(item.destId) }}</div>
              <div class="patch-table__dest-name">{{ getDestName(item.destId) }}</div>
            </div>

            <div class="patch-table__addr">
              <XInput
                :model-value="item.fixture.startingChannel"
                type="number"
                label="Start"
                dense
                placeholder="Auto"
                @update:model-value="val => updatePatch(item.index, { startingChannel: val ? Number(val) : undefined })"
              />
              <div class="patch-table__range">
                Ch {{ item.startChannel }}-{{ item.endChannel }} ({{ item.channelCount }})
              </div>
            </div>
          </div>
        </div>

        <div class="patch-panel__grid-picker">
          <div class="patch-panel__grid-label">Patch Grid Destination</div>
          <XSelect
            v-model="selectedGridDestinationId"
            :options="destinationOptions"
            dense
            class="patch-panel__grid-select"
          />
        </div>

        <PatchGrid
          :fixtures="selectedGridFixtures"
          :title="`Channel Map: ${getDestName(selectedGridDestinationId)}`"
        />
      </template>

      <XWell
        v-else
        class="patch-panel__empty"
      >
        <XIcon
          name="network"
          size="4rem"
          class="patch-panel__empty-icon"
        />
        <div class="patch-panel__empty-title">No fixtures patched yet</div>
        <div class="patch-panel__empty-hint">Add a fixture from the library to start patching.</div>
        <XButton
          color="primary"
          icon="plus"
          label="Add Fixture from Library"
          @click="openAddFixtureDialog"
        />
      </XWell>
    </div>

    <div
      v-show="selectedPatchTab === 'pixel-maps'"
      class="patch-panel__scroll"
    >
      <PixelMapPanel />
    </div>

    <XDialog v-model="showAddFixtureDialog">
      <XDialogHeader title="Add Fixture from Library" />
      <XDialogBody class="patch-panel__dialog-body">
        <div class="patch-panel__dialog-caption">Select a fixture definition and patch destination.</div>
        <XSelect
          v-model="selectedFixtureType"
          :options="fixtureTypeOptions"
          label="Fixture Type"
        />
        <XInput
          v-model="newFixtureName"
          label="Fixture Name"
          placeholder="Leave empty to auto-generate from fixture type"
        />
        <XSelect
          v-if="selectedFixtureModes.length > 0"
          v-model="newFixtureModeId"
          :options="selectedFixtureModes.map((mode) => ({ label: mode.name, value: mode.id }))"
          label="DMX Mode"
        />
        <div
          v-if="selectedFixtureType"
          class="patch-panel__export-row"
        >
          <XButton
            flat
            size="sm"
            icon="download"
            label="Export YAML"
            @click="exportFixture(selectedFixtureType, 'yaml')"
          />
          <XButton
            flat
            size="sm"
            icon="download"
            label="Export GDTF"
            @click="exportFixture(selectedFixtureType, 'gdtf')"
          />
        </div>
        <XSelect
          v-model="newFixtureDestinationId"
          :options="destinationOptions"
          label="Output Destination"
        />
        <XInput
          v-model.number="newFixtureStartingChannel"
          type="number"
          label="Starting Channel (optional)"
          placeholder="Leave empty to auto-place based on fixture order"
        />
      </XDialogBody>
      <XDialogFooter>
        <XButton
          flat
          label="Cancel"
          @click="showAddFixtureDialog = false"
        />
        <XButton
          color="primary"
          label="Add Fixture"
          :disable="!selectedFixtureType"
          @click="addFixtureFromLibrary"
        />
      </XDialogFooter>
    </XDialog>
  </div>
</template>

<style scoped>
.patch-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: var(--sdmx-space-md, 16px);
  box-sizing: border-box;
}

.patch-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.patch-panel__title {
  font-size: 1.25rem;
  font-weight: 700;
}

.patch-panel__subtitle {
  font-size: 12px;
  color: var(--sdmx-color-text-muted);
  margin-top: 2px;
}

.patch-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.patch-panel__tabs {
  margin-bottom: 12px;
}

.patch-panel__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}

.patch-panel__stat {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.patch-panel__stat-icon {
  flex-shrink: 0;
}

.patch-panel__stat--ok {
  color: var(--sdmx-color-positive, #34c759);
}

.patch-panel__stat--danger {
  color: var(--sdmx-color-negative, #ff3b30);
}

.patch-panel__stat--warn {
  color: var(--sdmx-color-warning, #ff9f0a);
}

.patch-panel__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 8px;
}

.patch-panel__scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border-radius: 8px;
}

.patch-table {
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: 8px;
  background: var(--sdmx-color-bg-inset);
  margin-bottom: 16px;
  overflow: hidden;
}

.patch-table__header,
.patch-table__row {
  display: grid;
  grid-template-columns: 3fr 4fr 3fr 2fr;
  gap: 8px;
  padding: 12px;
  align-items: start;
}

.patch-table__header {
  background: var(--sdmx-color-bg-inset);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--sdmx-color-text-muted);
  padding-top: 8px;
  padding-bottom: 8px;
}

.patch-table__row {
  border-top: 1px solid var(--sdmx-color-border-subtle);
}

.patch-table__row:hover {
  background: var(--sdmx-color-bg-muted);
}

.patch-table__name {
  font-weight: 700;
  font-size: 15px;
}

.patch-table__id,
.patch-table__dest-name,
.patch-table__range {
  font-size: 12px;
  color: var(--sdmx-color-text-muted);
}

.patch-table__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.patch-table__conflict {
  margin-top: 4px;
  font-size: 12px;
  color: var(--sdmx-color-negative, #ff3b30);
}

.patch-table__xyz {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  margin-top: 8px;
}

.patch-table__aim {
  margin-top: 8px;
}

.patch-table__universe {
  font-size: 12px;
  color: var(--sdmx-color-text-secondary, var(--sdmx-color-text-muted));
}

.patch-table__addr {
  text-align: right;
}

.patch-panel__grid-picker {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.patch-panel__grid-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--sdmx-color-text-muted);
}

.patch-panel__grid-select {
  min-width: 220px;
  max-width: 360px;
  flex: 1;
}

.patch-panel__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 8px;
  min-height: 220px;
}

.patch-panel__empty-icon {
  color: var(--sdmx-color-text-muted);
  margin-bottom: 4px;
}

.patch-panel__empty-title {
  font-size: 1.1rem;
  font-weight: 600;
}

.patch-panel__empty-hint {
  font-size: 13px;
  color: var(--sdmx-color-text-muted);
  margin-bottom: 8px;
}

.patch-panel__dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 420px;
}

.patch-panel__dialog-caption {
  font-size: 12px;
  color: var(--sdmx-color-text-muted);
}

.patch-panel__export-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 900px) {
  .patch-panel__stats {
    grid-template-columns: 1fr;
  }

  .patch-table__header {
    display: none;
  }

  .patch-table__header,
  .patch-table__row {
    grid-template-columns: 1fr;
  }

  .patch-table__addr {
    text-align: left;
  }
}
</style>
