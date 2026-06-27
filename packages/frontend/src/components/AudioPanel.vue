<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { ShowAudioMapping } from '@softdmx/engine';
import { computed, onMounted, reactive, ref } from 'vue';
import { useAudioStore } from 'src/stores/audio';
import { useDMXStore } from 'src/stores/dmx';
import { useOutputEngineStore } from 'src/stores/output-playback';
import { useShowStore } from 'src/stores/show';
import { SdmxEmptyState, SdmxIconButton } from 'src/components/ui';

type MappingTargetMode = 'channelPath' | 'groupAttr' | 'fixtureAttr';
type MappingSourceForm = 'rms' | 'peak' | 'beat' | 'sub' | 'low' | 'mid' | 'high';

type MappingForm = {
  id: string | null;
  enabled: boolean;
  source: MappingSourceForm;
  targetMode: MappingTargetMode;
  targetPath: string;
  targetGroup: string;
  targetFixture: string;
  targetAttribute: string;
  min: number;
  max: number;
  gain: number;
  offset: number;
  invert: boolean;
  attackMs: number;
  releaseMs: number;
};

const showStore = useShowStore();
const audioStore = useAudioStore();
const dmxStore = useDMXStore();
const outputEngine = useOutputEngineStore();

const audioMappings = computed(() => showStore.document.audioMappings ?? []);
const groups = computed(() => showStore.document.groups);
const fixtures = computed(() => showStore.document.fixtures);

const audioLatencyMs = ref(0);
const showMappingDialog = ref(false);
const editingMappingId = ref<string | null>(null);

const SOURCE_OPTIONS: Array<{ label: string; value: MappingSourceForm }> = [
  { label: 'RMS', value: 'rms' },
  { label: 'Peak', value: 'peak' },
  { label: 'Beat Pulse', value: 'beat' },
  { label: 'Band: Sub', value: 'sub' },
  { label: 'Band: Low', value: 'low' },
  { label: 'Band: Mid', value: 'mid' },
  { label: 'Band: High', value: 'high' },
];

const ATTRIBUTE_OPTIONS = ['intensity', 'dimmer', 'strobe', 'pan', 'tilt', 'red', 'green', 'blue'];

const mappingForm = reactive<MappingForm>({
  id: null,
  enabled: true,
  source: 'rms',
  targetMode: 'fixtureAttr',
  targetPath: '',
  targetGroup: '',
  targetFixture: '',
  targetAttribute: 'intensity',
  min: 0,
  max: 255,
  gain: 1,
  offset: 0,
  invert: false,
  attackMs: 20,
  releaseMs: 140,
});

const channelPathOptions = computed(() =>
  dmxStore.baseChannels.map((channel) => ({
    label: `${channel.path} (${channel.attributeType ?? 'generic'})`,
    value: channel.path,
  }))
);

const groupOptions = computed(() =>
  groups.value.map((group) => ({
    label: group.name,
    value: group.name,
  }))
);

const fixtureOptions = computed(() =>
  fixtures.value.map((fixture) => ({
    label: fixture.name,
    value: fixture.name,
  }))
);

const audioDeviceOptions = computed(() =>
  audioStore.devices.map((device, index) => ({
    label: device.label || `Audio Input ${index + 1}`,
    value: device.deviceId,
  }))
);

const audioBandLabels = ['Sub', 'Low', 'Mid', 'High'];
const audioMeterRows = computed(() => [
  { label: 'RMS', value: audioStore.levels.rms },
  { label: 'Peak', value: audioStore.levels.peak },
  ...audioBandLabels.map((label, index) => ({
    label,
    value: audioStore.levels.bands[index] ?? 0,
  })),
]);

const meterRows = computed(() =>
  audioMappings.value.map((mapping) => {
    const input = getSourceLevel(mappingToFormSource(mapping));
    const min = Number.isFinite(mapping.min as number) ? (mapping.min as number) : 0;
    const max = Number.isFinite(mapping.max as number) ? (mapping.max as number) : 255;
    const gain = Number.isFinite(mapping.gain as number) ? (mapping.gain as number) : 1;
    const offset = Number.isFinite(mapping.offset as number) ? (mapping.offset as number) : 0;
    const shaped = Math.max(0, Math.min(1, input * gain + offset));
    const mapped = mapping.invert ? 1 - shaped : shaped;
    const output = Math.round(min + (max - min) * mapped);
    return {
      id: mapping.id,
      input: mapped,
      output,
    };
  })
);

