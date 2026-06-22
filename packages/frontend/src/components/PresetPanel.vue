<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useShowStore } from 'src/stores/show';
import { useCueStore } from 'src/stores/cue';
import { useOutputEngineStore } from 'src/stores/output-playback';
import { useAudioStore } from 'src/stores/audio';
import { useDMXStore } from 'src/stores/dmx';
import type { ShowAudioMapping } from '@softdmx/engine';
import { computed, reactive, ref } from 'vue';
import PresetEditor from './PresetEditor.vue';
import EffectEditor from './EffectEditor.vue';

const showStore = useShowStore();
const cueStore = useCueStore();
const engine = useOutputEngineStore();
const audioStore = useAudioStore();
const dmxStore = useDMXStore();

const presets = computed(() => showStore.document.presets);
const effects = computed(() => showStore.document.effects);
const audioMappings = computed(() => showStore.document.audioMappings ?? []);
const groups = computed(() => showStore.document.groups);

const ATTRIBUTE_OPTIONS = ['intensity', 'dimmer', 'strobe', 'pan', 'tilt', 'red', 'green', 'blue'];
const BAND_OPTIONS = [
  { label: 'Sub', value: 'sub' },
  { label: 'Low', value: 'low' },
  { label: 'Mid', value: 'mid' },
  { label: 'High', value: 'high' },
  { label: 'RMS', value: 'rms' },
  { label: 'Full / Peak', value: 'full' },
] as const;

type MappingTargetMode = 'channelPath' | 'groupAttr';
type MappingBand = (typeof BAND_OPTIONS)[number]['value'];

type MappingForm = {
  id: string | null;
  enabled: boolean;
  targetMode: MappingTargetMode;
  targetPath: string;
  targetGroup: string;
  targetAttribute: string;
  band: MappingBand;
  min: number;
  max: number;
  gain: number;
  attackMs: number;
  releaseMs: number;
};

const showMappingDialog = ref(false);
const showPresetEditor = ref(false);
const showEffectEditor = ref(false);
const presetFadeMs = ref(1000);
const editingMappingId = ref<string | null>(null);
const mappingForm = reactive<MappingForm>({
  id: null,
  enabled: true,
  targetMode: 'channelPath',
  targetPath: '',
  targetGroup: '',
  targetAttribute: 'intensity',
  band: 'rms',
  min: 0,
  max: 255,
  gain: 1,
  attackMs: 20,
  releaseMs: 140,
});

const channelPathOptions = computed(() => {
  return dmxStore.baseChannels.map((channel) => ({
    label: `${channel.path} (${channel.attributeType ?? 'generic'})`,
    value: channel.path,
  }));
});

const groupOptions = computed(() =>
  groups.value.map((group) => ({
    label: group.name,
    value: group.name,
  }))
);

const meterRows = computed(() => {
  return audioMappings.value.map((mapping) => {
    const input = getBandLevel(mappingToFormBand(mapping));
    const min = Number.isFinite(mapping.min as number) ? (mapping.min as number) : 0;
    const max = Number.isFinite(mapping.max as number) ? (mapping.max as number) : 255;
    const gain = Number.isFinite(mapping.gain as number) ? (mapping.gain as number) : 1;
    const scaled = Math.max(0, Math.min(1, input * gain));
    const output = Math.round(min + (max - min) * scaled);
    return {
      id: mapping.id,
      input: scaled,
      output,
    };
  });
});

const isFormValid = computed(() => {
  if (mappingForm.targetMode === 'channelPath') {
    return !!mappingForm.targetPath && mappingForm.max >= mappingForm.min;
  }
  return !!mappingForm.targetGroup && !!mappingForm.targetAttribute && mappingForm.max >= mappingForm.min;
});

function firePreset(presetId: string) {
  cueStore.firePreset(presetId, Math.max(0, presetFadeMs.value));
}

function toggleEffect(effectId: string, enabled: boolean) {
  showStore.updateDocument((doc) => {
    const effect = doc.effects.find((e) => e.id === effectId);
    if (effect) effect.enabled = enabled;
  });
  engine.requestMerge();
}

function getBandLevel(band: MappingBand) {
  switch (band) {
    case 'sub':
      return audioStore.levels.bands[0] ?? 0;
    case 'low':
      return audioStore.levels.bands[1] ?? 0;
    case 'mid':
      return audioStore.levels.bands[2] ?? 0;
    case 'high':
      return audioStore.levels.bands[3] ?? 0;
    case 'full':
      return audioStore.levels.peak;
    case 'rms':
    default:
      return audioStore.levels.rms;
  }
}

