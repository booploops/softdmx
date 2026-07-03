<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import type { OutputDestination, TimecodeSource } from '@softdmx/engine';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { SdmxIconButton } from 'src/components/ui';
import XButton from 'src/components/controls/XButton.vue';
import XCard from 'src/components/controls/XCard.vue';
import XInput from 'src/components/controls/XInput.vue';
import XListItem from 'src/components/controls/XListItem.vue';
import XListView from 'src/components/controls/XListView.vue';
import XSelect from 'src/components/controls/XSelect.vue';
import XSlider from 'src/components/controls/XSlider.vue';
import XSwitch from 'src/components/controls/XSwitch.vue';
import { useIOClient } from 'src/lib/io-client';
import { useAudioStore } from 'src/stores/audio';
import { useGridNodeOverlayStore } from 'src/stores/gridnode-overlay';
import { useLtcTimecodeStore } from 'src/stores/ltc-timecode';
import { useShowStore } from 'src/stores/show';
import { useTimecodeStore } from 'src/stores/timecode';

const socket = useIOClient();
const showStore = useShowStore();
const audioStore = useAudioStore();
const gridNodeOverlay = useGridNodeOverlayStore();
const timecodeStore = useTimecodeStore();
const ltcStore = useLtcTimecodeStore();

const destinations = ref<OutputDestination[]>([]);
const selectedDestId = ref<string | null>(null);
const availablePorts = ref<Array<{ path: string }>>([]);

const timecodeEnabled = ref(false);
const timecodeSource = ref<TimecodeSource>('osc');
const timecodeFps = ref(30);
const timecodeLatencyMs = ref(0);
const timecodeGlobalOffsetMs = ref(0);
const linkOutputLatencyMs = ref(0);
const linkPhaseOffset = ref(0);
const oscMediaLatencyMs = ref(0);
const oscMediaOffsetMs = ref(0);
const ltcInputDeviceId = ref<string | null>(null);
const ltcChannel = ref<'left' | 'right' | 'mono'>('mono');
const ltcGain = ref(1);

const outputOptions: { label: string; value: OutputDestination['type'] }[] = [
  { label: 'GridNode Overlay', value: 'gridnode' },
  { label: 'Art-Net (UDP)', value: 'artnet' },
  { label: 'sACN / E1.31 (UDP)', value: 'sacn' },
  { label: 'DMX USB Pro (Serial)', value: 'dmx_usb' },
];

const usbProtocolOptions = [
  { label: 'Enttec DMX USB Pro', value: 'enttec_pro' },
  { label: 'FTDI / OpenDMX (FT232R)', value: 'open_dmx' },
];

const timecodeSourceOptions: { label: string; value: TimecodeSource }[] = [
  { label: 'OSC (/softdmx/timecode/smpte)', value: 'osc' },
  { label: 'LTC (audio input)', value: 'ltc' },
  { label: 'MTC (MIDI quarter-frame)', value: 'mtc' },
];

const ltcChannelOptions = [
  { label: 'Mono', value: 'mono' },
  { label: 'Left', value: 'left' },
  { label: 'Right', value: 'right' },
];

const audioDeviceOptions = computed(() =>
  audioStore.devices.map((device, index) => ({
    label: device.label || `Audio Input ${index + 1}`,
    value: device.deviceId,
  }))
);

const ltcInputSelect = computed({
  get: () => ltcInputDeviceId.value ?? '__none__',
  set: (value: string) => {
    ltcInputDeviceId.value = value === '__none__' ? null : value;
  },
});

const selectedDest = computed(() =>
  destinations.value.find((dest) => dest.id === selectedDestId.value) ?? null
);
const selectedDestActive = computed(() => selectedDest.value as OutputDestination);

const timecodeLocked = computed(() => {
  if (!timecodeEnabled.value) return false;
  if (timecodeSource.value === 'ltc') return ltcStore.signalLocked;
  if (timecodeStore.lastUpdatedAtMs === null) return false;
  return performance.now() - timecodeStore.lastUpdatedAtMs < 1500;
});