const isFormValid = computed(() => {
  if (mappingForm.max < mappingForm.min) return false;
  if (mappingForm.targetMode === 'channelPath') return Boolean(mappingForm.targetPath);
  if (mappingForm.targetMode === 'groupAttr') return Boolean(mappingForm.targetGroup && mappingForm.targetAttribute);
  return Boolean(mappingForm.targetFixture && mappingForm.targetAttribute);
});

function createMappingId() {
  return `am-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getSourceLevel(source: MappingSourceForm) {
  switch (source) {
    case 'sub':
      return audioStore.levels.bands[0] ?? 0;
    case 'low':
      return audioStore.levels.bands[1] ?? 0;
    case 'mid':
      return audioStore.levels.bands[2] ?? 0;
    case 'high':
      return audioStore.levels.bands[3] ?? 0;
    case 'peak':
      return audioStore.levels.peak;
    case 'beat':
      return audioStore.beatPulse ? 1 : 0;
    case 'rms':
    default:
      return audioStore.levels.rms;
  }
}

function mappingToFormSource(mapping: ShowAudioMapping): MappingSourceForm {
  if (mapping.source === 'peak') return 'peak';
  if (mapping.source === 'beat') return 'beat';
  if (mapping.source === 'band') {
    switch (mapping.bandIndex ?? 1) {
      case 0:
        return 'sub';
      case 1:
        return 'low';
      case 2:
        return 'mid';
      case 3:
        return 'high';
      default:
        return 'low';
    }
  }
  return 'rms';
}

function formSourceToMapping(source: MappingSourceForm): Pick<ShowAudioMapping, 'source' | 'bandIndex'> {
  switch (source) {
    case 'sub':
      return { source: 'band', bandIndex: 0 };
    case 'low':
      return { source: 'band', bandIndex: 1 };
    case 'mid':
      return { source: 'band', bandIndex: 2 };
    case 'high':
      return { source: 'band', bandIndex: 3 };
    case 'peak':
      return { source: 'peak' };
    case 'beat':
      return { source: 'beat' };
    case 'rms':
    default:
      return { source: 'rms' };
  }
}

function resolveChannelPathTarget(path: string): { fixtureName: string; attribute: string } | null {
  if (!path.startsWith('show://')) return null;
  const withoutPrefix = path.slice('show://'.length);
  const splitAt = withoutPrefix.lastIndexOf('/');
  if (splitAt < 0) return null;
  const fixtureName = withoutPrefix.slice(0, splitAt);
  const channelRaw = withoutPrefix.slice(splitAt + 1);
  const channelIndex = Number.parseInt(channelRaw, 10);
  if (!fixtureName || Number.isNaN(channelIndex) || channelIndex <= 0) return null;
  const mapped = dmxStore.showfileFixturesMapped.find((fixture) => fixture.fixtureName === fixtureName);
  const channel = mapped?.def.channels[channelIndex - 1];
  if (!channel) return null;
  return { fixtureName, attribute: channel.name };
}

function resetForm() {
  mappingForm.id = null;
  mappingForm.enabled = true;
  mappingForm.source = 'rms';
  mappingForm.targetMode = 'fixtureAttr';
  mappingForm.targetPath = channelPathOptions.value[0]?.value ?? '';
  mappingForm.targetGroup = groupOptions.value[0]?.value ?? '';
  mappingForm.targetFixture = fixtureOptions.value[0]?.value ?? '';
  mappingForm.targetAttribute = 'intensity';
  mappingForm.min = 0;
  mappingForm.max = 255;
  mappingForm.gain = 1;
  mappingForm.offset = 0;
  mappingForm.invert = false;
  mappingForm.attackMs = 20;
  mappingForm.releaseMs = 140;
}

function openCreateMappingDialog() {
  editingMappingId.value = null;
  resetForm();
  showMappingDialog.value = true;
}

function openEditMappingDialog(mapping: ShowAudioMapping) {
  editingMappingId.value = mapping.id;
  mappingForm.id = mapping.id;
  mappingForm.enabled = mapping.enabled ?? true;
  mappingForm.source = mappingToFormSource(mapping);
  mappingForm.min = mapping.min ?? 0;
  mappingForm.max = mapping.max ?? 255;
  mappingForm.gain = mapping.gain ?? 1;
  mappingForm.offset = mapping.offset ?? 0;
  mappingForm.invert = mapping.invert ?? false;
  mappingForm.attackMs = mapping.attackMs ?? 20;
  mappingForm.releaseMs = mapping.releaseMs ?? 140;

  if (mapping.targetType === 'group') {
    mappingForm.targetMode = 'groupAttr';
    mappingForm.targetGroup = mapping.targetId;
    mappingForm.targetAttribute = mapping.attribute ?? 'intensity';
  } else {
    const fixtureMatch = fixtureOptions.value.some((option) => option.value === mapping.targetId);
    mappingForm.targetMode = fixtureMatch ? 'fixtureAttr' : 'channelPath';
    mappingForm.targetFixture = fixtureMatch ? mapping.targetId : fixtureOptions.value[0]?.value ?? '';
    mappingForm.targetPath = fixtureMatch ? '' : mapping.targetId;
    mappingForm.targetAttribute = mapping.attribute ?? 'intensity';
  }

  showMappingDialog.value = true;
}

function saveMapping() {
  if (!isFormValid.value) return;
  const sourceFields = formSourceToMapping(mappingForm.source);
  const nextMapping: ShowAudioMapping = {
    id: mappingForm.id ?? createMappingId(),
    source: sourceFields.source,
    bandIndex: sourceFields.bandIndex,
    targetType: mappingForm.targetMode === 'groupAttr' ? 'group' : 'fixture',
    targetId:
      mappingForm.targetMode === 'groupAttr'
        ? mappingForm.targetGroup
        : mappingForm.targetMode === 'fixtureAttr'
          ? mappingForm.targetFixture
          : mappingForm.targetPath,
    attribute: mappingForm.targetAttribute,
    gain: mappingForm.gain,
    offset: mappingForm.offset,
    invert: mappingForm.invert,
    enabled: mappingForm.enabled,
    min: mappingForm.min,
    max: mappingForm.max,
    attackMs: mappingForm.attackMs,
    releaseMs: mappingForm.releaseMs,
  };

  if (mappingForm.targetMode === 'channelPath') {
    const resolved = resolveChannelPathTarget(mappingForm.targetPath);
    if (!resolved) return;
    nextMapping.targetType = 'fixture';
    nextMapping.targetId = resolved.fixtureName;
    nextMapping.attribute = resolved.attribute;
  }

  showStore.updateDocument((doc) => {
    doc.audioMappings = doc.audioMappings ?? [];
    const idx = doc.audioMappings.findIndex((mapping) => mapping.id === nextMapping.id);
    if (idx >= 0) {
      doc.audioMappings[idx] = nextMapping;
    } else {
      doc.audioMappings.push(nextMapping);
    }
  });
  showMappingDialog.value = false;
  outputEngine.requestMerge();
}

function removeMapping(mappingId: string) {
  showStore.updateDocument((doc) => {
    doc.audioMappings = (doc.audioMappings ?? []).filter((mapping) => mapping.id !== mappingId);
  });
  outputEngine.requestMerge();
}

function toggleMapping(mappingId: string, enabled: boolean) {
  showStore.updateDocument((doc) => {
    const mapping = (doc.audioMappings ?? []).find((item) => item.id === mappingId);
    if (mapping) mapping.enabled = enabled;
  });
  outputEngine.requestMerge();
}

function describeTarget(mapping: ShowAudioMapping) {
  if (mapping.targetType === 'group') {
    return `${mapping.targetId}.${mapping.attribute ?? 'intensity'}`;
  }
  return `${mapping.targetId}.${mapping.attribute ?? 'intensity'}`;
}

function setAudioEnabled(enabled: boolean) {
  audioStore.enabled = enabled;
  showStore.updateDocument((doc) => {
    doc.audio = {
      ...doc.audio,
      enabled,
      inputDeviceId: audioStore.selectedDeviceId ?? doc.audio?.inputDeviceId,
      latencyMs: doc.audio?.latencyMs ?? 0,
    };
  });
  outputEngine.requestMerge();
}

function setInputDevice(deviceId: string | null) {
  audioStore.selectedDeviceId = deviceId;
  showStore.updateDocument((doc) => {
    doc.audio = {
      ...doc.audio,
      enabled: doc.audio?.enabled ?? audioStore.enabled,
      inputDeviceId: deviceId ?? undefined,
      latencyMs: doc.audio?.latencyMs ?? 0,
    };
  });
}

function saveLatency() {
  showStore.updateDocument((doc) => {
    doc.audio = {
      ...doc.audio,
      enabled: doc.audio?.enabled ?? audioStore.enabled,
      inputDeviceId: audioStore.selectedDeviceId ?? doc.audio?.inputDeviceId,
      latencyMs: Math.max(0, audioLatencyMs.value),
    };
  });
}

function applyTemplate(template: 'kickDimmer' | 'bassColorPulse' | 'beatStrobe') {
  const group = groups.value[0]?.name;
  const fixture = fixtures.value[0]?.name;
  if (!group && !fixture) return;

  const baseTarget =
    group !== undefined
      ? { targetType: 'group' as const, targetId: group }
      : { targetType: 'fixture' as const, targetId: fixture! };

  const templateMapping: ShowAudioMapping =
    template === 'kickDimmer'
      ? {
          id: createMappingId(),
          source: 'beat',
          ...baseTarget,
          attribute: 'intensity',
          enabled: true,
          gain: 1,
          offset: 0,
          invert: false,
          min: 0,
          max: 255,
          attackMs: 0,
          releaseMs: 120,
        }
      : template === 'bassColorPulse'
        ? {
            id: createMappingId(),
            source: 'band',
            bandIndex: 1,
            ...baseTarget,
            attribute: 'blue',
            enabled: true,
            gain: 1.15,
            offset: 0,
            invert: false,
            min: 0,
            max: 255,
            attackMs: 40,
            releaseMs: 220,
          }
        : {
            id: createMappingId(),
            source: 'beat',
            ...baseTarget,
            attribute: 'strobe',
            enabled: true,
            gain: 1,
            offset: 0,
            invert: false,
            min: 0,
            max: 255,
            attackMs: 0,
            releaseMs: 80,
          };

  showStore.updateDocument((doc) => {
    doc.audioMappings = doc.audioMappings ?? [];
    doc.audioMappings.push(templateMapping);
  });
  outputEngine.requestMerge();
}

onMounted(() => {
  audioLatencyMs.value = showStore.document.audio?.latencyMs ?? 0;
  if (showStore.document.audio?.inputDeviceId) {
    audioStore.selectedDeviceId = showStore.document.audio.inputDeviceId;
  }
  if (showStore.document.audio?.enabled !== undefined) {
    audioStore.enabled = showStore.document.audio.enabled;
  }
  void audioStore.refreshDevices();
});
</script>

<template>
  <div class="audio-panel q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h6">Audio</div>
      <q-space />
      <q-chip
        dense
        :color="audioStore.enabled ? 'positive' : 'grey-7'"
        :text-color="audioStore.enabled ? 'black' : 'grey-3'"
      >
        Analysis {{ audioStore.enabled ? 'On' : 'Off' }}
      </q-chip>
    </div>

    <q-card flat bordered class="q-pa-md q-mb-md">
      <div class="row q-col-gutter-md">
        <div class="col-12 col-md-6">
          <q-banner
            v-if="!audioStore.isSupported"
            dense
            class="bg-negative text-white rounded-borders q-mb-sm"
          >
            <q-icon name="warning" class="q-mr-xs" />
            Audio capture is not supported in this runtime.
          </q-banner>

          <q-toggle
            :model-value="audioStore.enabled"
            color="primary"
            label="Enable audio analysis"
            :disable="!audioStore.isSupported"
            @update:model-value="(value) => setAudioEnabled(Boolean(value))"
          />

          <div class="row items-center q-col-gutter-sm q-mt-sm">
            <div class="col">
              <q-select
                :model-value="audioStore.selectedDeviceId"
                :options="audioDeviceOptions"
                label="Audio input device"
                filled
                dense
                emit-value
                map-options
                clearable
                :disable="!audioStore.isSupported || audioDeviceOptions.length === 0"
                no-options-label="No audio input devices detected"
                @update:model-value="(value) => setInputDevice((value as string | null) ?? null)"
              />
            </div>
            <div class="col-auto">
              <SdmxIconButton
                icon="refresh"
                color="primary"
                info-key="setup.audio.refreshDevices"
                :disable="!audioStore.isSupported"
                @click="audioStore.refreshDevices"
              />
            </div>
          </div>

          <div class="q-mt-sm">
            <div class="row items-center justify-between q-mb-xs">
              <span class="text-subtitle2 text-grey-5">Input gain</span>
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
            dense
            min="0"
            hint="Advance reactive mapping response for fixture/output lag"
            @update:model-value="saveLatency"
          />
        </div>

        <div class="col-12 col-md-6">
          <div class="audio-meter-grid q-gutter-y-xs">
            <div v-for="meter in audioMeterRows" :key="meter.label" class="audio-meter-row">
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
            class="text-weight-medium q-mt-md"
            :color="audioStore.beatPulse ? 'positive' : 'grey-8'"
            :text-color="audioStore.beatPulse ? 'black' : 'grey-4'"
          >
            <q-icon name="graphic_eq" size="16px" class="q-mr-xs" />
            Beat pulse {{ audioStore.beatPulse ? 'detected' : 'idle' }}
          </q-chip>
        </div>
      </div>
    </q-card>

    <div class="row items-center q-mb-sm">
      <div class="text-subtitle1">Audio Mappings</div>
      <q-space />
      <q-btn
        dense
        flat
        icon="add"
        label="Add Mapping"
        @click="openCreateMappingDialog"
      />
    </div>

    <div class="row items-center q-gutter-sm q-mb-sm">
      <span class="text-caption text-grey-5">Templates:</span>
      <q-btn dense flat label="Kick -> Dimmer" @click="applyTemplate('kickDimmer')" />
      <q-btn dense flat label="Bass -> Color Pulse" @click="applyTemplate('bassColorPulse')" />
      <q-btn dense flat label="Beat -> Strobe" @click="applyTemplate('beatStrobe')" />
    </div>

    <q-list v-if="audioMappings.length" bordered class="rounded-borders">
      <q-item v-for="mapping in audioMappings" :key="mapping.id">
        <q-item-section>
          <q-item-label>{{ describeTarget(mapping) }}</q-item-label>
          <q-item-label caption>
            {{ mappingToFormSource(mapping).toUpperCase() }} · {{ mapping.min ?? 0 }}-{{ mapping.max ?? 255 }}
            · gain {{ (mapping.gain ?? 1).toFixed(2) }} · offset {{ (mapping.offset ?? 0).toFixed(2) }}
            · {{ mapping.invert ? 'inverted' : 'normal' }} · atk {{ mapping.attackMs ?? 20 }}ms · rel {{ mapping.releaseMs ?? 140 }}ms
          </q-item-label>
          <div class="mapping-meter q-mt-xs">
            <q-linear-progress
              rounded
              size="8px"
              color="primary"
              track-color="grey-8"
              :value="meterRows.find((row) => row.id === mapping.id)?.input ?? 0"
            />
            <span class="mapping-meter-value">{{ meterRows.find((row) => row.id === mapping.id)?.output ?? 0 }}</span>
          </div>
        </q-item-section>
        <q-item-section side class="row no-wrap items-center q-gutter-xs">
          <q-toggle
            :model-value="mapping.enabled ?? true"
            @update:model-value="(value) => toggleMapping(mapping.id, Boolean(value))"
          />
          <q-btn dense flat round icon="edit" @click="openEditMappingDialog(mapping)" />
          <q-btn dense flat round icon="delete" color="negative" @click="removeMapping(mapping.id)" />
        </q-item-section>
      </q-item>
    </q-list>
    <SdmxEmptyState
      v-else
      icon="graphic_eq"
      title="No audio mappings configured"
      description="Add a mapping or apply a template to begin reactive control."
    />

    <q-dialog v-model="showMappingDialog">
      <q-card class="mapping-dialog">
        <q-card-section>
          <div class="text-h6">{{ editingMappingId ? 'Edit' : 'Add' }} Audio Mapping</div>
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <q-toggle v-model="mappingForm.enabled" label="Enabled" color="primary" />
          <q-toggle v-model="mappingForm.invert" label="Invert source value" color="primary" />

          <q-select
            v-model="mappingForm.source"
            :options="SOURCE_OPTIONS"
            emit-value
            map-options
            label="Source"
          />

          <q-btn-toggle
            v-model="mappingForm.targetMode"
            unelevated
            spread
            toggle-color="primary"
            :options="[
              { label: 'Fixture + Attr', value: 'fixtureAttr' },
              { label: 'Group + Attr', value: 'groupAttr' },
              { label: 'Channel Path', value: 'channelPath' },
            ]"
          />

          <div v-if="mappingForm.targetMode === 'fixtureAttr'" class="row q-col-gutter-sm">
            <div class="col-7">
              <q-select
                v-model="mappingForm.targetFixture"
                :options="fixtureOptions"
                emit-value
                map-options
                label="Target fixture"
                use-input
                fill-input
              />
            </div>
            <div class="col-5">
              <q-select
                v-model="mappingForm.targetAttribute"
                :options="ATTRIBUTE_OPTIONS"
                label="Attribute"
              />
            </div>
          </div>

          <div v-else-if="mappingForm.targetMode === 'groupAttr'" class="row q-col-gutter-sm">
            <div class="col-7">
              <q-select
                v-model="mappingForm.targetGroup"
                :options="groupOptions"
                emit-value
                map-options
                label="Target group"
                use-input
                fill-input
              />
            </div>
            <div class="col-5">
              <q-select
                v-model="mappingForm.targetAttribute"
                :options="ATTRIBUTE_OPTIONS"
                label="Attribute"
              />
            </div>
          </div>

          <q-select
            v-else
            v-model="mappingForm.targetPath"
            :options="channelPathOptions"
            emit-value
            map-options
            label="Target channel path"
            use-input
            fill-input
            hint="Converted to fixture+attribute on save"
          />

          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input v-model.number="mappingForm.min" type="number" label="Min output" min="0" max="255" />
            </div>
            <div class="col-6">
              <q-input v-model.number="mappingForm.max" type="number" label="Max output" min="0" max="255" />
            </div>
          </div>

          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input v-model.number="mappingForm.gain" type="number" label="Gain" min="0" step="0.05" />
            </div>
            <div class="col-6">
              <q-input v-model.number="mappingForm.offset" type="number" label="Offset" step="0.05" />
            </div>
          </div>

          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input v-model.number="mappingForm.attackMs" type="number" label="Attack (ms)" min="0" />
            </div>
            <div class="col-6">
              <q-input v-model.number="mappingForm.releaseMs" type="number" label="Release (ms)" min="0" />
            </div>
          </div>

          <div class="mapping-preview">
            <div class="text-caption text-grey-5">Live preview</div>
            <q-linear-progress
              rounded
              size="9px"
              color="primary"
              track-color="grey-8"
              :value="Math.max(0, Math.min(1, (mappingForm.invert ? 1 - getSourceLevel(mappingForm.source) : getSourceLevel(mappingForm.source)) * mappingForm.gain + mappingForm.offset))"
            />
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="primary" label="Save Mapping" :disable="!isFormValid" @click="saveMapping" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<style scoped>
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

.mapping-meter {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 10px;
}

.mapping-meter-value {
  font-size: 12px;
  color: var(--sdmx-color-text-muted);
  min-width: 24px;
  text-align: right;
}

.mapping-dialog {
  min-width: 600px;
  max-width: 92vw;
}

.mapping-preview {
  display: grid;
  gap: 6px;
}
</style>
