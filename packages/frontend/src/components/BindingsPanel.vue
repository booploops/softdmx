<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import { useShowStore } from 'src/stores/show';
import { useMidiStore } from 'src/stores/midi';
import { useOscStore } from 'src/stores/osc';
import type { BindingTarget, BindingTargetType, MidiMapping, OscMapping } from '@softdmx/engine';

defineEmits([
  ...useDialogPluginComponent.emits
]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

const showStore = useShowStore();
const midiStore = useMidiStore();
const oscStore = useOscStore();

const tab = ref<'midi' | 'osc'>('midi');

const midiMappings = ref<MidiMapping[]>(cloneMidi(showStore.document.bindings.midi));
const oscMappings = ref<OscMapping[]>(cloneOsc(showStore.document.bindings.osc));

const targetTypeOptions: { label: string; value: BindingTargetType }[] = [
  { label: 'Fixture Channel', value: 'fixture_channel' },
  { label: 'Group Master', value: 'group_master' },
  { label: 'Cue Trigger', value: 'cue_trigger' },
  { label: 'Cue Stack Go', value: 'cue_stack_go' },
  { label: 'Preset Fire', value: 'preset' },
  { label: 'Blackout', value: 'blackout' },
  { label: 'Grandmaster', value: 'grandmaster' },
];

const fixtureOptions = computed(() => showStore.document.fixtures.map((fixture) => fixture.name));
const groupOptions = computed(() => showStore.document.groups.map((group) => group.name));
const cueOptions = computed(() =>
  showStore.document.cues.map((cue) => ({ label: cue.name, value: cue.id }))
);
const presetOptions = computed(() =>
  showStore.document.presets.map((preset) => ({ label: preset.name, value: preset.id }))
);

const midiControlTypeOptions = [
  { label: 'CC', value: 'cc' },
  { label: 'Note', value: 'note' },
];

const currentLearningLabel = computed(() => {
  if (midiStore.isLearning) return 'MIDI learn active';
  if (oscStore.isLearning) return 'OSC learn active';
  return '';
});

function cloneMidi(items: MidiMapping[]): MidiMapping[] {
  return JSON.parse(JSON.stringify(items));
}

function cloneOsc(items: OscMapping[]): OscMapping[] {
  return JSON.parse(JSON.stringify(items));
}

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createDefaultTarget(): BindingTarget {
  return { type: 'blackout' };
}

function addMidiMapping() {
  midiMappings.value.push({
    id: createId(),
    channel: 0,
    controlType: 'cc',
    controlNumber: 0,
    target: createDefaultTarget(),
  });
}

function addOscMapping() {
  oscMappings.value.push({
    id: createId(),
    addressPattern: '/softdmx/blackout',
    target: createDefaultTarget(),
  });
}

function removeMidi(id: string) {
  midiMappings.value = midiMappings.value.filter((m) => m.id !== id);
}

function removeOsc(id: string) {
  oscMappings.value = oscMappings.value.filter((m) => m.id !== id);
}

function onTargetTypeChange(target: BindingTarget, type: BindingTargetType) {
  target.type = type;
  delete target.fixtureName;
  delete target.channelIndex;
  delete target.groupName;
  delete target.cueId;
  delete target.presetId;
}

function startMidiLearn(mapping: MidiMapping) {
  midiStore.startLearning(mapping.target);
  oscStore.stopLearning();
}

function startOscLearn(mapping: OscMapping) {
  oscStore.startLearning(mapping.target);
  midiStore.stopLearning();
}

function stopLearning() {
  midiStore.stopLearning();
  oscStore.stopLearning();
}

function saveBindings() {
  showStore.updateDocument((doc) => {
    doc.bindings.midi = cloneMidi(midiMappings.value);
    doc.bindings.osc = cloneOsc(oscMappings.value);
  });
  onDialogOK();
}

function cancel() {
  stopLearning();
  onDialogCancel();
}

function targetSummary(target: BindingTarget): string {
  switch (target.type) {
    case 'fixture_channel':
      return `${target.fixtureName ?? 'Fixture'} ch ${(target.channelIndex ?? 0) + 1}`;
    case 'group_master':
      return `Group ${target.groupName ?? 'Unknown'}`;
    case 'cue_trigger':
      return `Cue trigger ${target.cueId ?? ''}`.trim();
    case 'cue_stack_go':
      return `Cue stack go ${target.cueId ?? ''}`.trim();
    case 'preset':
      return `Preset ${target.presetId ?? ''}`.trim();
    case 'blackout':
      return 'Blackout';
    case 'grandmaster':
      return 'Grandmaster';
  }
}
</script>

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="sdmx-dialog-card bindings-card q-dialog-plugin">
      <q-card-section class="row items-center q-pb-sm sdmx-border-bottom">
        <div class="text-h6">MIDI / OSC Bindings</div>
      <q-space />
      <q-chip v-if="currentLearningLabel" dense color="orange-8" text-color="white">
        {{ currentLearningLabel }}
      </q-chip>
      <q-btn icon="close" flat round dense @click="cancel" />
    </q-card-section>

    <q-card-section class="q-pt-sm">
      <q-tabs v-model="tab" dense align="left" active-color="primary" indicator-color="primary">
        <q-tab name="midi" label="MIDI" />
        <q-tab name="osc" label="OSC" />
      </q-tabs>
      <q-separator class="q-mt-sm q-mb-md" dark />

      <q-tab-panels v-model="tab" animated dark>
        <q-tab-panel name="midi" class="q-pa-none">
          <div class="row justify-between items-center q-mb-sm">
            <div class="text-subtitle2 text-grey-4">Map MIDI CC/Notes to show actions.</div>
            <q-btn dense color="primary" icon="add" label="Add MIDI Binding" @click="addMidiMapping" />
          </div>
          <div v-if="midiMappings.length === 0" class="text-grey-5 q-pa-md">
            No MIDI bindings yet.
          </div>
          <q-list v-else bordered separator class="rounded-borders">
            <q-item v-for="mapping in midiMappings" :key="mapping.id" class="column">
              <div class="row q-col-gutter-sm full-width items-center">
                <div class="col-2">
                  <q-input v-model.number="mapping.channel" type="number" min="0" max="15" dense filled dark label="Channel" />
                </div>
                <div class="col-2">
                  <q-select
                    v-model="mapping.controlType"
                    :options="midiControlTypeOptions"
                    dense
                    filled
                    dark
                    emit-value
                    map-options
                    label="Type"
                  />
                </div>
                <div class="col-2">
                  <q-input v-model.number="mapping.controlNumber" type="number" min="0" max="127" dense filled dark label="Control" />
                </div>
                <div class="col-3">
                  <q-select
                    :model-value="mapping.target.type"
                    :options="targetTypeOptions"
                    dense
                    filled
                    dark
                    emit-value
                    map-options
                    label="Target"
                    @update:model-value="(v) => onTargetTypeChange(mapping.target, v as BindingTargetType)"
                  />
                </div>
                <div class="col-3 row q-gutter-xs justify-end">
                  <q-btn dense color="secondary" icon="sensors" label="Learn" @click="startMidiLearn(mapping)" />
                  <q-btn dense flat color="negative" icon="delete" @click="removeMidi(mapping.id)" />
                </div>
              </div>

              <div class="row q-col-gutter-sm full-width q-mt-sm">
                <template v-if="mapping.target.type === 'fixture_channel'">
                  <div class="col-6">
                    <q-select v-model="mapping.target.fixtureName" :options="fixtureOptions" dense filled dark label="Fixture" />
                  </div>
                  <div class="col-6">
                    <q-input
                      v-model.number="mapping.target.channelIndex"
                      type="number"
                      min="0"
                      dense
                      filled
                      dark
                      label="Channel Index (0-based)"
                    />
                  </div>
                </template>
                <template v-else-if="mapping.target.type === 'group_master'">
                  <div class="col-12">
                    <q-select v-model="mapping.target.groupName" :options="groupOptions" dense filled dark label="Group" />
                  </div>
                </template>
                <template v-else-if="mapping.target.type === 'cue_trigger' || mapping.target.type === 'cue_stack_go'">
                  <div class="col-12">
                    <q-select v-model="mapping.target.cueId" :options="cueOptions" dense filled dark emit-value map-options label="Cue" />
                  </div>
                </template>
                <template v-else-if="mapping.target.type === 'preset'">
                  <div class="col-12">
                    <q-select
                      v-model="mapping.target.presetId"
                      :options="presetOptions"
                      dense
                      filled
                      dark
                      emit-value
                      map-options
                      label="Preset"
                    />
                  </div>
                </template>
                <template v-else>
                  <div class="col-12 text-caption text-grey-5 q-pt-xs">
                    Target: {{ targetSummary(mapping.target) }}
                  </div>
                </template>
              </div>
            </q-item>
          </q-list>
        </q-tab-panel>

        <q-tab-panel name="osc" class="q-pa-none">
          <div class="row justify-between items-center q-mb-sm">
            <div class="text-subtitle2 text-grey-4">Map OSC address patterns to show actions.</div>
            <q-btn dense color="primary" icon="add" label="Add OSC Binding" @click="addOscMapping" />
          </div>
          <div v-if="oscMappings.length === 0" class="text-grey-5 q-pa-md">
            No OSC bindings yet.
          </div>
          <q-list v-else bordered separator class="rounded-borders">
            <q-item v-for="mapping in oscMappings" :key="mapping.id" class="column">
              <div class="row q-col-gutter-sm full-width items-center">
                <div class="col-4">
                  <q-input v-model="mapping.addressPattern" dense filled dark label="OSC Address Pattern" />
                </div>
                <div class="col-3">
                  <q-select
                    :model-value="mapping.target.type"
                    :options="targetTypeOptions"
                    dense
                    filled
                    dark
                    emit-value
                    map-options
                    label="Target"
                    @update:model-value="(v) => onTargetTypeChange(mapping.target, v as BindingTargetType)"
                  />
                </div>
                <div class="col-5 row q-gutter-xs justify-end">
                  <q-btn dense color="secondary" icon="sensors" label="Learn" @click="startOscLearn(mapping)" />
                  <q-btn dense flat color="negative" icon="delete" @click="removeOsc(mapping.id)" />
                </div>
              </div>

              <div class="row q-col-gutter-sm full-width q-mt-sm">
                <template v-if="mapping.target.type === 'fixture_channel'">
                  <div class="col-6">
                    <q-select v-model="mapping.target.fixtureName" :options="fixtureOptions" dense filled dark label="Fixture" />
                  </div>
                  <div class="col-6">
                    <q-input
                      v-model.number="mapping.target.channelIndex"
                      type="number"
                      min="0"
                      dense
                      filled
                      dark
                      label="Channel Index (0-based)"
                    />
                  </div>
                </template>
                <template v-else-if="mapping.target.type === 'group_master'">
                  <div class="col-12">
                    <q-select v-model="mapping.target.groupName" :options="groupOptions" dense filled dark label="Group" />
                  </div>
                </template>
                <template v-else-if="mapping.target.type === 'cue_trigger' || mapping.target.type === 'cue_stack_go'">
                  <div class="col-12">
                    <q-select v-model="mapping.target.cueId" :options="cueOptions" dense filled dark emit-value map-options label="Cue" />
                  </div>
                </template>
                <template v-else-if="mapping.target.type === 'preset'">
                  <div class="col-12">
                    <q-select
                      v-model="mapping.target.presetId"
                      :options="presetOptions"
                      dense
                      filled
                      dark
                      emit-value
                      map-options
                      label="Preset"
                    />
                  </div>
                </template>
                <template v-else>
                  <div class="col-12 text-caption text-grey-5 q-pt-xs">
                    Target: {{ targetSummary(mapping.target) }}
                  </div>
                </template>
              </div>
            </q-item>
          </q-list>
        </q-tab-panel>
      </q-tab-panels>
    </q-card-section>

      <q-card-actions align="between" class="q-px-md q-pb-md">
        <q-btn flat color="orange-4" label="Stop Learn" @click="stopLearning" />
        <div class="row q-gutter-sm">
          <q-btn flat color="grey-5" label="Cancel" @click="cancel" />
          <q-btn color="primary" label="Save Bindings" @click="saveBindings" />
        </div>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.bindings-card {
  width: min(1000px, 96vw);
}
</style>
