<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import { useIOClient } from 'src/lib/io-client';
import { useShowStore } from 'src/stores/show';
import { useAudioStore } from 'src/stores/audio';
import { useGridNodeOverlayStore } from 'src/stores/gridnode-overlay';
import { useTimecodeStore } from 'src/stores/timecode';
import { useLtcTimecodeStore } from 'src/stores/ltc-timecode';
import type { OutputDestination, TimecodeSource } from '@softdmx/engine';

const socket = useIOClient();
const showStore = useShowStore();
const audioStore = useAudioStore();
const gridNodeOverlay = useGridNodeOverlayStore();
const timecodeStore = useTimecodeStore();
const ltcStore = useLtcTimecodeStore();

const destinations = ref<OutputDestination[]>([]);
const selectedDestId = ref<string | null>(null);
const availablePorts = ref<any[]>([]);
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

const timecodeSourceOptions = [
  { label: 'OSC (/softdmx/timecode/smpte)', value: 'osc' },
  { label: 'LTC (audio input)', value: 'ltc' },
  { label: 'MTC (MIDI quarter-frame)', value: 'mtc' },
];

const ltcChannelOptions = [
  { label: 'Mono', value: 'mono' },
  { label: 'Left', value: 'left' },
  { label: 'Right', value: 'right' },
];

const timecodeLocked = computed(() => {
  if (!timecodeEnabled.value) return false;
  if (timecodeSource.value === 'ltc') return ltcStore.signalLocked;
  if (timecodeStore.lastUpdatedAtMs === null) return false;
  return performance.now() - timecodeStore.lastUpdatedAtMs < 1500;
});

const outputOptions = [
  { label: 'GridNode Overlay', value: 'gridnode' },
  { label: 'Art-Net (UDP)', value: 'artnet' },
  { label: 'sACN / E1.31 (UDP)', value: 'sacn' },
  { label: 'DMX USB Pro (Serial)', value: 'dmx_usb' },
];

const audioDeviceOptions = computed(() =>
  audioStore.devices.map((device, index) => ({
    label: device.label || `Audio Input ${index + 1}`,
    value: device.deviceId,
  }))
);

