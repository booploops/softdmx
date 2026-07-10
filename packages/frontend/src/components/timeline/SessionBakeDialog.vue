<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  bakeSessionToKeyframe,
  bakeSessionToPresetTargets,
  type ProgrammerSession,
} from '@softdmx/engine';
import { useShowStore } from 'src/stores/show';
import { useCueStore } from 'src/stores/cue';
import { useTimelineEditorStore } from 'src/stores/timeline-editor';
import { useSessionReplay } from 'src/composables/useSessionReplay';
import { createAlert } from 'src/lib/CommonDialogs';

const props = defineProps<{
  session: ProgrammerSession;
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [boolean];
  ok: [{ mode: 'preset' | 'keyframe'; presetId?: string; cueId?: string; channelCount: number }];
}>();

const showStore = useShowStore();
const cueStore = useCueStore();
const timelineEditor = useTimelineEditorStore();
const replay = useSessionReplay(props.session);

const bakeMode = ref<'preset' | 'keyframe'>('preset');
const presetName = ref(`${props.session.name} Bake`);
const clientIdFilter = ref('');
const atSec = ref(
  props.session.events.length > 0
    ? Math.max(...props.session.events.map((event) => event.tSec))
    : 0
);
const previewCount = ref(0);
const errorMessage = ref('');

const operatorOptions = computed(() => {
  const clientIds = new Set(
    props.session.events.map((event) => event.clientId).filter((clientId): clientId is string => Boolean(clientId))
  );
  return [
    { label: 'Merged (all operators)', value: '' },
    ...Array.from(clientIds).map((clientId) => ({
      label:
        props.session.events.find((event) => event.clientId === clientId)?.meta?.operatorLabel ??
        clientId,
      value: clientId,
    })),
  ];
});

const clientIdFilterValue = computed(() => clientIdFilter.value || null);

function refreshPreview() {
  replay.setClientIdFilter(clientIdFilterValue.value);
  replay.seek(atSec.value);
  previewCount.value = replay.entries.value.length;
}

watch(
  [clientIdFilter, atSec, () => props.session.id],
  () => refreshPreview(),
  { immediate: true }
);

function close() {
  emit('update:modelValue', false);
}

async function applyBake() {
  errorMessage.value = '';
  replay.setClientIdFilter(clientIdFilterValue.value);
  replay.seek(atSec.value);

  if (bakeMode.value === 'preset') {
    const targets = bakeSessionToPresetTargets(replay.filteredEvents.value, atSec.value, {
      clientId: clientIdFilterValue.value ?? undefined,
    });
    if (targets.length === 0) {
      errorMessage.value = 'Nothing to bake at this time.';
      return;
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    showStore.updateDocument((doc) => {
      doc.presets.push({
        id,
        name: presetName.value || `${props.session.name} Bake`,
        targets,
      });
    });
    emit('ok', { mode: 'preset', presetId: id, channelCount: targets.length });
    close();
    return;
  }

  const absoluteSec = props.session.anchorSec + atSec.value;
  const cueId = timelineEditor.createTimelineCue(
    `${props.session.name} Bake`,
    absoluteSec,
    absoluteSec + 1
  );
  const frame = bakeSessionToKeyframe(replay.filteredEvents.value, atSec.value, {
    clientId: clientIdFilterValue.value ?? undefined,
  });

  let applied = false;
  showStore.updateDocument((doc) => {
    const cue = doc.cues.find((entry) => entry.id === cueId);
    const layer = cue?.layers?.[0];
    if (!layer) return;
    layer.frames.push(frame);
    if (cue) {
      cue.modified = new Date().toISOString();
      cue.totalDuration = layer.frames.reduce((sum, entry) => sum + (entry.duration || 1000), 0);
    }
    applied = true;
  });

  if (!applied) {
    errorMessage.value = 'Could not bake into cue — missing layer.';
    await createAlert({
      title: 'Bake failed',
      message: errorMessage.value,
    });
    return;
  }

  cueStore.activeCueId = cueId;
  cueStore.activeLayerId = showStore.document.cues.find((cue) => cue.id === cueId)?.layers?.[0]?.id ?? null;
  emit('ok', { mode: 'keyframe', cueId, channelCount: frame.channels?.length ?? 0 });
  close();
}
</script>

<template>
  <XDialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <XDialogHeader title="Bake Session" />
    <XDialogBody class="session-bake-dialog__body">
      <div class="session-bake-dialog__caption">{{ props.session.name }}</div>

      <XButtonGroup size="sm">
        <XButton
          :color="bakeMode === 'preset' ? 'primary' : 'default'"
          label="Preset"
          @click="bakeMode = 'preset'"
        />
        <XButton
          :color="bakeMode === 'keyframe' ? 'primary' : 'default'"
          label="Cue keyframe"
          @click="bakeMode = 'keyframe'"
        />
      </XButtonGroup>

      <XSelect
        v-model="clientIdFilter"
        :options="operatorOptions"
        label="Operator scope"
      />

      <XInput
        v-model.number="atSec"
        type="number"
        label="Bake at (seconds)"
      />

      <XInput
        v-if="bakeMode === 'preset'"
        v-model="presetName"
        label="Preset name"
      />

      <div class="session-bake-dialog__preview">
        Preview: {{ previewCount }} channel{{ previewCount === 1 ? '' : 's' }} at {{ Number(atSec).toFixed(2) }}s
      </div>
      <div
        v-if="errorMessage"
        class="session-bake-dialog__error"
      >
        {{ errorMessage }}
      </div>
    </XDialogBody>
    <XDialogFooter>
      <XButton
        label="Cancel"
        flat
        color="default"
        @click="close"
      />
      <XButton
        label="Bake"
        color="primary"
        :disable="previewCount === 0"
        @click="applyBake"
      />
    </XDialogFooter>
  </XDialog>
</template>

<style scoped>
.session-bake-dialog__body {
  display: grid;
  gap: 12px;
  min-width: min(420px, 92vw);
}

.session-bake-dialog__caption {
  font-size: 13px;
  color: var(--sdmx-color-text-muted);
}

.session-bake-dialog__preview {
  font-size: 12px;
  color: var(--sdmx-color-text-muted);
}

.session-bake-dialog__error {
  font-size: 12px;
  color: var(--sdmx-color-danger, #ff453a);
}
</style>
