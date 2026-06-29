<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { OutputDestination, UniverseHealthStatus } from '@softdmx/engine';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { getFixtureDefinition } from 'src/fixture-library/registry';
import { useIOClient } from 'src/lib/io-client';
import { useDMXStore } from 'src/stores/dmx';
import { useOutputPlaybackStore } from 'src/stores/output-playback';
import { useShowStore } from 'src/stores/show';

interface DestinationDebugSummary {
  destination: OutputDestination;
  health?: UniverseHealthStatus;
  patchedChannelCount: number;
  activeChannelCount: number;
  maxUsedAddress: number;
  overflow: boolean;
  lastSendAgeMs: number | null;
}

interface AddressValue {
  address: number;
  value: number;
}

interface OutputFrameDebugSnapshot {
  destinationId: string;
  protocol: 'artnet' | 'sacn' | 'dmx_usb' | 'gridnode';
  emittedAtMs: number;
  firstChannels: number[];
  nonZeroChannels: Array<{ address: number; value: number }>;
  dmxUsbPacketPreview?: number[];
}

interface OutputIngressDebugSnapshot {
  destinationId: string;
  emittedAtMs: number;
  totalChannels: number;
  nonZeroChannels: Array<{ address: number; value: number }>;
}

const socket = useIOClient();
const showStore = useShowStore();
const dmxStore = useDMXStore();
const outputStore = useOutputPlaybackStore();

const healthByDestination = ref<Map<string, UniverseHealthStatus>>(new Map());
const frameDebugByDestination = ref<Map<string, OutputFrameDebugSnapshot>>(new Map());
const ingressByDestination = ref<Map<string, OutputIngressDebugSnapshot>>(new Map());
const selectedDestinationId = ref<string | null>(null);
const showZeroValues = ref(false);
const previewLimit = ref(48);

const destinations = computed(() => showStore.document.destinations ?? []);
const channelValueByPath = computed(() => new Map(dmxStore.channels.map((channel) => [channel.path, channel.value])));

const destinationChannelMaps = computed<Map<string, AddressValue[]>>(() => {
  const maps = new Map<string, AddressValue[]>();
  const nextAddressByDestination = new Map<string, number>();

  for (const fixture of showStore.document.fixtures) {
    const destinationId = fixture.outputDestinationId || 'default-gridnode';
    const definition = getFixtureDefinition(fixture.fixtureId);
    if (!definition) continue;

    const startAddress = fixture.startingChannel ?? (nextAddressByDestination.get(destinationId) ?? 1);
    nextAddressByDestination.set(destinationId, startAddress + definition.channels.length);

    const addressValues = maps.get(destinationId) ?? [];
    for (let index = 0; index < definition.channels.length; index += 1) {
      const address = startAddress + index;
      if (address < 1 || address > 512) continue;
      const path = `show://${fixture.name}/${index + 1}`;
      const value = channelValueByPath.value.get(path) ?? 0;
      addressValues.push({ address, value });
    }

    maps.set(destinationId, addressValues);
  }

  return maps;
});

const destinationSummaries = computed<DestinationDebugSummary[]>(() =>
  destinations.value.map((destination) => {
    const health = healthByDestination.value.get(destination.id);
    const addressValues = destinationChannelMaps.value.get(destination.id) ?? [];
    const activeChannelCount = addressValues.reduce((count, item) => count + (item.value > 0 ? 1 : 0), 0);
    const maxUsedAddress = addressValues.reduce((max, item) => Math.max(max, item.address), 0);

    return {
      destination,
      health,
      patchedChannelCount: addressValues.length,
      activeChannelCount,
      maxUsedAddress,
      overflow: Boolean(health?.overflow) || maxUsedAddress > 512,
      lastSendAgeMs: health?.lastSendMs ? Math.max(0, Date.now() - health.lastSendMs) : null,
    };
  })
);

const selectedSummary = computed(() =>
  destinationSummaries.value.find((summary) => summary.destination.id === selectedDestinationId.value)
  ?? destinationSummaries.value[0]
);

const selectedChannelPreview = computed(() => {
  const destinationId = selectedSummary.value?.destination.id;
  if (!destinationId) return [];

  const values = destinationChannelMaps.value.get(destinationId) ?? [];
  const filtered = showZeroValues.value ? values : values.filter((item) => item.value > 0);
  return filtered.slice(0, previewLimit.value).sort((a, b) => a.address - b.address);
});

const selectedFrameDebug = computed(() => {
  const destinationId = selectedSummary.value?.destination.id;
  if (!destinationId) return null;
  return frameDebugByDestination.value.get(destinationId) ?? null;
});

const selectedIngressDebug = computed(() => {
  const destinationId = selectedSummary.value?.destination.id;
  if (!destinationId) return null;
  return ingressByDestination.value.get(destinationId) ?? null;
});

