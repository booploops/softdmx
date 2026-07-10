<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useShowStore } from 'src/stores/show';
import type { PixelMapDefinition, PixelMapFixtureChannel } from '@softdmx/engine';

const showStore = useShowStore();
const selectedPixelMapId = ref<string>('');

const pixelMaps = computed(() => showStore.document.pixelMaps ?? []);
const fixtureOptions = computed(() =>
  showStore.document.fixtures.map((fixture) => ({
    label: fixture.name,
    value: fixture.name,
  }))
);

const channelOrderOptions = [
  { label: 'RGB', value: 'rgb' },
  { label: 'RBG', value: 'rbg' },
  { label: 'GRB', value: 'grb' },
  { label: 'GBR', value: 'gbr' },
  { label: 'BRG', value: 'brg' },
  { label: 'BGR', value: 'bgr' },
];

watch(
  pixelMaps,
  (maps) => {
    if (!maps.length) {
      selectedPixelMapId.value = '';
      return;
    }
    if (!maps.some((map) => map.id === selectedPixelMapId.value)) {
      selectedPixelMapId.value = maps[0]?.id ?? '';
    }
  },
  { immediate: true }
);

const currentPixelMap = computed(() =>
  pixelMaps.value.find((map) => map.id === selectedPixelMapId.value)
);

const assignedCellCount = computed(() => currentPixelMap.value?.fixtureChannels.length ?? 0);
const totalCellCount = computed(() => {
  const map = currentPixelMap.value;
  if (!map) return 0;
  return map.width * map.height;
});

function addPixelMap() {
  const id = `pixel-map-${Date.now()}`;
  showStore.updateDocument((doc) => {
    doc.pixelMaps ??= [];
    doc.pixelMaps.push({
      id,
      name: `Pixel Map ${doc.pixelMaps.length + 1}`,
      width: 8,
      height: 8,
      channelOrder: 'rgb',
      fixtureChannels: [],
    });
  });
  selectedPixelMapId.value = id;
}

function removePixelMap() {
  if (!selectedPixelMapId.value) return;
  showStore.updateDocument((doc) => {
    doc.pixelMaps = (doc.pixelMaps ?? []).filter((map) => map.id !== selectedPixelMapId.value);
  });
}

function updateCurrentMap(updater: (map: PixelMapDefinition) => PixelMapDefinition) {
  const mapId = selectedPixelMapId.value;
  if (!mapId) return;

  showStore.updateDocument((doc) => {
    doc.pixelMaps ??= [];
    const index = doc.pixelMaps.findIndex((map) => map.id === mapId);
    if (index < 0) return;
    const current = doc.pixelMaps[index];
    if (!current) return;
    doc.pixelMaps[index] = updater(current);
  });
}

function addFixtureChannelRow() {
  if (!fixtureOptions.value.length) return;
  updateCurrentMap((map) => ({
    ...map,
    fixtureChannels: [
      ...map.fixtureChannels,
      {
        fixtureName: fixtureOptions.value[0]?.value ?? '',
        x: 0,
        y: 0,
        startChannel: 1,
      },
    ],
  }));
}

function updateFixtureChannel(index: number, updates: Partial<PixelMapFixtureChannel>) {
  updateCurrentMap((map) => ({
    ...map,
    fixtureChannels: map.fixtureChannels.map((fixtureChannel, fixtureChannelIndex) =>
      fixtureChannelIndex === index
        ? {
            ...fixtureChannel,
            ...updates,
          }
        : fixtureChannel
    ),
  }));
}

function removeFixtureChannel(index: number) {
  updateCurrentMap((map) => ({
    ...map,
    fixtureChannels: map.fixtureChannels.filter((_, fixtureChannelIndex) => fixtureChannelIndex !== index),
  }));
}

function parseWholeNumber(value: string | number | null | undefined, fallback: number, minValue = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minValue, Math.round(parsed));
}
</script>

