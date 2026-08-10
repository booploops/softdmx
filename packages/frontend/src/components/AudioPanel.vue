<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { ShowAudioMapping } from '@softdmx/engine';
import { resolveAudioMappingLabel, resolveAudioMappingSummary } from '@softdmx/engine';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { SdmxOptionChecklist } from 'src/components/ui';
import { useAudioStore } from 'src/stores/audio';
import { useDMXStore } from 'src/stores/dmx';
import { useExecutorStore } from 'src/stores/executor';
import { useOutputEngineStore } from 'src/stores/output-playback';
import { useShowStore } from 'src/stores/show';

type MappingTargetMode = 'channelPath' | 'groupAttr' | 'fixtureAttr';
type MappingSourceForm = 'rms' | 'peak' | 'beat' | 'sub' | 'low' | 'mid' | 'high';

type MappingForm = {
  id: string | null;
  name: string;
  enabled: boolean;
  source: MappingSourceForm;
  targetMode: MappingTargetMode;
  targetPath: string;
  targetGroup: string;
  targetFixture: string;
  attribute: string;
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
const executorStore = useExecutorStore();
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

const INTENSITY_CHANNEL_CANDIDATES = ['Dimmer', 'Intensity', 'Brightness'];

const mappingForm = reactive<MappingForm>({
  id: null,
  name: '',
  enabled: true,
  source: 'rms',
  targetMode: 'fixtureAttr',
  targetPath: '',
  targetGroup: '',
  targetFixture: '',
  attribute: '',
  min: 0,
  max: 255,
  gain: 1,
  offset: 0,
  invert: false,
  attackMs: 20,
  releaseMs: 140,
});

/** True after the user edits the name so auto-suggest won't overwrite it. */
const nameTouched = ref(false);

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

function channelNamesForFixture(fixtureName: string): string[] {
  const mapped = dmxStore.showfileFixturesMapped.find((fixture) => fixture.fixtureName === fixtureName);
  return mapped?.def.channels.map((channel) => channel.name) ?? [];
}

function channelNamesForGroup(groupName: string): string[] {
  const group = groups.value.find((entry) => entry.name === groupName);
  if (!group?.fixtures.length) return [];

  const nameSets = group.fixtures.map((fixtureName) => new Set(channelNamesForFixture(fixtureName)));
  const [first, ...rest] = nameSets;
  if (!first) return [];

  return [...first].filter((name) => rest.every((set) => set.has(name)));
}

function pickPreferredChannel(names: string[], candidates: string[] = INTENSITY_CHANNEL_CANDIDATES): string {
  for (const candidate of candidates) {
    const match = names.find((name) => name.toLowerCase() === candidate.toLowerCase());
    if (match) return match;
  }
  return names[0] ?? '';
}

const attributeOptions = computed(() => {
  if (mappingForm.targetMode === 'groupAttr') {
    return channelNamesForGroup(mappingForm.targetGroup);
  }
  if (mappingForm.targetMode === 'fixtureAttr') {
    return channelNamesForFixture(mappingForm.targetFixture);
  }
  return [];
});

watch(
  () => [mappingForm.targetMode, mappingForm.targetFixture, mappingForm.targetGroup, attributeOptions.value] as const,
  () => {
    if (mappingForm.targetMode === 'channelPath') return;
    const options = attributeOptions.value;
    if (!options.length) {
      mappingForm.attribute = '';
      return;
    }
    if (!options.includes(mappingForm.attribute)) {
      mappingForm.attribute = pickPreferredChannel(options);
    }
  },
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
  if (!mappingForm.attribute.trim()) return false;
  if (mappingForm.targetMode === 'channelPath') return Boolean(mappingForm.targetPath);
  if (mappingForm.targetMode === 'groupAttr') return Boolean(mappingForm.targetGroup);
  return Boolean(mappingForm.targetFixture);
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

function suggestedMappingName(partial: {
  source: MappingSourceForm;
  targetId: string;
  attribute: string;
}): string {
  const sourceLabel = SOURCE_OPTIONS.find((option) => option.value === partial.source)?.label ?? 'Audio';
  const channel = partial.attribute.trim();
  if (!partial.targetId && !channel) return sourceLabel;
  if (!channel) return `${sourceLabel} · ${partial.targetId}`;
  return `${partial.targetId} ${channel}`;
}

function currentFormTargetId(): string {
  if (mappingForm.targetMode === 'groupAttr') return mappingForm.targetGroup;
  if (mappingForm.targetMode === 'fixtureAttr') return mappingForm.targetFixture;
  const resolved = resolveChannelPathTarget(mappingForm.targetPath);
  return resolved?.fixtureName ?? mappingForm.targetPath;
}

function syncSuggestedName() {
  if (nameTouched.value) return;
  mappingForm.name = suggestedMappingName({
    source: mappingForm.source,
    targetId: currentFormTargetId(),
    attribute:
      mappingForm.targetMode === 'channelPath'
        ? (resolveChannelPathTarget(mappingForm.targetPath)?.attribute ?? '')
        : mappingForm.attribute,
  });
}

function resetForm() {
  nameTouched.value = false;
  mappingForm.id = null;
  mappingForm.enabled = true;
  mappingForm.source = 'rms';
  mappingForm.targetMode = 'fixtureAttr';
  mappingForm.targetPath = channelPathOptions.value[0]?.value ?? '';
  mappingForm.targetGroup = groupOptions.value[0]?.value ?? '';
  mappingForm.targetFixture = fixtureOptions.value[0]?.value ?? '';
  mappingForm.attribute = pickPreferredChannel(channelNamesForFixture(mappingForm.targetFixture));
  mappingForm.min = 0;
  mappingForm.max = 255;
  mappingForm.gain = 1;
  mappingForm.offset = 0;
  mappingForm.invert = false;
  mappingForm.attackMs = 20;
  mappingForm.releaseMs = 140;
  syncSuggestedName();
}

function openCreateMappingDialog() {
  editingMappingId.value = null;
  resetForm();
  showMappingDialog.value = true;
}

function openEditMappingDialog(mapping: ShowAudioMapping) {
  editingMappingId.value = mapping.id;
  nameTouched.value = Boolean(mapping.name?.trim());
  mappingForm.id = mapping.id;
  mappingForm.name = mapping.name?.trim() || resolveAudioMappingLabel(mapping);
  mappingForm.enabled = mapping.enabled ?? true;
  mappingForm.source = mappingToFormSource(mapping);
  mappingForm.attribute = mapping.attribute ?? '';
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
  } else {
    const fixtureMatch = fixtureOptions.value.some((option) => option.value === mapping.targetId);
    mappingForm.targetMode = fixtureMatch ? 'fixtureAttr' : 'channelPath';
    mappingForm.targetFixture = fixtureMatch ? mapping.targetId : fixtureOptions.value[0]?.value ?? '';
    mappingForm.targetPath = fixtureMatch ? '' : mapping.targetId;
  }

  showMappingDialog.value = true;
}

function saveMapping() {
  if (!isFormValid.value) return;
  const sourceFields = formSourceToMapping(mappingForm.source);
  const nextMapping: ShowAudioMapping = {
    id: mappingForm.id ?? createMappingId(),
    name:
      mappingForm.name.trim() ||
      suggestedMappingName({
        source: mappingForm.source,
        targetId: currentFormTargetId(),
        attribute: mappingForm.attribute,
      }),
    source: sourceFields.source,
    bandIndex: sourceFields.bandIndex,
    targetType: mappingForm.targetMode === 'groupAttr' ? 'group' : 'fixture',
    targetId:
      mappingForm.targetMode === 'groupAttr'
        ? mappingForm.targetGroup
        : mappingForm.targetMode === 'fixtureAttr'
          ? mappingForm.targetFixture
          : mappingForm.targetPath,
    attribute: mappingForm.attribute,
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
    if (!mappingForm.name.trim()) {
      nextMapping.name = suggestedMappingName({
        source: mappingForm.source,
        targetId: resolved.fixtureName,
        attribute: resolved.attribute,
      });
    }
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
    for (const executor of doc.executors ?? []) {
      for (const slot of executor.slots) {
        if (slot.audioMappingId === mappingId) {
          delete slot.audioMappingId;
          if (slot.contentType === 'audio') delete slot.contentType;
        }
      }
    }
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

function describeMapping(mapping: ShowAudioMapping) {
  return resolveAudioMappingLabel(mapping);
}

function describeMappingDetails(mapping: ShowAudioMapping) {
  return resolveAudioMappingSummary(mapping);
}

watch(
  () => [
    mappingForm.source,
    mappingForm.targetMode,
    mappingForm.targetFixture,
    mappingForm.targetGroup,
    mappingForm.targetPath,
    mappingForm.attribute,
  ] as const,
  () => {
    syncSuggestedName();
  },
);

const assignmentByMappingId = computed(() => {
  const map = new Map<string, { label: string; slotId: string; active: boolean }>();
  for (const executor of showStore.document.executors ?? []) {
    for (const slot of executor.slots) {
      if (!slot.audioMappingId) continue;
      map.set(slot.audioMappingId, {
        slotId: slot.id,
        label: slot.name.trim() || `P${slot.page}-${slot.index + 1}`,
        active: executorStore.isSlotActive(slot.id),
      });
    }
  }
  return map;
});

function describeAssignment(mappingId: string): string {
  const assignment = assignmentByMappingId.value.get(mappingId);
  if (!assignment) return 'Not assigned to an executor — no live output';
  return assignment.active
    ? `Executor ${assignment.label} (active)`
    : `Executor ${assignment.label} (stopped — GO to enable output)`;
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

  const channelNames =
    baseTarget.targetType === 'group'
      ? channelNamesForGroup(baseTarget.targetId)
      : channelNamesForFixture(baseTarget.targetId);

  const attribute =
    template === 'kickDimmer'
      ? pickPreferredChannel(channelNames, INTENSITY_CHANNEL_CANDIDATES)
      : template === 'bassColorPulse'
        ? pickPreferredChannel(channelNames, ['Blue', 'blue'])
        : pickPreferredChannel(channelNames, ['Strobe', 'strobe']);

  if (!attribute) return;

  const templateMapping: ShowAudioMapping =
    template === 'kickDimmer'
      ? {
          id: createMappingId(),
          name: 'Kick dimmer',
          source: 'beat',
          ...baseTarget,
          attribute,
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
            name: 'Bass color pulse',
            source: 'band',
            bandIndex: 1,
            ...baseTarget,
            attribute,
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
            name: 'Beat strobe',
            source: 'beat',
            ...baseTarget,
            attribute,
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
  <div class="audio-panel">
    <div class="audio-panel__header">
      <div class="text-h6">Audio</div>
      <span
        class="sdmx-badge"
        :class="audioStore.enabled ? 'sdmx-badge--positive' : 'sdmx-badge--grey'"
      >
        Analysis {{ audioStore.enabled ? 'On' : 'Off' }}
      </span>
    </div>

    <XCard class="audio-panel__card">
      <div class="audio-panel__grid">
        <div class="audio-panel__col">
          <div
            v-if="!audioStore.isSupported"
            class="x-alert x-alert--danger"
          >
            <XIcon name="alert-triangle" />
            Audio capture is not supported in this runtime.
          </div>

          <XSwitch
            :model-value="audioStore.enabled"
            label="Enable audio analysis"
            :disable="!audioStore.isSupported"
            @update:model-value="(value) => setAudioEnabled(Boolean(value))"
          />

          <div class="audio-panel__device-row">
            <div class="audio-panel__device-select">
              <div class="audio-panel__field-label">Audio input device</div>
              <XSelect
                :model-value="audioStore.selectedDeviceId"
                :options="audioDeviceOptions"
                :disable="!audioStore.isSupported || audioDeviceOptions.length === 0"
                @update:model-value="(value) => setInputDevice((value as string | null) ?? null)"
              />
            </div>
            <XButton
              v-info="'setup.audio.refreshDevices'"
              flat
              size="sm"
              icon="refresh"
              color="primary"
              :disable="!audioStore.isSupported"
              @click="audioStore.refreshDevices"
            />
          </div>

          <div class="audio-panel__gain">
            <div class="audio-panel__gain-header">
              <span class="audio-panel__field-label">Input gain</span>
              <span class="audio-panel__caption">{{ audioStore.gain.toFixed(2) }}x</span>
            </div>
            <XSlider
              v-model="audioStore.gain"
              :min="0"
              :max="4"
              :step="0.05"
              :disable="!audioStore.isSupported"
            />
          </div>

          <div class="audio-panel__latency">
            <div class="audio-panel__field-label">Output latency (ms)</div>
            <XInput
              v-model.number="audioLatencyMs"
              type="number"
              min="0"
              @update:model-value="saveLatency"
            />
            <div class="audio-panel__caption">
              Advance reactive mapping response for fixture/output lag
            </div>
          </div>
        </div>

        <div class="audio-panel__col">
          <div class="audio-meter-grid">
            <div
              v-for="meter in audioMeterRows"
              :key="meter.label"
              class="audio-meter-row"
            >
              <span class="audio-meter-label">{{ meter.label }}</span>
              <div
                class="x-meter"
                role="meter"
                :aria-valuenow="Math.round(meter.value * 100)"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <div
                  class="x-meter__fill"
                  :style="{ width: `${Math.max(0, Math.min(1, meter.value)) * 100}%` }"
                />
              </div>
            </div>
          </div>

          <div class="audio-panel__beat">
            <span
              class="sdmx-badge"
              :class="audioStore.beatPulse ? 'sdmx-badge--positive' : 'sdmx-badge--grey'"
            >
              <XIcon
                name="waveform"
                size="14px"
              />
              Beat pulse {{ audioStore.beatPulse ? 'detected' : 'idle' }}
            </span>
          </div>
        </div>
      </div>
    </XCard>

    <div class="audio-panel__mappings-header">
      <div class="text-subtitle1">Audio Mappings</div>
      <XButton
        flat
        icon="plus"
        label="Add Mapping"
        @click="openCreateMappingDialog"
      />
    </div>
    <div class="audio-panel__caption audio-panel__gate-note">
      Mappings own fixture/group targets. Assign each mapping to an executor slot and GO to enable live output.
    </div>

    <div class="audio-panel__templates">
      <span class="audio-panel__caption">Templates:</span>
      <XButton
        flat
        size="sm"
        label="Kick -> Dimmer"
        @click="applyTemplate('kickDimmer')"
      />
      <XButton
        flat
        size="sm"
        label="Bass -> Color Pulse"
        @click="applyTemplate('bassColorPulse')"
      />
      <XButton
        flat
        size="sm"
        label="Beat -> Strobe"
        @click="applyTemplate('beatStrobe')"
      />
    </div>

    <XListView
      v-if="audioMappings.length"
      :bordered="true"
      class="audio-panel__list"
    >
      <XListItem
        v-for="mapping in audioMappings"
        :key="mapping.id"
      >
        <div class="audio-panel__mapping-main">
          <div class="text-subtitle2">{{ describeMapping(mapping) }}</div>
          <div class="audio-panel__caption">
            {{ describeMappingDetails(mapping) }}
            · {{ mapping.min ?? 0 }}-{{ mapping.max ?? 255 }}
            · gain {{ (mapping.gain ?? 1).toFixed(2) }} · offset {{ (mapping.offset ?? 0).toFixed(2) }}
            · {{ mapping.invert ? 'inverted' : 'normal' }} · atk {{ mapping.attackMs ?? 20 }}ms · rel {{ mapping.releaseMs ?? 140 }}ms
          </div>
          <div
            class="audio-panel__caption"
            :class="{ 'audio-panel__assignment--active': assignmentByMappingId.get(mapping.id)?.active }"
          >
            {{ describeAssignment(mapping.id) }}
          </div>
          <div class="mapping-meter">
            <div
              class="x-meter"
              role="meter"
              :aria-valuenow="Math.round((meterRows.find((row) => row.id === mapping.id)?.input ?? 0) * 100)"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <div
                class="x-meter__fill"
                :style="{ width: `${Math.max(0, Math.min(1, meterRows.find((row) => row.id === mapping.id)?.input ?? 0)) * 100}%` }"
              />
            </div>
            <span class="mapping-meter-value">{{ meterRows.find((row) => row.id === mapping.id)?.output ?? 0 }}</span>
          </div>
        </div>
        <template #append>
          <div class="audio-panel__mapping-actions">
            <XSwitch
              :model-value="mapping.enabled ?? true"
              @update:model-value="(value) => toggleMapping(mapping.id, Boolean(value))"
            />
            <XButton
              icon="pencil"
              flat
              size="sm"
              @click="openEditMappingDialog(mapping)"
            />
            <XButton
              icon="trash"
              flat
              size="sm"
              color="danger"
              @click="removeMapping(mapping.id)"
            />
          </div>
        </template>
      </XListItem>
    </XListView>

    <XWell
      v-else
      class="audio-panel__empty"
    >
      <XIcon
        name="waveform"
        class="audio-panel__empty-icon"
      />
      <div class="audio-panel__empty-title">No audio mappings configured</div>
      <div class="audio-panel__empty-hint">
        Add a mapping or apply a template, then assign it to an executor slot to control live output.
      </div>
    </XWell>

    <XDialog
      v-model="showMappingDialog"
      card-class="mapping-dialog"
    >
      <XDialogTitlebar
        :title="`${editingMappingId ? 'Edit' : 'Add'} Audio Mapping`"
        @close="showMappingDialog = false"
      />
      <XDialogBody class="audio-panel__dialog-body">
        <div>
          <div class="audio-panel__field-label">Name</div>
          <XInput
            v-model="mappingForm.name"
            placeholder="e.g. Kick dimmer"
            @update:model-value="nameTouched = true"
          />
        </div>

        <XSwitch
          v-model="mappingForm.enabled"
          label="Enabled"
        />
        <XSwitch
          v-model="mappingForm.invert"
          label="Invert source value"
        />

        <div>
          <div class="audio-panel__field-label">Source</div>
          <XSelect
            v-model="mappingForm.source"
            :options="SOURCE_OPTIONS"
          />
        </div>

        <XButtonGroup class="audio-panel__target-modes">
          <XButton
            :color="mappingForm.targetMode === 'fixtureAttr' ? 'primary' : 'default'"
            label="Fixture + Attr"
            @click="mappingForm.targetMode = 'fixtureAttr'"
          />
          <XButton
            :color="mappingForm.targetMode === 'groupAttr' ? 'primary' : 'default'"
            label="Group + Attr"
            @click="mappingForm.targetMode = 'groupAttr'"
          />
          <XButton
            :color="mappingForm.targetMode === 'channelPath' ? 'primary' : 'default'"
            label="Channel Path"
            @click="mappingForm.targetMode = 'channelPath'"
          />
        </XButtonGroup>

        <div
          v-if="mappingForm.targetMode === 'fixtureAttr'"
          class="audio-panel__target-grid"
        >
          <SdmxOptionChecklist
            v-model="mappingForm.targetFixture"
            :options="fixtureOptions"
            label="Target fixture"
            empty-hint="No fixtures in show"
            max-height="180px"
          />
          <div>
            <div class="audio-panel__field-label">Channel</div>
            <XSelect
              v-model="mappingForm.attribute"
              :options="attributeOptions"
              :disable="attributeOptions.length === 0"
            />
          </div>
        </div>

        <div
          v-else-if="mappingForm.targetMode === 'groupAttr'"
          class="audio-panel__target-grid"
        >
          <SdmxOptionChecklist
            v-model="mappingForm.targetGroup"
            :options="groupOptions"
            label="Target group"
            empty-hint="No groups in show"
            max-height="180px"
          />
          <div>
            <div class="audio-panel__field-label">Channel</div>
            <XSelect
              v-model="mappingForm.attribute"
              :options="attributeOptions"
              :disable="attributeOptions.length === 0"
            />
            <div
              v-if="mappingForm.targetGroup && attributeOptions.length === 0"
              class="audio-panel__caption"
            >
              No shared channel names across fixtures in this group.
            </div>
          </div>
        </div>

        <div v-else>
          <div class="audio-panel__field-label">Target channel path</div>
          <XSelect
            v-model="mappingForm.targetPath"
            :options="channelPathOptions"
          />
          <div class="audio-panel__caption">Converted to fixture+attribute on save</div>
        </div>

        <div class="audio-panel__target-grid">
          <div>
            <div class="audio-panel__field-label">Min output</div>
            <XInput
              v-model.number="mappingForm.min"
              type="number"
            />
          </div>
          <div>
            <div class="audio-panel__field-label">Max output</div>
            <XInput
              v-model.number="mappingForm.max"
              type="number"
            />
          </div>
        </div>

        <div class="audio-panel__target-grid">
          <div>
            <div class="audio-panel__field-label">Gain</div>
            <XInput
              v-model.number="mappingForm.gain"
              type="number"
            />
          </div>
          <div>
            <div class="audio-panel__field-label">Offset</div>
            <XInput
              v-model.number="mappingForm.offset"
              type="number"
            />
          </div>
        </div>

        <div class="audio-panel__target-grid">
          <div>
            <div class="audio-panel__field-label">Attack (ms)</div>
            <XInput
              v-model.number="mappingForm.attackMs"
              type="number"
            />
          </div>
          <div>
            <div class="audio-panel__field-label">Release (ms)</div>
            <XInput
              v-model.number="mappingForm.releaseMs"
              type="number"
            />
          </div>
        </div>

        <div class="mapping-preview">
          <div class="audio-panel__caption">Live preview</div>
          <div
            class="x-meter"
            role="meter"
            :aria-valuenow="Math.round(Math.max(0, Math.min(1, (mappingForm.invert ? 1 - getSourceLevel(mappingForm.source) : getSourceLevel(mappingForm.source)) * mappingForm.gain + mappingForm.offset)) * 100)"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div
              class="x-meter__fill"
              :style="{ width: `${Math.max(0, Math.min(1, (mappingForm.invert ? 1 - getSourceLevel(mappingForm.source) : getSourceLevel(mappingForm.source)) * mappingForm.gain + mappingForm.offset)) * 100}%` }"
            />
          </div>
        </div>
      </XDialogBody>
      <XDialogFooter>
        <XButton
          flat
          label="Cancel"
          @click="showMappingDialog = false"
        />
        <XButton
          color="primary"
          label="Save Mapping"
          :disable="!isFormValid"
          @click="saveMapping"
        />
      </XDialogFooter>
    </XDialog>
  </div>
</template>

<style scoped>
.audio-panel {
  padding: var(--sdmx-space-md, 16px);
}

.audio-panel__header,
.audio-panel__mappings-header,
.audio-panel__gain-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.audio-panel__header,
.audio-panel__card,
.audio-panel__mappings-header,
.audio-panel__templates {
  margin-bottom: 12px;
}

.audio-panel__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.audio-panel__col {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.audio-panel__device-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.audio-panel__device-select {
  flex: 1 1 auto;
  min-width: 0;
}

.audio-panel__field-label {
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--sdmx-color-text-muted);
}

.audio-panel__caption {
  font-size: 12px;
  color: var(--sdmx-color-text-muted);
}

.audio-panel__gate-note {
  margin: -4px 0 8px;
}

.audio-panel__assignment--active {
  color: var(--sdmx-color-active);
}

.audio-panel__templates,
.audio-panel__mapping-actions,
.audio-panel__target-modes {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.audio-panel__list {
  max-height: none;
}

.audio-panel__mapping-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.audio-panel__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}

.audio-panel__empty-icon {
  font-size: 28px;
  opacity: 0.55;
}

.audio-panel__empty-title {
  font-weight: 600;
}

.audio-panel__empty-hint {
  font-size: 12px;
  color: var(--sdmx-color-text-muted);
}

.audio-panel__dialog-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.audio-panel__target-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 12px;
}

.x-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 13px;
}

.x-alert--danger {
  background: #ff3b30;
  color: #ffffff;
}

.x-meter {
  height: 9px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.x-meter__fill {
  height: 100%;
  border-radius: inherit;
  background: #007aff;
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

.sdmx-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.sdmx-badge--positive {
  background: rgba(48, 209, 88, 0.15);
  color: #30d158;
}

.sdmx-badge--grey {
  background: rgba(255, 255, 255, 0.1);
  color: #8e8e93;
}

@media (max-width: 900px) {
  .audio-panel__grid,
  .audio-panel__target-grid {
    grid-template-columns: 1fr;
  }
}

:global(.body--dark) .x-meter {
  background: rgba(255, 255, 255, 0.12);
}

:global(.body--dark) .x-meter__fill {
  background: #0a84ff;
}
</style>
