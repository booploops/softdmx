<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import type { TimecodeSource } from '@softdmx/engine';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import XButton from 'src/components/controls/XButton.vue';
import XCard from 'src/components/controls/XCard.vue';
import XInput from 'src/components/controls/XInput.vue';
import XSelect from 'src/components/controls/XSelect.vue';
import XSlider from 'src/components/controls/XSlider.vue';
import XSwitch from 'src/components/controls/XSwitch.vue';
import { useIOClient } from 'src/lib/io-client';
import { useAudioStore } from 'src/stores/audio';
import { useLtcTimecodeStore } from 'src/stores/ltc-timecode';
import { useShowStore } from 'src/stores/show';
import { useTimecodeStore } from 'src/stores/timecode';

const socket = useIOClient();
const showStore = useShowStore();
const audioStore = useAudioStore();
const timecodeStore = useTimecodeStore();
const ltcStore = useLtcTimecodeStore();

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

function applySettings() {
  showStore.updateDocument((doc) => {
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

function handleShowState() {
  loadSettings();
}

onMounted(() => {
  loadSettings();
  socket.on('show:state', handleShowState);
  void audioStore.refreshDevices();
});

onBeforeUnmount(() => {
  socket.off('show:state', handleShowState);
});
</script>

<template>
  <XCard title="Sync" class="settings-card--wide">
    <div class="q-gutter-y-md">
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
        <XButton color="primary" label="Apply sync settings" @click="applySettings" />
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
</style>
