<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { SdmxIconButton } from 'src/components/ui';
import XButton from 'src/components/controls/XButton.vue';
import XCard from 'src/components/controls/XCard.vue';
import XInput from 'src/components/controls/XInput.vue';
import XSelect from 'src/components/controls/XSelect.vue';
import XSlider from 'src/components/controls/XSlider.vue';
import XSwitch from 'src/components/controls/XSwitch.vue';
import { useAudioStore } from 'src/stores/audio';
import { useShowStore } from 'src/stores/show';

const audioStore = useAudioStore();
const showStore = useShowStore();

const audioLatencyMs = ref(0);
const audioBandLabels = ['Sub', 'Low', 'Mid', 'High'];

const audioDeviceOptions = computed(() => [
  { label: 'Auto device', value: '__none__' },
  ...audioStore.devices.map((device, index) => ({
    label: device.label || `Audio Input ${index + 1}`,
    value: device.deviceId,
  })),
]);

const selectedDeviceValue = computed({
  get: () => audioStore.selectedDeviceId ?? '__none__',
  set: (value: string) => {
    audioStore.selectedDeviceId = value === '__none__' ? null : value;
  },
});

const audioMeterRows = computed(() => [
  { label: 'RMS', value: audioStore.levels.rms },
  { label: 'Peak', value: audioStore.levels.peak },
  ...audioBandLabels.map((label, index) => ({
    label,
    value: audioStore.levels.bands[index] ?? 0,
  })),
]);

function asNumber(value: string | number, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function applyAudioSettings() {
  showStore.updateDocument((doc) => {
    doc.audio = {
      ...doc.audio,
      enabled: audioStore.enabled,
      inputDeviceId: audioStore.selectedDeviceId ?? undefined,
      latencyMs: Math.max(0, asNumber(audioLatencyMs.value, 0)),
    };
  });
}

onMounted(() => {
  audioLatencyMs.value = showStore.document.audio?.latencyMs ?? 0;
  audioStore.selectedDeviceId = showStore.document.audio?.inputDeviceId ?? null;
  if (showStore.document.audio?.enabled !== undefined) {
    audioStore.enabled = showStore.document.audio.enabled;
  }
  void audioStore.refreshDevices();
});
</script>

<template>
  <XCard title="Audio Analysis">
    <div class="q-gutter-y-md">
      <XSwitch v-model="audioStore.enabled" label="Enable audio analysis" :disable="!audioStore.isSupported" />

      <div class="row items-center q-col-gutter-sm">
        <div class="col">
          <XSelect
            v-model="selectedDeviceValue"
            :options="audioDeviceOptions"
            label="Audio input device"
            :disable="!audioStore.isSupported"
          />
        </div>
        <div class="col-auto">
          <SdmxIconButton icon="refresh" color="primary" info-key="setup.audio.refreshDevices" :disable="!audioStore.isSupported" @click="audioStore.refreshDevices" />
        </div>
      </div>

      <div>
        <div class="row items-center justify-between q-mb-xs">
          <span class="text-subtitle2 text-grey-4">Input gain</span>
          <span class="text-caption text-grey-5">{{ audioStore.gain.toFixed(2) }}x</span>
        </div>
        <XSlider v-model="audioStore.gain" :min="0" :max="4" :step="0.05" :disable="!audioStore.isSupported" />
      </div>

      <XInput :model-value="audioLatencyMs" type="number" label="Output latency (ms)" @update:model-value="(value) => (audioLatencyMs = asNumber(value, 0))" />

      <div class="audio-meter-grid q-gutter-y-xs">
        <div v-for="meter in audioMeterRows" :key="meter.label" class="audio-meter-row">
          <span class="audio-meter-label">{{ meter.label }}</span>
          <q-linear-progress rounded size="9px" color="primary" track-color="grey-8" :value="meter.value" />
        </div>
      </div>

      <q-chip dense class="text-weight-medium" :color="audioStore.beatPulse ? 'positive' : 'grey-8'" :text-color="audioStore.beatPulse ? 'black' : 'grey-4'">
        <q-icon name="graphic_eq" size="16px" class="q-mr-xs" />
        Beat pulse {{ audioStore.beatPulse ? 'detected' : 'idle' }}
      </q-chip>

      <XButton color="primary" label="Apply audio settings" @click="applyAudioSettings" />
    </div>
  </XCard>
</template>

<style scoped lang="scss">
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