function asNumber(value: string | number, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function loadSettings() {
  destinations.value = JSON.parse(JSON.stringify(showStore.document.destinations ?? []));
  selectedDestId.value = destinations.value[0]?.id ?? null;

  const tc = showStore.document.timecode;
  timecodeEnabled.value = tc?.enabled === true;
  timecodeSource.value = tc?.source ?? 'osc';
  timecodeFps.value = tc?.fps ?? 30;
  timecodeLatencyMs.value = tc?.latencyMs ?? 0;
  timecodeGlobalOffsetMs.value = tc?.globalOffsetMs ?? 0;
  ltcInputDeviceId.value = tc?.ltcInputDeviceId ?? null;
  ltcChannel.value = tc?.ltcChannel ?? 'mono';
  ltcGain.value = tc?.ltcGain ?? 1;

  const link = showStore.document.link;
  linkOutputLatencyMs.value = link?.outputLatencyMs ?? 0;
  linkPhaseOffset.value = link?.phaseOffset ?? 0;

  const oscSync = showStore.document.oscSync;
  oscMediaLatencyMs.value = oscSync?.mediaLatencyMs ?? 0;
  oscMediaOffsetMs.value = oscSync?.mediaOffsetMs ?? 0;
}

function addDestination() {
  const id = `dest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const destination: OutputDestination = {
    id,
    name: `New Output ${destinations.value.length + 1}`,
    type: 'gridnode',
    settings: {
      Host: '255.255.255.255',
      Port: 6454,
      Universe: 0,
      Net: 0,
      Subnet: 0,
      PortPath: '',
    },
  };
  destinations.value.push(destination);
  selectedDestId.value = id;
}

function deleteDestination(id: string) {
  if (destinations.value.length <= 1) return;
  const index = destinations.value.findIndex((dest) => dest.id === id);
  if (index < 0) return;
  destinations.value.splice(index, 1);
  if (selectedDestId.value === id) {
    selectedDestId.value = destinations.value[0]?.id ?? null;
  }
}

function ensureDestSettings(dest: OutputDestination) {
  dest.settings = {
    Host: (dest.settings?.Host as string | undefined) ?? '255.255.255.255',
    Port: asNumber((dest.settings?.Port as number | string | undefined) ?? 6454, 6454),
    Universe: asNumber((dest.settings?.Universe as number | string | undefined) ?? 0, 0),
    Net: asNumber((dest.settings?.Net as number | string | undefined) ?? 0, 0),
    Subnet: asNumber((dest.settings?.Subnet as number | string | undefined) ?? 0, 0),
    PortPath: (dest.settings?.PortPath as string | undefined) ?? '',
    UsbProtocol: (dest.settings?.UsbProtocol as 'enttec_pro' | 'open_dmx' | undefined) ?? 'enttec_pro',
  };
}

function applySettings() {
  showStore.updateDocument((doc) => {
    doc.destinations = JSON.parse(JSON.stringify(destinations.value));
    doc.timecode = {
      enabled: timecodeEnabled.value,
      fps: Math.max(1, asNumber(timecodeFps.value, 30)),
      source: timecodeSource.value,
      ltcInputDeviceId: ltcInputDeviceId.value ?? undefined,
      ltcChannel: ltcChannel.value,
      ltcGain: Math.max(0, asNumber(ltcGain.value, 1)),
      latencyMs: Math.max(0, asNumber(timecodeLatencyMs.value, 0)),
      globalOffsetMs: asNumber(timecodeGlobalOffsetMs.value, 0),
    };
    doc.link = {
      outputLatencyMs: Math.max(0, asNumber(linkOutputLatencyMs.value, 0)),
      phaseOffset: asNumber(linkPhaseOffset.value, 0),
    };
    doc.oscSync = {
      mediaLatencyMs: Math.max(0, asNumber(oscMediaLatencyMs.value, 0)),
      mediaOffsetMs: asNumber(oscMediaOffsetMs.value, 0),
    };
  });

  socket.emit('show:state', showStore.document);
}

function refreshPorts() {
  socket.emit('ports:list');
}

function handleShowState() {
  loadSettings();
}

function handlePorts(ports: { path: string }[]) {
  availablePorts.value = ports;
}

onMounted(() => {
  loadSettings();
  socket.on('show:state', handleShowState);
  socket.on('ports:available', handlePorts);
  refreshPorts();
  void audioStore.refreshDevices();
});

onBeforeUnmount(() => {
  socket.off('show:state', handleShowState);
  socket.off('ports:available', handlePorts);
});
</script>

<template>
  <XCard title="Output And Sync" class="settings-card--wide">
    <div class="row q-col-gutter-md">
      <div class="col-12 col-lg-4">
        <div class="row justify-between items-center q-mb-sm">
          <div class="settings-subtitle">Destinations</div>
          <SdmxIconButton icon="plus" color="primary" info-key="setup.settings.addDestination" @click="addDestination" />
        </div>

        <XListView :bordered="false" class="dest-list">
          <XListItem
            v-for="dest in destinations"
            :key="dest.id"
            clickable
            :active="selectedDestId === dest.id"
            @click="selectedDestId = dest.id"
            class="dest-item q-mb-xs"
          >
            <div>
              <div class="text-weight-medium">{{ dest.name }}</div>
              <div class="text-caption text-grey-5">{{ dest.type.toUpperCase() }}</div>
            </div>
            <template #append>
              <XButton
                icon="trash"
                color="danger"
                flat
                size="sm"
                :disable="destinations.length <= 1"
                @click.stop="deleteDestination(dest.id)"
              />
            </template>
          </XListItem>
        </XListView>
      </div>

      <div class="col-12 col-lg-8 q-gutter-y-md">
        <div v-if="selectedDest">
          <div class="settings-subtitle q-mb-sm">Configure Destination</div>
          <div class="q-gutter-y-sm">
            <XInput v-model="selectedDestActive.name" label="Name" />
            <XSelect v-model="selectedDestActive.type" :options="outputOptions" label="Output mode" @update:model-value="ensureDestSettings(selectedDestActive)" />

            <div v-if="selectedDestActive.type === 'artnet'" class="q-gutter-y-sm">
              <XInput :model-value="(selectedDestActive.settings?.Host as string) ?? ''" label="Target IP address" @update:model-value="(value) => { ensureDestSettings(selectedDestActive); selectedDestActive.settings!.Host = value; }" />
              <XInput :model-value="(selectedDestActive.settings?.Port as number) ?? 6454" type="number" label="Target UDP port" @update:model-value="(value) => { ensureDestSettings(selectedDestActive); selectedDestActive.settings!.Port = asNumber(value, 6454); }" />
              <div class="row q-col-gutter-sm">
                <div class="col-4"><XInput :model-value="(selectedDestActive.settings?.Universe as number) ?? 0" type="number" label="Universe" @update:model-value="(value) => { ensureDestSettings(selectedDestActive); selectedDestActive.settings!.Universe = asNumber(value, 0); }" /></div>
                <div class="col-4"><XInput :model-value="(selectedDestActive.settings?.Subnet as number) ?? 0" type="number" label="Subnet" @update:model-value="(value) => { ensureDestSettings(selectedDestActive); selectedDestActive.settings!.Subnet = asNumber(value, 0); }" /></div>
                <div class="col-4"><XInput :model-value="(selectedDestActive.settings?.Net as number) ?? 0" type="number" label="Net" @update:model-value="(value) => { ensureDestSettings(selectedDestActive); selectedDestActive.settings!.Net = asNumber(value, 0); }" /></div>
              </div>
            </div>

            <div v-if="selectedDestActive.type === 'sacn'" class="q-gutter-y-sm">
              <XInput :model-value="(selectedDestActive.settings?.Host as string) ?? ''" label="Target IP address" @update:model-value="(value) => { ensureDestSettings(selectedDestActive); selectedDestActive.settings!.Host = value; }" />
              <XInput :model-value="(selectedDestActive.settings?.Port as number) ?? 5568" type="number" label="Target UDP port" @update:model-value="(value) => { ensureDestSettings(selectedDestActive); selectedDestActive.settings!.Port = asNumber(value, 5568); }" />
              <XInput :model-value="(selectedDestActive.settings?.Universe as number) ?? 1" type="number" label="Universe" @update:model-value="(value) => { ensureDestSettings(selectedDestActive); selectedDestActive.settings!.Universe = asNumber(value, 1); }" />
            </div>

            <div v-if="selectedDestActive.type === 'dmx_usb'" class="q-gutter-y-sm">
              <XSelect
                :model-value="(selectedDestActive.settings?.UsbProtocol as 'enttec_pro' | 'open_dmx' | undefined) ?? 'enttec_pro'"
                :options="usbProtocolOptions"
                label="USB protocol"
                @update:model-value="(value) => { ensureDestSettings(selectedDestActive); selectedDestActive.settings!.UsbProtocol = value as 'enttec_pro' | 'open_dmx'; }"
              />
              <div class="row items-center q-col-gutter-sm">
                <div class="col">
                  <XSelect
                    :model-value="(selectedDestActive.settings?.PortPath as string) ?? ''"
                    :options="availablePorts.map((port) => ({ label: port.path, value: port.path }))"
                    label="Serial port"
                    @update:model-value="(value) => { ensureDestSettings(selectedDestActive); selectedDestActive.settings!.PortPath = value; }"
                  />
                </div>
                <div class="col-auto">
                  <SdmxIconButton icon="refresh" color="primary" info-key="setup.settings.scanPorts" @click="refreshPorts" />
                </div>
              </div>
            </div>

            <div v-if="selectedDestActive.type === 'gridnode'" class="q-gutter-y-sm">
              <q-banner dense class="bg-indigo-10 text-white rounded-borders">
                <XIcon name="info-circle" class="q-mr-xs" />
                GridNode output stays active for OBS/browser capture at <code>/source</code>.
              </q-banner>
              <XSwitch
                v-if="gridNodeOverlay.isAvailable"
                :model-value="gridNodeOverlay.overlayVisible"
                label="Show local GridNode overlay window"
                @update:model-value="gridNodeOverlay.setVisible"
              />
            </div>
          </div>
        </div>

        <div class="settings-subtitle">Timecode Sync</div>
        <XSwitch v-model="timecodeEnabled" label="Enable SMPTE timecode sync" />
        <XSelect v-model="timecodeSource" :options="timecodeSourceOptions" label="Timecode source" :disable="!timecodeEnabled" />

        <div class="row q-col-gutter-sm">
          <div class="col-6">
            <XInput :model-value="timecodeFps" type="number" label="FPS" :disable="!timecodeEnabled" @update:model-value="(value) => (timecodeFps = asNumber(value, 30))" />
          </div>
          <div class="col-6">
            <XInput :model-value="timecodeLatencyMs" type="number" label="Latency (ms)" :disable="!timecodeEnabled" @update:model-value="(value) => (timecodeLatencyMs = asNumber(value, 0))" />
          </div>
        </div>

        <XInput :model-value="timecodeGlobalOffsetMs" type="number" label="Show offset (ms)" :disable="!timecodeEnabled" @update:model-value="(value) => (timecodeGlobalOffsetMs = asNumber(value, 0))" />

        <div v-if="timecodeEnabled" class="text-caption text-grey-5">
          {{ timecodeStore.smpteLabel }} - {{ timecodeSource.toUpperCase() }} - {{ timecodeLocked ? 'locked' : 'waiting' }}
        </div>

        <div v-if="timecodeEnabled && timecodeSource === 'ltc'" class="q-gutter-y-sm">
          <q-banner v-if="!ltcStore.isSupported && ltcStore.lastError" dense class="bg-negative text-white rounded-borders">
            {{ ltcStore.lastError }}
          </q-banner>

          <XSelect
            v-model="ltcInputSelect"
            :options="[{ label: 'Auto device', value: '__none__' }, ...audioDeviceOptions]"
            label="LTC audio input"
          />

          <XSelect v-model="ltcChannel" :options="ltcChannelOptions" label="LTC channel" />

          <div>
            <div class="row items-center justify-between q-mb-xs">
              <span class="text-subtitle2 text-grey-4">LTC input gain</span>
              <span class="text-caption text-grey-5">{{ ltcGain.toFixed(2) }}x</span>
            </div>
            <XSlider v-model="ltcGain" :min="0" :max="4" :step="0.05" />
          </div>
        </div>

        <div class="settings-subtitle">Ableton Link</div>
        <div class="row q-col-gutter-sm">
          <div class="col-6"><XInput :model-value="linkOutputLatencyMs" type="number" label="Output latency (ms)" @update:model-value="(value) => (linkOutputLatencyMs = asNumber(value, 0))" /></div>
          <div class="col-6"><XInput :model-value="linkPhaseOffset" type="number" label="Phase offset (beats)" @update:model-value="(value) => (linkPhaseOffset = asNumber(value, 0))" /></div>
        </div>

        <div class="settings-subtitle">OSC Media Transport</div>
        <div class="row q-col-gutter-sm">
          <div class="col-6"><XInput :model-value="oscMediaLatencyMs" type="number" label="Media latency (ms)" @update:model-value="(value) => (oscMediaLatencyMs = asNumber(value, 0))" /></div>
          <div class="col-6"><XInput :model-value="oscMediaOffsetMs" type="number" label="Media offset (ms)" @update:model-value="(value) => (oscMediaOffsetMs = asNumber(value, 0))" /></div>
        </div>

        <div class="row q-gutter-sm q-pt-sm">
          <XButton color="primary" label="Apply output and sync" @click="applySettings" />
        </div>
      </div>
    </div>
  </XCard>
</template>

<style scoped lang="scss">
.settings-subtitle {
  font-size: 12px;
  color: var(--sdmx-color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 700;
}

.dest-list {
  max-height: 360px;
  overflow-y: auto;
}

.dest-item {
  border-radius: var(--sdmx-radius-sm);
  background-color: var(--sdmx-color-bg-inset);
}
</style>