function mappingToFormBand(mapping: ShowAudioMapping): MappingBand {
  if (mapping.source === 'rms') return 'rms';
  if (mapping.source === 'peak') return 'full';
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

function formBandToMappingSource(formBand: MappingBand): Pick<ShowAudioMapping, 'source' | 'bandIndex'> {
  switch (formBand) {
    case 'sub':
      return { source: 'band', bandIndex: 0 };
    case 'low':
      return { source: 'band', bandIndex: 1 };
    case 'mid':
      return { source: 'band', bandIndex: 2 };
    case 'high':
      return { source: 'band', bandIndex: 3 };
    case 'full':
      return { source: 'peak' };
    case 'rms':
    default:
      return { source: 'rms' };
  }
}

function createMappingId() {
  return `am-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function resetForm() {
  mappingForm.id = null;
  mappingForm.enabled = true;
  mappingForm.targetMode = 'channelPath';
  mappingForm.targetPath = channelPathOptions.value[0]?.value ?? '';
  mappingForm.targetGroup = groupOptions.value[0]?.value ?? '';
  mappingForm.targetAttribute = 'intensity';
  mappingForm.band = 'rms';
  mappingForm.min = 0;
  mappingForm.max = 255;
  mappingForm.gain = 1;
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
  mappingForm.targetMode = mapping.targetType === 'group' ? 'groupAttr' : 'channelPath';
  mappingForm.targetPath = mapping.targetType === 'group' ? '' : mapping.targetId;
  mappingForm.targetGroup = mapping.targetType === 'group' ? mapping.targetId : groupOptions.value[0]?.value ?? '';
  mappingForm.targetAttribute = mapping.attribute ?? 'intensity';
  mappingForm.band = mappingToFormBand(mapping);
  mappingForm.min = mapping.min ?? 0;
  mappingForm.max = mapping.max ?? 255;
  mappingForm.gain = mapping.gain ?? 1;
  mappingForm.attackMs = mapping.attackMs ?? 20;
  mappingForm.releaseMs = mapping.releaseMs ?? 140;
  showMappingDialog.value = true;
}

function saveMapping() {
  if (!isFormValid.value) return;
  const sourceFields = formBandToMappingSource(mappingForm.band);

  const nextMapping: ShowAudioMapping = {
    id: mappingForm.id ?? createMappingId(),
    source: sourceFields.source,
    bandIndex: sourceFields.bandIndex,
    targetType: mappingForm.targetMode === 'groupAttr' ? 'group' : 'fixture',
    targetId: mappingForm.targetMode === 'groupAttr' ? mappingForm.targetGroup : mappingForm.targetPath,
    attribute: mappingForm.targetMode === 'groupAttr' ? mappingForm.targetAttribute : undefined,
    gain: mappingForm.gain,
    enabled: mappingForm.enabled,
    min: mappingForm.min,
    max: mappingForm.max,
    attackMs: mappingForm.attackMs,
    releaseMs: mappingForm.releaseMs,
  };

  showStore.updateDocument((doc) => {
    doc.audioMappings = doc.audioMappings ?? [];
    const idx = doc.audioMappings.findIndex((m) => m.id === nextMapping.id);
    if (idx >= 0) {
      doc.audioMappings[idx] = nextMapping;
    } else {
      doc.audioMappings.push(nextMapping);
    }
  });
  showMappingDialog.value = false;
}

function removeMapping(mappingId: string) {
  showStore.updateDocument((doc) => {
    doc.audioMappings = (doc.audioMappings ?? []).filter((mapping) => mapping.id !== mappingId);
  });
}

function toggleMapping(mappingId: string, enabled: boolean) {
  showStore.updateDocument((doc) => {
    const mapping = (doc.audioMappings ?? []).find((item) => item.id === mappingId);
    if (mapping) {
      mapping.enabled = enabled;
    }
  });
}

function describeTarget(mapping: ShowAudioMapping) {
  if (mapping.targetType === 'group') {
    return `${mapping.targetId}.${mapping.attribute ?? 'intensity'}`;
  }
  return mapping.targetId;
}
</script>

<template>
  <div class="preset-panel q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h6">Presets</div>
      <q-space />
      <q-input
        v-model.number="presetFadeMs"
        type="number"
        min="0"
        dense
        label="Fade (ms)"
        style="max-width: 130px"
      />
      <q-btn dense flat icon="edit" label="Edit Presets" class="q-ml-sm" @click="showPresetEditor = true" />
    </div>
    <div class="row q-gutter-sm q-mb-lg">
      <q-btn
        v-for="preset in presets"
        :key="preset.id"
        :label="preset.name"
        :style="preset.color ? { backgroundColor: preset.color, color: 'var(--sdmx-color-text)' } : {}"
        @click="firePreset(preset.id)"
      />
      <span v-if="presets.length === 0" class="text-grey-5">No presets — use Live bar to save one</span>
    </div>

    <div class="row items-center q-mb-md">
      <div class="text-h6">Effects</div>
      <q-space />
      <q-btn dense flat icon="tune" label="Edit Effects" @click="showEffectEditor = true" />
    </div>
    <q-list bordered class="rounded-borders">
      <q-item v-for="effect in effects" :key="effect.id">
        <q-item-section>
          <q-item-label>{{ effect.name }}</q-item-label>
          <q-item-label caption>{{ effect.type }} · {{ effect.target.group ?? effect.target.fixtures?.join(', ') }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-toggle
            :model-value="effect.enabled"
            @update:model-value="(v) => toggleEffect(effect.id, v)"
          />
        </q-item-section>
      </q-item>
      <q-item v-if="effects.length === 0">
        <q-item-section class="text-grey-5">No effects configured</q-item-section>
      </q-item>
    </q-list>

    <q-dialog v-model="showPresetEditor" maximized>
      <q-card><PresetEditor /></q-card>
    </q-dialog>

    <q-dialog v-model="showEffectEditor" maximized>
      <q-card><EffectEditor /></q-card>
    </q-dialog>

    <div class="row items-center q-mt-lg q-mb-sm">
      <div class="text-h6">Audio Mappings</div>
      <q-space />
      <q-chip
        dense
        :color="audioStore.enabled ? 'positive' : 'grey-7'"
        :text-color="audioStore.enabled ? 'black' : 'grey-3'"
      >
        Audio {{ audioStore.enabled ? 'On' : 'Off' }}
      </q-chip>
      <q-btn color="primary" icon="add" label="Add Mapping" class="q-ml-sm" @click="openCreateMappingDialog" />
    </div>

    <q-list bordered class="rounded-borders">
      <q-item v-for="mapping in audioMappings" :key="mapping.id">
        <q-item-section>
          <q-item-label>
            {{ describeTarget(mapping) }}
          </q-item-label>
          <q-item-label caption>
            {{ mappingToFormBand(mapping).toUpperCase() }} · {{ mapping.min ?? 0 }}-{{ mapping.max ?? 255 }} · gain {{ (mapping.gain ?? 1).toFixed(2) }} · atk {{ mapping.attackMs ?? 20 }}ms · rel {{ mapping.releaseMs ?? 140 }}ms
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
          <q-toggle :model-value="mapping.enabled ?? true" @update:model-value="(v) => toggleMapping(mapping.id, v)" />
          <q-btn dense flat round icon="edit" @click="openEditMappingDialog(mapping)" />
          <q-btn dense flat round icon="delete" color="negative" @click="removeMapping(mapping.id)" />
        </q-item-section>
      </q-item>
      <q-item v-if="audioMappings.length === 0">
        <q-item-section class="text-grey-5">No audio mappings configured</q-item-section>
      </q-item>
    </q-list>

    <q-dialog v-model="showMappingDialog">
      <q-card class="mapping-dialog">
        <q-card-section>
          <div class="text-h6">{{ editingMappingId ? 'Edit' : 'Add' }} Audio Mapping</div>
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <q-toggle v-model="mappingForm.enabled" label="Enabled" color="primary" />

          <q-btn-toggle
            v-model="mappingForm.targetMode"
            unelevated
            spread
            toggle-color="primary"
            :options="[
              { label: 'Channel Path', value: 'channelPath' },
              { label: 'Group + Attr', value: 'groupAttr' },
            ]"
          />

          <q-select
            v-if="mappingForm.targetMode === 'channelPath'"
            v-model="mappingForm.targetPath"
            :options="channelPathOptions"
            emit-value
            map-options
            label="Target channel path"
            use-input
            fill-input
            hint="Example: show://FixtureName/1"
          />

          <div v-else class="row q-col-gutter-sm">
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
              <q-select v-model="mappingForm.targetAttribute" :options="ATTRIBUTE_OPTIONS" label="Attribute" />
            </div>
          </div>

          <q-select v-model="mappingForm.band" :options="BAND_OPTIONS" emit-value map-options label="Band" />

          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input v-model.number="mappingForm.min" type="number" label="Min output" min="0" max="255" />
            </div>
            <div class="col-6">
              <q-input v-model.number="mappingForm.max" type="number" label="Max output" min="0" max="255" />
            </div>
          </div>

          <q-input v-model.number="mappingForm.gain" type="number" label="Gain" min="0" step="0.05" />

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
              :value="Math.max(0, Math.min(1, getBandLevel(mappingForm.band) * mappingForm.gain))"
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
  min-width: 540px;
  max-width: 92vw;
}

.mapping-preview {
  display: grid;
  gap: 6px;
}
</style>
