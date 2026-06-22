<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAudioStore } from 'src/stores/audio';
import { useShowStore } from 'src/stores/show';

const audioStore = useAudioStore();
const showStore = useShowStore();
const emit = defineEmits(['close']);

const audioLatencyMs = ref(0);

const audioBandLabels = ['Sub', 'Low', 'Mid', 'High'];

const audioDeviceOptions = computed(() =>
  audioStore.devices.map((device, index) => ({
    label: device.label || `Audio Input ${index + 1}`,
    value: device.deviceId,
  }))
);

const audioMeterRows = computed(() => [
  { label: 'RMS', value: audioStore.levels.rms },
  { label: 'Peak', value: audioStore.levels.peak },
  ...audioBandLabels.map((label, index) => ({
    label,
    value: audioStore.levels.bands[index] ?? 0,
  })),
]);

onMounted(() => {
  audioLatencyMs.value = showStore.document.audio?.latencyMs ?? 0;
  void audioStore.refreshDevices();
});

function saveSettings() {
  showStore.updateDocument((doc) => {
    doc.audio = {
      ...doc.audio,
      enabled: doc.audio?.enabled,
      inputDeviceId: doc.audio?.inputDeviceId,
      bpm: doc.audio?.bpm,
      latencyMs: Math.max(0, audioLatencyMs.value),
    };
  });
  emit('close');
}
</script>

<template>
  <q-card class="sdmx-dialog-card sdmx-dialog-card--narrow">
    <q-card-section class="row items-center q-pb-md sdmx-border-bottom">
      <div class="text-h6 font-weight-bold">Audio Analysis</div>
      <q-space />
      <q-btn icon="close" flat round dense v-close-popup @click="emit('close')" />
    </q-card-section>

    <q-card-section class="q-gutter-y-md dialog-body">
      <q-banner
        v-if="!audioStore.isSupported"
        dense
        class="bg-negative text-white rounded-borders"
      >
        <q-icon name="warning" class="q-mr-xs" />
        Audio capture is not supported in this runtime.
      </q-banner>

      <q-toggle
        v-model="audioStore.enabled"
        color="primary"
        dark
        label="Enable audio analysis"
        :disable="!audioStore.isSupported"
      />

      <div class="row items-center q-col-gutter-sm">
        <div class="col">
          <q-select
            v-model="audioStore.selectedDeviceId"
            :options="audioDeviceOptions"
            label="Audio input device"
            dark
            filled
            dense
            emit-value
            map-options
            clearable
            :disable="!audioStore.isSupported || audioDeviceOptions.length === 0"
            no-options-label="No audio input devices detected"
          />
        </div>
        <div class="col-auto">
          <q-btn
            icon="refresh"
            color="primary"
            flat
            round
            dense
            :disable="!audioStore.isSupported"
            @click="audioStore.refreshDevices"
          >
            <q-tooltip>Refresh audio devices</q-tooltip>
          </q-btn>
        </div>
      </div>

      <div>
        <div class="row items-center justify-between q-mb-xs">
          <span class="text-subtitle2 text-grey-4">Input gain</span>
          <span class="text-caption text-grey-5">{{ audioStore.gain.toFixed(2) }}x</span>
        </div>
        <q-slider
          v-model="audioStore.gain"
          :min="0"
          :max="4"
          :step="0.05"
          color="primary"
          :disable="!audioStore.isSupported"
          label
        />
      </div>

      <q-input
        v-model.number="audioLatencyMs"
        type="number"
        label="Output latency (ms)"
        dark
        filled
        dense
        min="0"
        :disable="!audioStore.isSupported"
        hint="Advance reactive mapping response for fixture/output lag"
      />

      <div class="audio-meter-grid q-gutter-y-xs">
        <div
          v-for="meter in audioMeterRows"
          :key="meter.label"
          class="audio-meter-row"
        >
          <span class="audio-meter-label">{{ meter.label }}</span>
          <q-linear-progress
            rounded
            size="9px"
            color="primary"
            track-color="grey-8"
            :value="meter.value"
          />
        </div>
      </div>

      <q-chip
        dense
        class="text-weight-medium"
        :color="audioStore.beatPulse ? 'positive' : 'grey-8'"
        :text-color="audioStore.beatPulse ? 'black' : 'grey-4'"
      >
        <q-icon name="graphic_eq" size="16px" class="q-mr-xs" />
        Beat pulse {{ audioStore.beatPulse ? 'detected' : 'idle' }}
      </q-chip>

      <div class="text-caption text-grey-5">
        Used for audio-reactive mappings and live meters. LTC timecode uses a separate input configured under Output &amp; Sync.
      </div>
    </q-card-section>

    <q-card-actions align="right" class="q-pa-md sdmx-border-top">
      <q-btn label="Cancel" flat color="grey-5" v-close-popup @click="emit('close')" />
      <q-btn label="Save" color="primary" class="q-px-md" @click="saveSettings" />
    </q-card-actions>
  </q-card>
</template>

<style scoped>
.dialog-body {
  max-height: min(520px, 70vh);
  overflow-y: auto;
}

.audio-meter-grid {
  display: grid;
  gap: 6px;
}

.audio-meter-row {
  display: grid;
  grid-template-columns: 54px 1fr;
  align-items: center;
  gap: 10px;
}

.audio-meter-label {
  font-size: 12px;
  color: var(--sdmx-color-text-muted);
}
</style>
