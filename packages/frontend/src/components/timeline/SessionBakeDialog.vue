<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import {
  bakeSessionToKeyframe,
  bakeSessionToPresetTargets,
  type ProgrammerSession,
} from '@softdmx/engine';
import { useShowStore } from 'src/stores/show';
import { useCueStore } from 'src/stores/cue';
import { useTimelineEditorStore } from 'src/stores/timeline-editor';
import { useSessionReplay } from 'src/composables/useSessionReplay';
import XButton from 'src/components/controls/XButton.vue';

const props = defineProps<{
  session: ProgrammerSession;
}>();

defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

const showStore = useShowStore();
const cueStore = useCueStore();
const timelineEditor = useTimelineEditorStore();
const replay = useSessionReplay(props.session);

const bakeMode = ref<'preset' | 'keyframe'>('preset');
const presetName = ref(`${props.session.name} Bake`);
const clientIdFilter = ref<string | null>(null);
const atSec = ref(
  props.session.events.length > 0
    ? Math.max(...props.session.events.map((event) => event.tSec))
    : 0
);

const operatorOptions = computed(() => {
  const clientIds = new Set(
    props.session.events.map((event) => event.clientId).filter((clientId): clientId is string => Boolean(clientId))
  );
  return [
    { label: 'Merged (all operators)', value: null },
    ...Array.from(clientIds).map((clientId) => ({
      label:
        props.session.events.find((event) => event.clientId === clientId)?.meta?.operatorLabel ??
        clientId,
      value: clientId,
    })),
  ];
});

const previewCount = computed(() => {
  replay.setClientIdFilter(clientIdFilter.value);
  replay.seek(atSec.value);
  return replay.entries.value.length;
});

function applyBake() {
  replay.setClientIdFilter(clientIdFilter.value);
  replay.seek(atSec.value);

  if (bakeMode.value === 'preset') {
    const targets = bakeSessionToPresetTargets(replay.filteredEvents.value, atSec.value, {
      clientId: clientIdFilter.value ?? undefined,
    });
    if (targets.length === 0) return;

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    showStore.updateDocument((doc) => {
      doc.presets.push({
        id,
        name: presetName.value || `${props.session.name} Bake`,
        targets,
      });
    });
    onDialogOK({ mode: 'preset', presetId: id, channelCount: targets.length });
    return;
  }

  const cueId = timelineEditor.ensureTimelineCue(`${props.session.name} Bake`);
  const frame = bakeSessionToKeyframe(replay.filteredEvents.value, atSec.value, {
    clientId: clientIdFilter.value ?? undefined,
  });

  showStore.updateDocument((doc) => {
    const cue = doc.cues.find((entry) => entry.id === cueId);
    const layer = cue?.layers?.[0];
    if (!layer) return;
    layer.frames.push(frame);
    if (cue) {
      cue.modified = new Date().toISOString();
      cue.totalDuration = layer.frames.reduce((sum, entry) => sum + (entry.duration || 1000), 0);
    }
  });

  cueStore.activeCueId = cueId;
  cueStore.activeLayerId = showStore.document.cues.find((cue) => cue.id === cueId)?.layers?.[0]?.id ?? null;
  onDialogOK({ mode: 'keyframe', cueId, channelCount: frame.channels.length });
}
</script>

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="sdmx-dialog-card q-dialog-plugin" style="min-width: 420px">
      <q-card-section class="row items-center q-pb-md sdmx-border-bottom">
        <div class="text-h6 font-weight-bold">Bake Session</div>
      </q-card-section>

      <q-card-section class="q-gutter-md">
        <div class="text-body2 text-grey-5">{{ props.session.name }}</div>

        <q-btn-toggle
          v-model="bakeMode"
          toggle-color="primary"
          dense
          unelevated
          :options="[
            { label: 'Preset', value: 'preset' },
            { label: 'Cue keyframe', value: 'keyframe' },
          ]"
        />

        <q-select
          v-model="clientIdFilter"
          :options="operatorOptions"
          emit-value
          map-options
          dense
          label="Operator scope"
        />

        <q-input
          v-model.number="atSec"
          type="number"
          dense
          label="Bake at (seconds)"
          :min="0"
          :step="0.1"
        />

        <q-input
          v-if="bakeMode === 'preset'"
          v-model="presetName"
          dense
          label="Preset name"
        />

        <div class="text-caption text-grey-5">
          Preview: {{ previewCount }} channel{{ previewCount === 1 ? '' : 's' }} at {{ atSec.toFixed(2) }}s
        </div>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md sdmx-border-top">
        <XButton label="Cancel" flat color="default" @click="onDialogCancel" />
        <XButton label="Bake" color="primary" :disable="previewCount === 0" @click="applyBake" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
