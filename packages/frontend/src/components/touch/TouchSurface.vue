<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { TouchControl, TouchPage } from '@softdmx/engine';
import { useIOClient } from 'src/lib/io-client';
import { useShowStore } from 'src/stores/show';
import { createDefaultTouchConfig } from '@softdmx/engine';
import { useInfoText } from 'src/composables/useInfoText';
import type { TooltipKey } from 'src/lib/info-text';
import { contrastingSurfaceStyle } from 'src/lib/preset-button-style';

type AudioMetersPayload = {
  rms?: number;
  peak?: number;
};

const props = defineProps<{
  page?: TouchPage | null;
}>();

const socket = useIOClient();
const showStore = useShowStore();
const { info } = useInfoText();

const grandMaster = ref(1);
const blackout = ref(false);
const presetFadeMs = ref(300);
const audioMeters = ref({ rms: 0, peak: 0 });

const resolvedPage = computed(() => {
  if (props.page) return props.page;
  return showStore.document.touch?.pages[0] ?? createDefaultTouchConfig(showStore.document).pages[0]!;
});

function controlStyle(control: TouchControl) {
  return {
    gridColumn: `${control.rect.x + 1} / span ${control.rect.w}`,
    gridRow: `${control.rect.y + 1} / span ${control.rect.h}`,
    ...contrastingSurfaceStyle(control.color),
  };
}

function touchControlInfo(control: TouchControl): string {
  const label = control.label ?? control.type;
  const keyByType: Record<string, TooltipKey> = {
    'preset-button': 'remote.touch.presetButton',
    'executor-button': 'remote.touch.executorButton',
    blackout: 'remote.touch.blackout',
    'cue-go': 'remote.touch.cueGo',
    'grand-master': 'remote.touch.grandMaster',
    'audio-meter': 'remote.touch.audioMeter',
  };
  const key = keyByType[control.type];
  return key ? info(key, { label }) : label;
}
function onControlClick(control: TouchControl) {
  switch (control.type) {
    case 'preset-button':
      if (control.presetId) {
        socket.emit('preset:fire', { presetId: control.presetId, fade: presetFadeMs.value });
      }
      break;
    case 'executor-button':
      if (control.slotId) socket.emit('executor:trigger', { slotId: control.slotId });
      break;
    case 'blackout':
      blackout.value = !blackout.value;
      socket.emit('blackout', blackout.value);
      break;
    case 'cue-go':
      if (control.cueId) socket.emit('cue:play', { cueId: control.cueId });
      break;
    default:
      break;
  }
}

function setGrandMaster(value: number) {
  grandMaster.value = value;
  socket.emit('grandmaster', value);
}

onMounted(() => {
  socket.on('audio:meters', (payload: AudioMetersPayload) => {
    audioMeters.value = {
      rms: payload.rms ?? 0,
      peak: payload.peak ?? 0,
    };
  });
});

onBeforeUnmount(() => {
  socket.off('audio:meters');
});
</script>

<template>
  <div
    class="touch-surface"
    :style="{
      gridTemplateColumns: `repeat(${resolvedPage.cols}, minmax(0, 1fr))`,
      gridTemplateRows: `repeat(${resolvedPage.rows}, minmax(48px, auto))`,
    }"
  >
    <template v-for="control in resolvedPage.controls" :key="control.id">
      <div
        v-if="control.type === 'grand-master'"
        class="touch-control touch-control--gm"
        :style="controlStyle(control)"
        :data-sdmx-info="touchControlInfo(control)"
      >
        <div class="text-caption">GM {{ Math.round(grandMaster * 100) }}%</div>
        <q-slider
          :model-value="grandMaster"
          :min="0"
          :max="1"
          :step="0.01"
          color="primary"
          @update:model-value="(v) => setGrandMaster(Number(v ?? 0))"
        />
      </div>
      <div
        v-else-if="control.type === 'audio-meter'"
        class="touch-control"
        :style="controlStyle(control)"
        :data-sdmx-info="touchControlInfo(control)"
      >
        <div class="text-caption">Audio</div>
        <q-linear-progress :value="audioMeters.rms" color="positive" />
      </div>
      <button
        v-else
        type="button"
        class="touch-control"
        :class="{ 'touch-control--blackout': control.type === 'blackout' && blackout }"
        :style="controlStyle(control)"
        :data-sdmx-info="touchControlInfo(control)"
        @click="onControlClick(control)"
      >
        {{ control.label ?? control.type }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.touch-control--gm {
  flex-direction: column;
  gap: 4px;
  padding: 8px;
}
.touch-control--blackout {
  background: var(--sdmx-color-negative) !important;
  color: white;
}
button.touch-control {
  cursor: pointer;
}
</style>