<template>
  <div class="pixel-map-panel">
    <div class="pixel-map-panel__toolbar">
      <XSelect
        v-model="selectedPixelMapId"
        :options="pixelMaps.map((map) => ({ label: map.name, value: map.id }))"
        label="Pixel Map"
        class="pixel-map-panel__select"
      />
      <XButton
        color="primary"
        icon="plus"
        label="Add Pixel Map"
        @click="addPixelMap"
      />
      <XButton
        color="danger"
        flat
        icon="trash"
        label="Remove"
        :disable="!currentPixelMap"
        @click="removePixelMap"
      />
    </div>

    <template v-if="currentPixelMap">
      <div class="pixel-map-panel__fields">
        <XInput
          :model-value="currentPixelMap.name"
          label="Name"
          @update:model-value="
            (val) => updateCurrentMap((map) => ({ ...map, name: String(val ?? '') }))
          "
        />
        <XInput
          :model-value="currentPixelMap.width"
          type="number"
          label="Width"
          @update:model-value="
            (val) => updateCurrentMap((map) => ({ ...map, width: parseWholeNumber(val, map.width, 1) }))
          "
        />
        <XInput
          :model-value="currentPixelMap.height"
          type="number"
          label="Height"
          @update:model-value="
            (val) => updateCurrentMap((map) => ({ ...map, height: parseWholeNumber(val, map.height, 1) }))
          "
        />
        <XSelect
          :model-value="currentPixelMap.channelOrder"
          :options="channelOrderOptions"
          label="Channel Order"
          @update:model-value="
            (val) =>
              updateCurrentMap((map) => ({
                ...map,
                channelOrder: (val ?? 'rgb') as PixelMapDefinition['channelOrder'],
              }))
          "
        />
      </div>

      <div class="pixel-map-panel__mapping-header">
        <div class="pixel-map-panel__mapping-title">Fixture Channel Mapping</div>
        <div class="pixel-map-panel__mapping-count">
          {{ assignedCellCount }} / {{ totalCellCount }} cells assigned
        </div>
      </div>

      <XWell
        v-if="fixtureOptions.length === 0"
        dense
        class="pixel-map-panel__warn"
      >
        Patch fixtures first, then assign map cells to fixture channels.
      </XWell>

      <XListView
        :bordered="true"
        class="pixel-map-panel__list"
      >
        <XListItem :clickable="false">
          <div class="pixel-map-panel__row pixel-map-panel__row--header">
            <div>Fixture</div>
            <div>X</div>
            <div>Y</div>
            <div>Start Ch</div>
            <div class="pixel-map-panel__actions">Actions</div>
          </div>
        </XListItem>

        <XListItem
          v-for="(fixtureChannel, index) in currentPixelMap.fixtureChannels"
          :key="`${fixtureChannel.fixtureName}-${fixtureChannel.x}-${fixtureChannel.y}-${index}`"
          :clickable="false"
        >
          <div class="pixel-map-panel__row">
            <XSelect
              :model-value="fixtureChannel.fixtureName"
              :options="fixtureOptions"
              @update:model-value="
                (val) => updateFixtureChannel(index, { fixtureName: String(val ?? '') })
              "
            />
            <XInput
              :model-value="fixtureChannel.x"
              type="number"
              @update:model-value="
                (val) => updateFixtureChannel(index, { x: parseWholeNumber(val, fixtureChannel.x, 0) })
              "
            />
            <XInput
              :model-value="fixtureChannel.y"
              type="number"
              @update:model-value="
                (val) => updateFixtureChannel(index, { y: parseWholeNumber(val, fixtureChannel.y, 0) })
              "
            />
            <XInput
              :model-value="fixtureChannel.startChannel"
              type="number"
              @update:model-value="
                (val) =>
                  updateFixtureChannel(index, { startChannel: parseWholeNumber(val, fixtureChannel.startChannel, 1) })
              "
            />
            <div class="pixel-map-panel__actions">
              <XButton
                flat
                icon="trash"
                color="danger"
                @click="removeFixtureChannel(index)"
              />
            </div>
          </div>
        </XListItem>
      </XListView>

      <div class="pixel-map-panel__add">
        <XButton
          color="primary"
          icon="plus"
          label="Add Cell Mapping"
          :disable="fixtureOptions.length === 0"
          @click="addFixtureChannelRow"
        />
      </div>
    </template>

    <XWell
      v-else
      class="pixel-map-panel__empty"
    >
      No pixel maps yet. Add one to define a matrix and fixture channel bindings.
    </XWell>
  </div>
</template>

<style scoped>
.pixel-map-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pixel-map-panel__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 8px;
}

.pixel-map-panel__select {
  min-width: 200px;
  flex: 1;
  max-width: 320px;
}

.pixel-map-panel__fields {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.5fr;
  gap: 12px;
}

.pixel-map-panel__mapping-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pixel-map-panel__mapping-title {
  font-weight: 600;
}

.pixel-map-panel__mapping-count {
  font-size: 12px;
  color: var(--sdmx-color-text-muted);
}

.pixel-map-panel__warn {
  color: var(--sdmx-color-warning, #ff9f0a);
}

.pixel-map-panel__list {
  max-height: none;
}

.pixel-map-panel__row {
  display: grid;
  grid-template-columns: 3fr 1fr 1fr 1.5fr auto;
  gap: 8px;
  align-items: center;
  width: 100%;
}

.pixel-map-panel__row--header {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--sdmx-color-text-muted);
}

.pixel-map-panel__actions {
  text-align: right;
}

.pixel-map-panel__add {
  margin-top: 4px;
}

.pixel-map-panel__empty {
  color: var(--sdmx-color-text-muted);
  text-align: center;
  padding: 24px;
}

@media (max-width: 900px) {
  .pixel-map-panel__fields,
  .pixel-map-panel__row {
    grid-template-columns: 1fr;
  }

  .pixel-map-panel__actions {
    text-align: left;
  }
}
</style>