const frameAgeMs = computed(() => {
  if (!selectedFrameDebug.value) return null;
  return Math.max(0, Date.now() - selectedFrameDebug.value.emittedAtMs);
});

const frameHexPreview = computed(() => {
  if (!selectedFrameDebug.value) return '';
  return selectedFrameDebug.value.firstChannels
    .map((value) => value.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
});

const dmxUsbPacketHexPreview = computed(() => {
  if (!selectedFrameDebug.value?.dmxUsbPacketPreview) return '';
  return selectedFrameDebug.value.dmxUsbPacketPreview
    .map((value) => value.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
});

const activeCueCount = computed(() => outputStore.playbackStates.size);
const activeChannelsTotal = computed(() => dmxStore.channels.reduce((count, channel) => count + (channel.value > 0 ? 1 : 0), 0));

function formatLastSend(ageMs: number | null): string {
  if (ageMs === null) return 'never';
  if (ageMs < 1000) return `${ageMs}ms ago`;
  return `${(ageMs / 1000).toFixed(1)}s ago`;
}

function formatDestinationLabel(destination: OutputDestination): string {
  return `${destination.name} (${destination.type})`;
}

function setHealth(statuses: UniverseHealthStatus[]) {
  const next = new Map<string, UniverseHealthStatus>();
  for (const status of statuses) {
    next.set(status.destinationId, status);
  }
  healthByDestination.value = next;
}

function handleOutputHealth(payload: unknown) {
  if (!Array.isArray(payload)) return;
  setHealth(payload as UniverseHealthStatus[]);
}

function handleOutputFrameDebug(payload: unknown) {
  if (!Array.isArray(payload)) return;
  const snapshots = payload as OutputFrameDebugSnapshot[];
  const next = new Map<string, OutputFrameDebugSnapshot>();
  for (const snapshot of snapshots) {
    next.set(snapshot.destinationId, snapshot);
  }
  frameDebugByDestination.value = next;
}

function handleOutputIngressDebug(payload: unknown) {
  if (!Array.isArray(payload)) return;
  const snapshots = payload as OutputIngressDebugSnapshot[];
  const next = new Map<string, OutputIngressDebugSnapshot>();
  for (const snapshot of snapshots) {
    next.set(snapshot.destinationId, snapshot);
  }
  ingressByDestination.value = next;
}

watch(destinations, (next) => {
  if (next.length === 0) {
    selectedDestinationId.value = null;
    return;
  }

  if (!selectedDestinationId.value || !next.some((dest) => dest.id === selectedDestinationId.value)) {
    selectedDestinationId.value = next[0]!.id;
  }
}, { immediate: true });

onMounted(() => {
  socket.on('output:health', handleOutputHealth);
  socket.on('output:frame-debug', handleOutputFrameDebug);
  socket.on('output:channels-ingress', handleOutputIngressDebug);
});

onBeforeUnmount(() => {
  socket.off('output:health', handleOutputHealth);
  socket.off('output:frame-debug', handleOutputFrameDebug);
  socket.off('output:channels-ingress', handleOutputIngressDebug);
});
</script>

<template>
  <div class="dmx-debug-panel q-pa-sm">
    <div class="dmx-debug-panel__summary q-mb-sm">
      <q-badge color="primary" text-color="white">Destinations: {{ destinations.length }}</q-badge>
      <q-badge color="secondary" text-color="white">Active cues: {{ activeCueCount }}</q-badge>
      <q-badge color="accent" text-color="black">Non-zero channels: {{ activeChannelsTotal }}</q-badge>
      <q-space />
      <q-toggle v-model="showZeroValues" dense label="Show zero values" />
      <q-input
        v-model.number="previewLimit"
        dense
        outlined
        type="number"
        min="8"
        max="512"
        label="Preview"
        style="width: 90px"
      />
    </div>

    <div class="dmx-debug-panel__layout">
      <q-list bordered dense class="dmx-debug-panel__dest-list">
        <q-item-label header>Output health</q-item-label>
        <q-item
          v-for="summary in destinationSummaries"
          :key="summary.destination.id"
          clickable
          :active="selectedDestinationId === summary.destination.id"
          active-class="dmx-debug-panel__active-item"
          @click="selectedDestinationId = summary.destination.id"
        >
          <q-item-section>
            <q-item-label>{{ formatDestinationLabel(summary.destination) }}</q-item-label>
            <q-item-label caption>
              {{ summary.health?.online ? 'online' : 'offline' }}
              · fps {{ summary.health?.sendFps ?? 0 }}
              · {{ formatLastSend(summary.lastSendAgeMs) }}
            </q-item-label>
            <q-item-label caption>
              patched {{ summary.patchedChannelCount }}
              · active {{ summary.activeChannelCount }}
              · max ch {{ summary.maxUsedAddress || 0 }}
            </q-item-label>
            <q-item-label v-if="summary.health?.errors?.length" caption class="text-negative">
              {{ summary.health.errors.join(' | ') }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-icon :name="summary.overflow ? 'warning' : 'check_circle'" :color="summary.overflow ? 'warning' : 'positive'" />
          </q-item-section>
        </q-item>
      </q-list>

      <div class="dmx-debug-panel__details q-pa-sm">
        <div class="text-subtitle2 q-mb-sm">
          {{ selectedSummary ? formatDestinationLabel(selectedSummary.destination) : 'No destination selected' }}
        </div>

        <div v-if="selectedSummary" class="text-caption text-grey-5 q-mb-sm">
          universe {{ selectedSummary.health?.universe ?? Number(selectedSummary.destination.settings?.Universe ?? 0) }}
          · protocol {{ selectedSummary.health?.protocol ?? selectedSummary.destination.type }}
          · role {{ selectedSummary.health?.role ?? selectedSummary.destination.role ?? 'primary' }}
        </div>

        <div class="text-caption text-grey-5 q-mb-sm">
          ingress non-zero {{ selectedIngressDebug?.nonZeroChannels.length ?? 0 }} / {{ selectedIngressDebug?.totalChannels ?? 0 }}
          · worker non-zero {{ selectedFrameDebug?.nonZeroChannels.length ?? 0 }}
        </div>

        <q-markup-table dense flat bordered class="dmx-debug-panel__table">
          <thead>
            <tr>
              <th class="text-left">Address</th>
              <th class="text-left">Value</th>
              <th class="text-left">%</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in selectedChannelPreview" :key="`${entry.address}-${entry.value}`">
              <td>{{ entry.address }}</td>
              <td>{{ entry.value }}</td>
              <td>{{ Math.round((entry.value / 255) * 100) }}</td>
            </tr>
            <tr v-if="selectedChannelPreview.length === 0">
              <td colspan="3" class="text-center text-grey-6">No channels match current filters.</td>
            </tr>
          </tbody>
        </q-markup-table>

        <div class="q-mt-md">
          <div class="text-subtitle2 q-mb-xs">Live sent frame (worker)</div>
          <div class="text-caption text-grey-5 q-mb-xs">
            {{ selectedFrameDebug ? `updated ${formatLastSend(frameAgeMs)} · protocol ${selectedFrameDebug.protocol}` : 'No frame data yet.' }}
          </div>

          <div v-if="selectedFrameDebug" class="q-gutter-y-sm">
            <div class="text-caption text-grey-4">First 64 DMX channels (hex)</div>
            <pre class="dmx-debug-panel__hex-preview">{{ frameHexPreview }}</pre>

            <template v-if="selectedFrameDebug.protocol === 'dmx_usb' && dmxUsbPacketHexPreview">
              <div class="text-caption text-grey-4">DMX USB packet preview (hex)</div>
              <pre class="dmx-debug-panel__hex-preview">{{ dmxUsbPacketHexPreview }}</pre>
            </template>

            <q-markup-table dense flat bordered class="dmx-debug-panel__table">
              <thead>
                <tr>
                  <th class="text-left">Non-zero address</th>
                  <th class="text-left">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="entry in selectedFrameDebug.nonZeroChannels" :key="`nz-${entry.address}-${entry.value}`">
                  <td>{{ entry.address }}</td>
                  <td>{{ entry.value }}</td>
                </tr>
                <tr v-if="selectedFrameDebug.nonZeroChannels.length === 0">
                  <td colspan="2" class="text-center text-grey-6">No non-zero channels in latest frame.</td>
                </tr>
              </tbody>
            </q-markup-table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dmx-debug-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dmx-debug-panel__summary {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.dmx-debug-panel__layout {
  display: grid;
  grid-template-columns: minmax(280px, 32%) minmax(0, 1fr);
  gap: 8px;
  min-height: 0;
  flex: 1 1 auto;
}

.dmx-debug-panel__dest-list {
  min-height: 0;
  overflow: auto;
}

.dmx-debug-panel__details {
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-sm);
  min-height: 0;
  overflow: auto;
}

.dmx-debug-panel__active-item {
  background: color-mix(in srgb, var(--sdmx-color-selected), transparent 45%);
}

.dmx-debug-panel__table {
  width: 100%;
}

.dmx-debug-panel__hex-preview {
  margin: 0;
  padding: 8px;
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-sm);
  background: var(--sdmx-color-bg-inset);
  color: var(--sdmx-color-text);
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.3;
}

@media (max-width: 980px) {
  .dmx-debug-panel__layout {
    grid-template-columns: 1fr;
  }
}
</style>