defineEmits([
  ...useDialogPluginComponent.emits
]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

function loadTimecodeSettings() {
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

function loadSettings() {
  destinations.value = JSON.parse(JSON.stringify(showStore.document.destinations));
  loadTimecodeSettings();
  if (destinations.value.length > 0 && !selectedDestId.value) {
    selectedDestId.value = destinations.value[0]?.id || null;
  }
}

function handleShowState(show: {
  destinations?: OutputDestination[];
  timecode?: {
    enabled?: boolean;
    source?: TimecodeSource;
    fps?: number;
    latencyMs?: number;
    ltcInputDeviceId?: string;
    ltcChannel?: 'left' | 'right' | 'mono';
    ltcGain?: number;
  };
}) {
  if (show?.destinations) {
    destinations.value = JSON.parse(JSON.stringify(show.destinations));
  }
  if (show?.timecode) {
    timecodeEnabled.value = show.timecode.enabled === true;
    timecodeSource.value = show.timecode.source ?? 'osc';
    timecodeFps.value = show.timecode.fps ?? 30;
    timecodeLatencyMs.value = show.timecode.latencyMs ?? 0;
    timecodeGlobalOffsetMs.value = show.timecode.globalOffsetMs ?? 0;
    ltcInputDeviceId.value = show.timecode.ltcInputDeviceId ?? null;
    ltcChannel.value = show.timecode.ltcChannel ?? 'mono';
    ltcGain.value = show.timecode.ltcGain ?? 1;
  }
  if (show?.link) {
    linkOutputLatencyMs.value = show.link.outputLatencyMs ?? 0;
    linkPhaseOffset.value = show.link.phaseOffset ?? 0;
  }
  if (show?.oscSync) {
    oscMediaLatencyMs.value = show.oscSync.mediaLatencyMs ?? 0;
    oscMediaOffsetMs.value = show.oscSync.mediaOffsetMs ?? 0;
  }
}

const selectedDest = computed(() => {
  return destinations.value.find((d) => d.id === selectedDestId.value) || null;
});

function handlePorts(ports: unknown[]) {
  availablePorts.value = ports;
}

onMounted(() => {
  loadSettings();
  socket.on('show:state', handleShowState);
  socket.on('ports:available', handlePorts);
  socket.emit('ports:list');
  void audioStore.refreshDevices();
});

onBeforeUnmount(() => {
  socket.off('show:state', handleShowState);
  socket.off('ports:available', handlePorts);
});

function refreshPorts() {
  socket.emit('ports:list');
}

function addDestination() {
  const newId = `dest-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const newDest: OutputDestination = {
    id: newId,
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
  destinations.value.push(newDest);
  selectedDestId.value = newId;
}

function deleteDestination(id: string) {
  if (destinations.value.length <= 1) {
    alert('You must keep at least one output destination.');
    return;
  }
  const index = destinations.value.findIndex((d) => d.id === id);
  if (index !== -1) {
    destinations.value.splice(index, 1);
    if (selectedDestId.value === id) {
      selectedDestId.value = destinations.value[0]?.id || null;
    }
  }
}

function saveSettings() {
  showStore.updateDocument((doc) => {
    doc.destinations = JSON.parse(JSON.stringify(destinations.value));
    doc.timecode = {
      enabled: timecodeEnabled.value,
      fps: Math.max(1, timecodeFps.value),
      source: timecodeSource.value,
      ltcInputDeviceId: ltcInputDeviceId.value ?? undefined,
      ltcChannel: ltcChannel.value,
      ltcGain: Math.max(0, ltcGain.value),
      latencyMs: Math.max(0, timecodeLatencyMs.value),
      globalOffsetMs: timecodeGlobalOffsetMs.value,
    };
    doc.link = {
      outputLatencyMs: Math.max(0, linkOutputLatencyMs.value),
      phaseOffset: linkPhaseOffset.value,
    };
    doc.oscSync = {
      mediaLatencyMs: Math.max(0, oscMediaLatencyMs.value),
      mediaOffsetMs: oscMediaOffsetMs.value,
    };
  });
  socket.emit('show:state', showStore.document);
  onDialogOK();
}
</script>

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="sdmx-dialog-card settings-card q-dialog-plugin">
      <q-card-section class="row items-center q-pb-md sdmx-border-bottom">
        <div class="text-h6 font-weight-bold">Output &amp; Sync</div>
        <q-space />
        <q-btn icon="close" flat round dense @click="onDialogCancel" />
      </q-card-section>

    <q-card-section class="row q-col-gutter-md q-pt-md settings-body">
      <div class="col-4 sdmx-border-right destinations-column">
        <div class="row justify-between items-center q-mb-sm">
          <span class="text-subtitle2 text-grey-4">Destinations</span>
          <q-btn icon="add" color="primary" dense round size="sm" @click="addDestination">
            <q-tooltip>Add Destination</q-tooltip>
          </q-btn>
        </div>

        <q-scroll-area class="destinations-scroll">
          <q-list class="dest-list">
            <q-item
              v-for="dest in destinations"
              :key="dest.id"
              clickable
              :active="selectedDestId === dest.id"
              active-class="bg-primary-light text-primary"
              @click="selectedDestId = dest.id"
              class="dest-item q-mb-xs"
            >
              <q-item-section>
                <q-item-label class="text-weight-medium text-white">{{ dest.name }}</q-item-label>
                <q-item-label caption class="text-grey-5">{{ dest.type.toUpperCase() }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn
                  icon="delete"
                  color="negative"
                  flat
                  round
                  dense
                  size="sm"
                  @click.stop="deleteDestination(dest.id)"
                  :disable="destinations.length <= 1"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </q-scroll-area>
      </div>

      <div class="col-8 details-column">
        <div v-if="selectedDest" class="q-gutter-y-md q-mb-lg">
          <div class="text-subtitle1 text-primary text-weight-bold">Configure Destination</div>

          <q-input
            v-model="selectedDest.name"
            label="Name"
            dark
            filled
            dense
            placeholder="e.g. Stage Spotlights"
          />

          <q-select
            v-model="selectedDest.type"
            :options="outputOptions"
            label="Output Mode"
            dark
            filled
            dense
            emit-value
            map-options
          />

          <div v-if="selectedDest.type === 'artnet'" class="q-gutter-y-sm">
            <div class="text-subtitle2 text-grey-4">Art-Net UDP Parameters</div>
            <q-input v-model="selectedDest.settings.Host" label="Target IP Address" dark filled dense placeholder="255.255.255.255" />
            <q-input v-model.number="selectedDest.settings.Port" type="number" label="Target UDP Port" dark filled dense />
            <div class="row q-col-gutter-sm">
              <div class="col-4">
                <q-input v-model.number="selectedDest.settings.Universe" type="number" label="Universe (0-15)" dark filled dense min="0" max="15" />
              </div>
              <div class="col-4">
                <q-input v-model.number="selectedDest.settings.Subnet" type="number" label="Subnet (0-15)" dark filled dense min="0" max="15" />
              </div>
              <div class="col-4">
                <q-input v-model.number="selectedDest.settings.Net" type="number" label="Net (0-127)" dark filled dense min="0" max="127" />
              </div>
            </div>
          </div>

          <div v-if="selectedDest.type === 'sacn'" class="q-gutter-y-sm">
            <div class="text-subtitle2 text-grey-4">sACN / E1.31 UDP Parameters</div>
            <q-input v-model="selectedDest.settings.Host" label="Target IP Address" dark filled dense placeholder="239.255.0.1 (multicast) or controller IP" />
            <q-input v-model.number="selectedDest.settings.Port" type="number" label="Target UDP Port" dark filled dense hint="Default is 5568 for E1.31" />
            <q-input v-model.number="selectedDest.settings.Universe" type="number" label="Universe (1-63999)" dark filled dense min="1" max="63999" />
          </div>

          <div v-if="selectedDest.type === 'dmx_usb'" class="q-gutter-y-sm">
            <div class="text-subtitle2 text-grey-4">DMX USB Pro Serial Configuration</div>
            <div class="row items-center q-gutter-x-sm">
              <q-select
                v-model="selectedDest.settings.PortPath"
                :options="availablePorts.map((p) => p.path)"
                label="Select Serial Port"
                dark
                filled
                dense
                class="col"
                no-options-label="No serial ports detected"
              />
              <q-btn icon="refresh" color="primary" flat round dense @click="refreshPorts">
                <q-tooltip>Scan Ports</q-tooltip>
              </q-btn>
            </div>
          </div>

          <div v-if="selectedDest.type === 'gridnode'" class="q-gutter-y-sm">
            <q-banner dense class="bg-indigo-10 text-white rounded-borders">
              <q-icon name="info" class="q-mr-xs" />
              GridNode output stays active for OBS/browser capture at
              <code>/source</code>. The local transparent overlay window is optional.
            </q-banner>
            <q-toggle
              v-if="gridNodeOverlay.isAvailable"
              :model-value="gridNodeOverlay.overlayVisible"
              color="primary"
              dark
              label="Show local GridNode overlay window"
              @update:model-value="gridNodeOverlay.setVisible"
            />
          </div>
        </div>
        <div v-else class="row justify-center items-center text-grey-5 empty-placeholder">
          Select or add a destination configuration to begin.
        </div>

        <q-separator dark spaced class="q-my-md" />

        <div class="q-gutter-y-md">
          <div class="text-subtitle1 text-primary text-weight-bold">Timecode Sync</div>
          <q-toggle v-model="timecodeEnabled" color="primary" dark label="Enable SMPTE timecode sync" />

          <q-select
            v-model="timecodeSource"
            :options="timecodeSourceOptions"
            label="Timecode source"
            dark
            filled
            dense
            emit-value
            map-options
            :disable="!timecodeEnabled"
          />

          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input v-model.number="timecodeFps" type="number" label="FPS" dark filled dense min="1" max="120" :disable="!timecodeEnabled" />
            </div>
            <div class="col-6">
              <q-input
                v-model.number="timecodeLatencyMs"
                type="number"
                label="Latency (ms)"
                dark
                filled
                dense
                min="0"
                :disable="!timecodeEnabled"
                hint="Subtract pipeline delay"
              />
            </div>
          </div>

          <q-input
            v-model.number="timecodeGlobalOffsetMs"
            type="number"
            label="Show offset (ms)"
            dark
            filled
            dense
            :disable="!timecodeEnabled"
            hint="Shift whole show on the clock (+ earlier, − later)"
          />

          <div v-if="timecodeEnabled" class="row items-center q-gutter-sm">
            <q-chip dense :color="timecodeLocked ? 'positive' : 'grey-8'" :text-color="timecodeLocked ? 'black' : 'grey-4'" icon="schedule">
              {{ timecodeStore.smpteLabel }}
            </q-chip>
            <span class="text-caption text-grey-5">
              {{ timecodeSource.toUpperCase() }} · {{ timecodeLocked ? 'locked' : 'waiting' }}
            </span>
          </div>

          <div v-if="timecodeEnabled && timecodeSource === 'osc'" class="text-caption text-grey-5">
            Listen for `/softdmx/timecode/smpte` (seconds float or H,M,S,F) and trigger cue timecode in/out markers.
          </div>

          <div v-if="timecodeEnabled && timecodeSource === 'ltc'" class="q-gutter-y-sm">
            <q-banner v-if="!ltcStore.isSupported && ltcStore.lastError" dense class="bg-negative text-white rounded-borders">
              {{ ltcStore.lastError }}
            </q-banner>
            <div class="row items-center q-col-gutter-sm">
              <div class="col">
                <q-select
                  v-model="ltcInputDeviceId"
                  :options="audioDeviceOptions"
                  label="LTC audio input"
                  dark
                  filled
                  dense
                  emit-value
                  map-options
                  clearable
                  no-options-label="No audio input devices detected"
                />
              </div>
              <div class="col-auto">
                <q-btn icon="refresh" color="primary" flat round dense @click="audioStore.refreshDevices">
                  <q-tooltip>Refresh audio devices</q-tooltip>
                </q-btn>
              </div>
            </div>
            <q-select v-model="ltcChannel" :options="ltcChannelOptions" label="LTC channel" dark filled dense emit-value map-options />
            <div>
              <div class="row items-center justify-between q-mb-xs">
                <span class="text-subtitle2 text-grey-4">LTC input gain</span>
                <span class="text-caption text-grey-5">{{ ltcGain.toFixed(2) }}x</span>
              </div>
              <q-slider v-model="ltcGain" :min="0" :max="4" :step="0.05" color="primary" label />
            </div>
          </div>

          <div v-if="timecodeEnabled && timecodeSource === 'mtc'" class="text-caption text-grey-5">
            Receives MIDI Time Code quarter-frame messages (0xF1) on enabled MIDI inputs. Configure inputs in Bindings.
          </div>
        </div>

        <q-separator dark spaced class="q-my-md" />

        <div class="q-gutter-y-md">
          <div class="text-subtitle1 text-primary text-weight-bold">Ableton Link</div>
          <div class="text-caption text-grey-5">
            Compensates local output delay and aligns Link-synced effects. Enable Link from the live workspace.
          </div>
          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input
                v-model.number="linkOutputLatencyMs"
                type="number"
                label="Output latency (ms)"
                dark
                filled
                dense
                min="0"
                hint="Advance beat phase for fixture lag"
              />
            </div>
            <div class="col-6">
              <q-input
                v-model.number="linkPhaseOffset"
                type="number"
                label="Phase offset (beats)"
                dark
                filled
                dense
                step="0.01"
                hint="Fine musical alignment"
              />
            </div>
          </div>
        </div>

        <q-separator dark spaced class="q-my-md" />

        <div class="q-gutter-y-md">
          <div class="text-subtitle1 text-primary text-weight-bold">OSC Media Transport</div>
          <div class="text-caption text-grey-5">
            Applies to Resolume-style media time (`/time`, `/composition/time`) and SoftDMX media hooks. Direct OSC control bindings stay immediate.
          </div>
          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input
                v-model.number="oscMediaLatencyMs"
                type="number"
                label="Media latency (ms)"
                dark
                filled
                dense
                min="0"
              />
            </div>
            <div class="col-6">
              <q-input
                v-model.number="oscMediaOffsetMs"
                type="number"
                label="Media offset (ms)"
                dark
                filled
                dense
              />
            </div>
          </div>
        </div>
      </div>
    </q-card-section>

      <q-card-actions align="right" class="q-pa-md sdmx-border-top">
        <q-btn label="Cancel" flat color="grey-5" @click="onDialogCancel" />
        <q-btn label="Save" color="primary" class="q-px-md" @click="saveSettings" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.settings-body {
  height: min(480px, 70vh);
  overflow: hidden;
}

.destinations-column {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.destinations-scroll {
  flex: 1 1 auto;
  min-height: 0;
}

.details-column {
  height: 100%;
  overflow-y: auto;
  min-height: 0;
}

.empty-placeholder {
  min-height: 120px;
}

@media (max-width: 720px) {
  .settings-body {
    height: auto;
    max-height: 70vh;
    overflow-y: auto;
  }

  .destinations-column {
    border-right: none !important;
    border-bottom: 1px solid var(--sdmx-color-border);
    max-height: 180px;
  }
}

.dest-item {
  border-radius: var(--sdmx-radius-sm);
  background-color: var(--sdmx-color-bg-inset);
  transition: all 0.2s ease;
}

.dest-item:hover {
  background-color: var(--sdmx-color-hover);
}

.bg-primary-light {
  background-color: var(--sdmx-color-selected) !important;
}
</style>
