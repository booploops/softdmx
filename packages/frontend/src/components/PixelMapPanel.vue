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
import XButton from 'src/components/controls/XButton.vue';
import XInput from 'src/components/controls/XInput.vue';
import XSelect from 'src/components/controls/XSelect.vue';
import XListView from 'src/components/controls/XListView.vue';
import XListItem from 'src/components/controls/XListItem.vue';

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
] as const;

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
    <div class="row q-col-gutter-sm items-center q-mb-md">
      <div class="col-4">
        <XSelect
          v-model="selectedPixelMapId"
          :options="pixelMaps.map((map) => ({ label: map.name, value: map.id }))"
          label="Pixel Map"
          emit-value
          map-options
        />
      </div>
      <div class="col-auto">
        <XButton color="primary" icon="add" label="Add Pixel Map" @click="addPixelMap" />
      </div>
      <div class="col-auto">
        <XButton
          color="danger"
          flat
          icon="delete"
          label="Remove"
          :disable="!currentPixelMap"
          @click="removePixelMap"
        />
      </div>
    </div>

    <template v-if="currentPixelMap">
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-4">
          <XInput
            :model-value="currentPixelMap.name"
            label="Name"
            @update:model-value="
              (val) => updateCurrentMap((map) => ({ ...map, name: String(val ?? '') }))
            "
          />
        </div>
        <div class="col-2">
          <XInput
            :model-value="currentPixelMap.width"
            type="number"
            min="1"
            label="Width"
            @update:model-value="
              (val) => updateCurrentMap((map) => ({ ...map, width: parseWholeNumber(val, map.width, 1) }))
            "
          />
        </div>
        <div class="col-2">
          <XInput
            :model-value="currentPixelMap.height"
            type="number"
            min="1"
            label="Height"
            @update:model-value="
              (val) => updateCurrentMap((map) => ({ ...map, height: parseWholeNumber(val, map.height, 1) }))
            "
          />
        </div>
        <div class="col-4">
          <XSelect
            :model-value="currentPixelMap.channelOrder"
            :options="channelOrderOptions"
            label="Channel Order"
            emit-value
            map-options
            @update:model-value="
              (val) =>
                updateCurrentMap((map) => ({
                  ...map,
                  channelOrder: (val ?? 'rgb') as PixelMapDefinition['channelOrder'],
                }))
            "
          />
        </div>
      </div>

      <div class="row items-center justify-between q-mb-sm">
        <div class="text-subtitle2">Fixture Channel Mapping</div>
        <div class="text-caption text-grey-5">
          {{ assignedCellCount }} / {{ totalCellCount }} cells assigned
        </div>
      </div>

      <q-banner v-if="fixtureOptions.length === 0" dense rounded class="bg-orange-10 text-orange-3 q-mb-md">
        Patch fixtures first, then assign map cells to fixture channels.
      </q-banner>

      <XListView :bordered="true">
        <XListItem :clickable="false" class="text-caption text-grey-5">
          <div class="row full-width items-center">
            <div class="col-3">Fixture</div>
            <div class="col-2">X</div>
            <div class="col-2">Y</div>
            <div class="col-3">Start Ch</div>
            <div class="col-2 text-right">Actions</div>
          </div>
        </XListItem>

        <XListItem
          v-for="(fixtureChannel, index) in currentPixelMap.fixtureChannels"
          :key="`${fixtureChannel.fixtureName}-${fixtureChannel.x}-${fixtureChannel.y}-${index}`"
          :clickable="false"
        >
          <div class="row full-width items-center q-col-gutter-sm">
            <div class="col-3">
              <XSelect
                :model-value="fixtureChannel.fixtureName"
                :options="fixtureOptions"
                emit-value
                map-options
                @update:model-value="
                  (val) => updateFixtureChannel(index, { fixtureName: String(val ?? '') })
                "
              />
            </div>
            <div class="col-2">
              <XInput
                :model-value="fixtureChannel.x"
                type="number"
                min="0"
                @update:model-value="
                  (val) => updateFixtureChannel(index, { x: parseWholeNumber(val, fixtureChannel.x, 0) })
                "
              />
            </div>
            <div class="col-2">
              <XInput
                :model-value="fixtureChannel.y"
                type="number"
                min="0"
                @update:model-value="
                  (val) => updateFixtureChannel(index, { y: parseWholeNumber(val, fixtureChannel.y, 0) })
                "
              />
            </div>
            <div class="col-3">
              <XInput
                :model-value="fixtureChannel.startChannel"
                type="number"
                min="1"
                @update:model-value="
                  (val) =>
                    updateFixtureChannel(index, { startChannel: parseWholeNumber(val, fixtureChannel.startChannel, 1) })
                "
              />
            </div>
            <div class="col-2 text-right">
              <XButton flat icon="delete" color="danger" @click="removeFixtureChannel(index)" />
            </div>
          </div>
        </XListItem>
      </XListView>

      <div class="q-mt-md">
        <XButton
          color="primary"
          icon="add"
          label="Add Cell Mapping"
          :disable="fixtureOptions.length === 0"
          @click="addFixtureChannelRow"
        />
      </div>
    </template>

    <div v-else class="text-grey-5 q-py-lg">
      No pixel maps yet. Add one to define a matrix and fixture channel bindings.
    </div>
  </div>
</template>

<style scoped>
.pixel-map-panel {
  display: flex;
  flex-direction: column;
}
</style>
