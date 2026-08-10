<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<!--
  Purpose: Timeline-based cue editor for lighting shows
-->
<script setup lang="ts">
import {
  SdmxButton,
  SdmxEmptyState,
  SdmxIconButton,
  SdmxSelect,
  SdmxStatusChip,
  SdmxToggle,
  SdmxWindowChrome,
} from 'src/components/ui';
import { useCueStore } from 'src/stores/cue';
import { useShowStore } from 'src/stores/show';
import { createMenu } from 'src/lib/menus';
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import type { CueLayer, RecordedFrame, StackStep } from '@softdmx/engine';
import { formatSmpte, parseSmpteInput } from '@softdmx/engine';

const cueStore = useCueStore();
const showStore = useShowStore();
const emit = defineEmits<{ close: [] }>();
const activeCueLayers = computed(() => cueStore.activeCue?.layers ?? []);
const isTimelineCue = computed(() => cueStore.activeCue?.view !== 'stack');
const cueOptions = computed(() =>
  cueStore.cues.map((cue) => ({ label: cue.name, value: cue.id })),
);
const presetOptions = computed(() =>
  showStore.document.presets.map((preset) => ({ label: preset.name, value: preset.id })),
);
const layerOptions = computed(() =>
  activeCueLayers.value.map((layer) => ({ label: layer.name, value: layer.id })),
);
const blendModeOptions = ['replace', 'add', 'multiply', 'screen'];
const stackFollowOptions = [
  { label: 'Manual', value: 'manual' },
  { label: 'Auto', value: 'auto' },
  { label: 'Time', value: 'timed' },
];
const frameEasingOptions = [
  'linear',
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'bounce',
  'elastic',
];
const cueViewOptions = [
  { label: 'Timeline', value: 'timeline' },
  { label: 'Stack', value: 'stack' },
];

const showFps = computed(() => showStore.document.timeline?.fps ?? showStore.document.timecode?.fps ?? 30);

const activeCueTimecodeIn = computed({
  get: () => {
    const value = cueStore.activeCue?.timecodeIn;
    return value === undefined ? '' : formatSmpte(value, showFps.value);
  },
  set: (input: string) => {
    if (!cueStore.activeCue) return;
    const parsed = parseSmpteInput(input, showFps.value);
    cueStore.activeCue.timecodeIn = parsed === null ? undefined : parsed;
    cueStore.updateCueModified();
  },
});

const activeCueTimecodeOut = computed({
  get: () => {
    const value = cueStore.activeCue?.timecodeOut;
    return value === undefined ? '' : formatSmpte(value, showFps.value);
  },
  set: (input: string) => {
    if (!cueStore.activeCue) return;
    const parsed = parseSmpteInput(input, showFps.value);
    cueStore.activeCue.timecodeOut = parsed === null ? undefined : parsed;
    cueStore.updateCueModified();
  },
});

const timelineContainer = ref<HTMLElement>();
const timelineWidth = ref(800);
let resizeObserver: ResizeObserver | null = null;

const isDragging = ref(false);
const dragStartTime = ref(0);
const dragStartX = ref(0);
const dragFrameData = ref<{ layerId: string; frameIndex: number; originalStartTime: number } | null>(
  null,
);
const selectedFrame = ref<{ layerId: string; frameIndex: number } | null>(null);
const selectedFrameId = computed(() =>
  selectedFrame.value ? `${selectedFrame.value.layerId}-${selectedFrame.value.frameIndex}` : null,
);

const timelineScale = computed(() => {
  return timelineWidth.value / Math.max(cueStore.totalDuration, 10000);
});

const playheadPosition = computed(() => {
  return cueStore.timelinePosition * timelineScale.value;
});

const timelineMarkers = computed(() => {
  const markers = [];
  const interval = 1000;
  const maxTime = Math.max(cueStore.totalDuration, 10000);

  for (let time = 0; time <= maxTime; time += interval) {
    markers.push({
      time,
      position: time * timelineScale.value,
      label: `${Math.floor(time / 1000)}s`,
    });
  }

  return markers;
});

const timelineContentHeight = computed(() => Math.max(activeCueLayers.value.length * 60 + 48, 180));

const showAddLayerDialog = ref(false);
const newLayerName = ref('');

const addLayer = () => {
  if (cueStore.activeCue && newLayerName.value.trim()) {
    cueStore.addLayer(cueStore.activeCue.id, newLayerName.value.trim());
    newLayerName.value = '';
    showAddLayerDialog.value = false;
  }
};

const getFramePosition = (layer: CueLayer, frameIndex: number) => {
  let position = 0;
  for (let i = 0; i < frameIndex; i++) {
    position += layer.frames[i]?.duration || 1000;
  }
  return position * timelineScale.value;
};

const getFrameStartTime = (layer: CueLayer, frameIndex: number) => {
  let position = 0;
  for (let i = 0; i < frameIndex; i++) {
    position += layer.frames[i]?.duration || 1000;
  }
  return position;
};

const getFrameWidth = (frame: RecordedFrame) => {
  return (frame.duration || 1000) * timelineScale.value;
};

const getFrameTypeLabel = (frame: RecordedFrame) => {
  if (frame.type === 'preset') return 'Preset';
  if (frame.type === 'delay') return 'Delay';
  return 'Channels';
};

const handleTimelineClick = (event: MouseEvent) => {
  if (!timelineContainer.value) return;

  const rect = timelineContainer.value.getBoundingClientRect();
  const x = event.clientX - rect.left + timelineContainer.value.scrollLeft;
  const time = x / timelineScale.value;
  const snappedTime = cueStore.snapToGrid(time);

  cueStore.setTimelinePosition(snappedTime);
};

const selectFrame = (layerId: string, frameIndex: number) => {
  selectedFrame.value = { layerId, frameIndex };
  cueStore.activeLayerId = layerId;
  cueStore.activeFrameIndex = frameIndex;
};

const handleFrameMouseDown = (event: MouseEvent, layerId: string, frameIndex: number) => {
  event.stopPropagation();

  const layer = cueStore.activeCue?.layers?.find((l) => l.id === layerId);
  if (!layer) return;

  isDragging.value = true;
  dragStartX.value = event.clientX;
  dragStartTime.value = getFrameStartTime(layer, frameIndex);
  selectFrame(layerId, frameIndex);

  dragFrameData.value = {
    layerId,
    frameIndex,
    originalStartTime: dragStartTime.value,
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

const handleMouseMove = (event: MouseEvent) => {
  if (!isDragging.value || !dragFrameData.value || !cueStore.activeCue) return;

  const deltaX = event.clientX - dragStartX.value;
  const deltaTime = deltaX / timelineScale.value;
  const newStartTime = Math.max(0, dragFrameData.value.originalStartTime + deltaTime);
  const snappedTime = cueStore.snapToGrid(newStartTime);

  const layer = activeCueLayers.value.find((l) => l.id === dragFrameData.value!.layerId);
  if (!layer) return;

  const frame = layer.frames[dragFrameData.value.frameIndex];
  if (!frame) return;

  const currentStartTime = getFrameStartTime(layer, dragFrameData.value.frameIndex);
  const timeDiff = snappedTime - currentStartTime;

  if (Math.abs(timeDiff) > 10) {
    let newIndex = 0;
    let accumulatedTime = 0;

    for (let i = 0; i < layer.frames.length; i++) {
      if (i === dragFrameData.value.frameIndex) continue;

      const frameEnd = accumulatedTime + (layer.frames[i]?.duration || 1000);

      if (snappedTime < frameEnd) {
        newIndex = i;
        break;
      }

      accumulatedTime += layer.frames[i]?.duration || 1000;
      newIndex = i + 1;
    }

    if (newIndex > dragFrameData.value.frameIndex) {
      newIndex--;
    }

    if (newIndex !== dragFrameData.value.frameIndex) {
      cueStore.moveFrame(dragFrameData.value.layerId, dragFrameData.value.frameIndex, newIndex);
      dragFrameData.value.frameIndex = newIndex;
      dragFrameData.value.originalStartTime = getFrameStartTime(layer, newIndex);
    }
  }
};

const handleMouseUp = () => {
  isDragging.value = false;
  dragFrameData.value = null;

  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
};

const playPause = () => {
  if (cueStore.activeCue) {
    const isPlaying = cueStore.playbackStates.has(cueStore.activeCue.id);
    if (isPlaying) {
      cueStore.pauseCue(cueStore.activeCue.id);
    } else {
      cueStore.playCue(cueStore.activeCue.id);
    }
  }
};

const stop = () => {
  if (cueStore.activeCue) {
    cueStore.stopCue(cueStore.activeCue.id);
    cueStore.setTimelinePosition(0);
  }
};

const record = () => {
  if (!isTimelineCue.value) return;
  cueStore.recordFrame();
};

const showAddCueDialog = ref(false);
const newCueName = ref('');

const addCue = () => {
  if (newCueName.value.trim()) {
    cueStore.addCue(newCueName.value.trim(), 'timeline');
    newCueName.value = '';
    showAddCueDialog.value = false;
  }
};

const updateActiveCueView = (value: string | number | boolean | null) => {
  if (!cueStore.activeCue) return;
  const view = value === 'stack' ? 'stack' : 'timeline';
  cueStore.setCueView(cueStore.activeCue.id, view);
};

const updateTimelineWidth = () => {
  if (timelineContainer.value) {
    timelineWidth.value = Math.max(320, timelineContainer.value.clientWidth);
  }
};

onMounted(() => {
  updateTimelineWidth();
  if (typeof ResizeObserver !== 'undefined' && timelineContainer.value) {
    resizeObserver = new ResizeObserver(() => updateTimelineWidth());
    resizeObserver.observe(timelineContainer.value);
  } else {
    window.addEventListener('resize', updateTimelineWidth);
  }
});

watch(timelineContainer, (el) => {
  resizeObserver?.disconnect();
  if (!el) return;
  updateTimelineWidth();
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => updateTimelineWidth());
    resizeObserver.observe(el);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  window.removeEventListener('resize', updateTimelineWidth);
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
});

const showFrameContextMenu = (event: MouseEvent, layerId: string, frameIndex: number) => {
  selectFrame(layerId, frameIndex);

  const menu = createMenu([
    {
      label: 'Copy Frame',
      click: () => {
        cueStore.copyFrames(layerId, [frameIndex]);
      },
    },
    {
      label: 'Paste After',
      enabled: cueStore.clipboard.length > 0,
      click: () => {
        cueStore.pasteFrames(layerId, frameIndex + 1);
      },
    },
    {
      label: 'Duplicate Frame',
      click: () => {
        const layer = activeCueLayers.value.find((l) => l.id === layerId);
        if (layer) {
          const frame = layer.frames[frameIndex];
          if (frame) {
            const duplicated = { ...frame, name: `${frame.name} Copy` };
            layer.frames.splice(frameIndex + 1, 0, duplicated);
            cueStore.updateCueModified();
          }
        }
      },
    },
    {
      label: 'Delete Frame',
      click: () => {
        cueStore.deleteFrame(layerId, frameIndex);
      },
    },
  ]);

  menu.show(event.clientX, event.clientY);
};

const copySelectedFrames = () => {
  if (!selectedFrame.value) return;
  cueStore.copyFrames(selectedFrame.value.layerId, [selectedFrame.value.frameIndex]);
};

const pasteFramesAfterSelection = () => {
  const layerId = selectedFrame.value?.layerId ?? cueStore.activeLayerId;
  if (!layerId) return;
  const atIndex = selectedFrame.value
    ? selectedFrame.value.frameIndex + 1
    : (activeCueLayers.value.find((l) => l.id === layerId)?.frames.length ?? 0);
  cueStore.pasteFrames(layerId, atIndex);
};

const showPresetFrameDialog = ref(false);
const presetFrameLayerId = ref<string | null>(null);
const presetFramePresetId = ref<string | null>(null);
const presetFrameDuration = ref(1000);
const presetFrameName = ref('');
const presetFrameEasing = ref<RecordedFrame['easing']>('linear');

const openPresetFrameDialog = () => {
  if (!cueStore.activeCue) return;
  presetFrameLayerId.value = cueStore.activeLayerId ?? cueStore.activeCue.layers?.[0]?.id ?? null;
  presetFramePresetId.value = presetOptions.value[0]?.value ?? null;
  presetFrameDuration.value = 1000;
  presetFrameEasing.value = 'linear';
  const presetName =
    showStore.document.presets.find((p) => p.id === presetFramePresetId.value)?.name ?? 'Preset';
  presetFrameName.value = `${presetName} Frame`;
  showPresetFrameDialog.value = true;
};

const addPresetFrame = () => {
  if (!presetFrameLayerId.value || !presetFramePresetId.value) return;
  const layer = activeCueLayers.value.find((l) => l.id === presetFrameLayerId.value);
  if (!layer) return;

  const presetName =
    showStore.document.presets.find((p) => p.id === presetFramePresetId.value)?.name ?? 'Preset';
  layer.frames.push({
    name: presetFrameName.value.trim() || `${presetName} Frame`,
    type: 'preset',
    presetId: presetFramePresetId.value,
    duration: Math.max(1, presetFrameDuration.value || 1000),
    easing: presetFrameEasing.value ?? 'linear',
  });
  cueStore.activeLayerId = layer.id;
  cueStore.activeFrameIndex = layer.frames.length - 1;
  selectFrame(layer.id, layer.frames.length - 1);
  cueStore.updateCueModified();
  showPresetFrameDialog.value = false;
};

const showDelayFrameDialog = ref(false);
const delayFrameLayerId = ref<string | null>(null);
const delayFrameDuration = ref(1000);
const delayFrameName = ref('Delay');

const openDelayFrameDialog = () => {
  if (!cueStore.activeCue) return;
  delayFrameLayerId.value = cueStore.activeLayerId ?? cueStore.activeCue.layers?.[0]?.id ?? null;
  delayFrameDuration.value = 1000;
  delayFrameName.value = 'Delay';
  showDelayFrameDialog.value = true;
};

const addDelayFrame = () => {
  if (!delayFrameLayerId.value) return;
  const layer = activeCueLayers.value.find((l) => l.id === delayFrameLayerId.value);
  if (!layer) return;

  const duration = Math.max(1, delayFrameDuration.value || 1000);
  layer.frames.push({
    name: delayFrameName.value.trim() || 'Delay',
    type: 'delay',
    duration,
    delayDuration: duration,
    easing: 'linear',
  });
  cueStore.activeLayerId = layer.id;
  cueStore.activeFrameIndex = layer.frames.length - 1;
  selectFrame(layer.id, layer.frames.length - 1);
  cueStore.updateCueModified();
  showDelayFrameDialog.value = false;
};

const createStackStep = (): StackStep => ({
  id: cueStore.generateId(),
  label: `Step ${(cueStore.activeCue?.stack?.length ?? 0) + 1}`,
  presetId: presetOptions.value[0]?.value,
  fadeIn: 1000,
  follow: 'manual',
});

const addStackStep = () => {
  if (!cueStore.activeCue || cueStore.activeCue.view !== 'stack') return;
  cueStore.activeCue.stack = cueStore.activeCue.stack ?? [];
  cueStore.activeCue.stack.push(createStackStep());
  cueStore.updateCueModified();
};

const removeStackStep = (index: number) => {
  if (!cueStore.activeCue?.stack) return;
  cueStore.activeCue.stack.splice(index, 1);
  cueStore.updateCueModified();
};

const moveStackStep = (index: number, direction: -1 | 1) => {
  if (!cueStore.activeCue?.stack) return;
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= cueStore.activeCue.stack.length) return;
  const [step] = cueStore.activeCue.stack.splice(index, 1);
  if (!step) return;
  cueStore.activeCue.stack.splice(nextIndex, 0, step);
  cueStore.updateCueModified();
};

const normalizeStackStep = (step: StackStep) => {
  if ((step as { follow?: string }).follow === 'go') {
    step.follow = 'auto';
  }
  if (step.follow === 'timed' && (!step.followTime || step.followTime < 0)) {
    step.followTime = 1000;
  }
  if (step.follow !== 'timed') {
    step.followTime = undefined;
  }
  step.fadeIn = Math.max(0, step.fadeIn || 0);
  cueStore.updateCueModified();
};

function updateActiveCueName(value: string | number | null) {
  if (!cueStore.activeCue) return;
  cueStore.activeCue.name = String(value ?? '');
  cueStore.updateCueModified();
}

function updateActiveCuePriority(value: string | number | null) {
  if (!cueStore.activeCue) return;
  cueStore.activeCue.priority = Number(value ?? 0);
  cueStore.updateCueModified();
}
</script>

<template>
  <SdmxWindowChrome
    class="cue-editor"
    title="Cue Editor"
    icon="movie"
    info="desk.cueList.openEditor"
    closable
    close-info="program.cues.closeEditor"
    @close="emit('close')"
  >
    <template #actions>
      <SdmxStatusChip
        v-if="cueStore.activeCue"
        :label="isTimelineCue ? 'Timeline' : 'Stack'"
        :variant="isTimelineCue ? 'info' : 'armed'"
      />
    </template>

    <div class="cue-editor__body">
      <header class="cue-editor__toolbar">
        <div class="cue-editor__toolbar-group">
          <SdmxButton
            size="sm"
            icon="plus"
            label="New timeline"
            variant="primary"
            info="program.cues.addCue"
            @click="showAddCueDialog = true"
          />
          <SdmxButton
            v-if="cueStore.activeCue"
            size="sm"
            icon="copy"
            label="Duplicate"
            variant="ghost"
            @click="cueStore.duplicateCue(cueStore.activeCue.id)"
          />
          <SdmxButton
            v-if="cueStore.activeCue"
            size="sm"
            icon="trash"
            label="Delete"
            variant="danger"
            @click="cueStore.deleteCue(cueStore.activeCue.id)"
          />
        </div>

        <div class="cue-editor__toolbar-group">
          <SdmxIconButton
            :icon="cueStore.isGlobalPlaying ? 'player-pause-filled' : 'player-play-filled'"
            info-key="program.cues.playPause"
            :disable="!cueStore.activeCue"
            @click="playPause"
          />
          <SdmxIconButton
            icon="square"
            info-key="program.cues.stop"
            :disable="!cueStore.activeCue"
            @click="stop"
          />
          <SdmxIconButton
            icon="circle-filled"
            color="negative"
            info-key="program.cues.record"
            :disable="!isTimelineCue"
            @click="record"
          />
        </div>

        <div
          v-if="isTimelineCue"
          class="cue-editor__toolbar-group cue-editor__toolbar-group--grow"
        >
          <SdmxButton
            size="sm"
            variant="ghost"
            icon="folder-plus"
            label="Preset"
            @click="openPresetFrameDialog"
          />
          <SdmxButton
            size="sm"
            variant="ghost"
            icon="hourglass"
            label="Delay"
            @click="openDelayFrameDialog"
          />
          <SdmxButton
            size="sm"
            variant="ghost"
            icon="copy"
            label="Copy"
            :disabled="!selectedFrame"
            @click="copySelectedFrames"
          />
          <SdmxButton
            size="sm"
            variant="ghost"
            icon="clipboard"
            label="Paste"
            :disabled="cueStore.clipboard.length === 0"
            @click="pasteFramesAfterSelection"
          />
          <SdmxToggle
            v-model="cueStore.timelineSnapping"
            label="Snap"
            :info="'program.cues.snap'"
          />
          <XInput
            v-model.number="cueStore.snapInterval"
            class="cue-editor__snap-input"
            type="number"
            label="Snap ms"
            dense
          />
          <div class="cue-editor__zoom">
            <span class="sdmx-text-caption">Zoom</span>
            <XSlider
              v-model="cueStore.timelineZoom"
              :min="0.1"
              :max="5"
              :step="0.1"
            />
          </div>
        </div>
      </header>

      <section
        v-if="cueStore.activeCue"
        class="cue-editor__meta"
      >
        <SdmxSelect
          :model-value="cueStore.activeCueId"
          :options="cueOptions"
          label="Active cue"
          size="sm"
          class="cue-editor__cue-select"
          @update:model-value="(value) => (cueStore.activeCueId = String(value ?? ''))"
        />
        <XInput
          :model-value="cueStore.activeCue.name"
          label="Name"
          dense
          class="cue-editor__name-input"
          @update:model-value="updateActiveCueName"
        />
        <SdmxSelect
          :model-value="cueStore.activeCue.view"
          :options="cueViewOptions"
          label="Type"
          size="sm"
          info="program.cues.cueType"
          class="cue-editor__view-select"
          @update:model-value="updateActiveCueView"
        />
        <SdmxToggle
          v-model="cueStore.activeCue.isLooping"
          label="Loop"
        />
        <XInput
          :model-value="cueStore.activeCue.priority"
          type="number"
          label="Priority"
          dense
          class="cue-editor__priority-input"
          @update:model-value="updateActiveCuePriority"
        />
        <template v-if="isTimelineCue">
          <XInput
            v-model="activeCueTimecodeIn"
            label="TC In"
            dense
            class="cue-editor__tc-input"
          />
          <XInput
            v-model="activeCueTimecodeOut"
            label="TC Out"
            dense
            class="cue-editor__tc-input"
          />
        </template>
      </section>

      <div
        v-if="cueStore.activeCue && isTimelineCue"
        class="cue-editor__workspace"
      >
        <aside class="cue-editor__layers">
          <div class="cue-editor__layers-header">
            <span class="sdmx-text-label">Layers</span>
            <SdmxIconButton
              icon="plus"
              info-key="program.cues.addLayer"
              @click="showAddLayerDialog = true"
            />
          </div>
          <div class="cue-editor__layer-list">
            <div
              v-for="layer in activeCueLayers"
              :key="layer.id"
              class="cue-editor__layer-item"
              :class="{ active: cueStore.activeLayerId === layer.id }"
              @click="cueStore.activeLayerId = layer.id"
            >
              <div class="cue-editor__layer-controls">
                <SdmxToggle
                  v-model="layer.enabled"
                  label=""
                />
                <SdmxIconButton
                  v-if="layer.solo"
                  icon="volume"
                  info-key="program.cues.soloOff"
                  @click.stop="layer.solo = false"
                />
                <SdmxIconButton
                  v-else
                  icon="volume-off"
                  info-key="program.cues.soloOn"
                  @click.stop="layer.solo = true"
                />
              </div>
              <div class="cue-editor__layer-info">
                <div class="cue-editor__layer-name">{{ layer.name }}</div>
                <div class="cue-editor__layer-meta">
                  <SdmxSelect
                    v-model="layer.blendMode"
                    :options="blendModeOptions"
                    size="sm"
                    dense
                  />
                  <XSlider
                    v-model="layer.opacity"
                    :min="0"
                    :max="1"
                    :step="0.1"
                    class="cue-editor__opacity"
                  />
                </div>
              </div>
              <SdmxIconButton
                icon="trash"
                color="negative"
                info-key="program.cues.deleteLayer"
                @click.stop="cueStore.deleteLayer(cueStore.activeCue!.id, layer.id)"
              />
            </div>
            <SdmxEmptyState
              v-if="!activeCueLayers.length"
              icon="layers-off"
              title="No layers"
              hint="Add a layer to start placing frames on the timeline."
            />
          </div>
        </aside>

        <div class="cue-editor__timeline">
          <div class="cue-editor__ruler">
            <div
              v-for="marker in timelineMarkers"
              :key="marker.time"
              class="cue-editor__marker"
              :style="{ left: `${marker.position}px` }"
            >
              <div class="cue-editor__marker-line" />
              <div class="cue-editor__marker-label sdmx-text-mono">{{ marker.label }}</div>
            </div>
          </div>
          <div
            ref="timelineContainer"
            class="cue-editor__timeline-content"
            :style="{ minHeight: `${timelineContentHeight}px` }"
            @click="handleTimelineClick"
          >
            <div
              class="cue-editor__playhead"
              :style="{ left: `${playheadPosition}px` }"
            />
            <div
              v-for="(layer, layerIndex) in activeCueLayers"
              :key="layer.id"
              class="cue-editor__track"
              :style="{ top: `${layerIndex * 60 + 8}px` }"
            >
              <div
                v-for="(frame, frameIndex) in layer.frames"
                :key="`${layer.id}-${frameIndex}`"
                class="cue-editor__frame"
                :class="{
                  selected: selectedFrameId === `${layer.id}-${frameIndex}`,
                  active:
                    cueStore.activeLayerId === layer.id && cueStore.activeFrameIndex === frameIndex,
                  dragging: isDragging && selectedFrameId === `${layer.id}-${frameIndex}`,
                  preset: frame.type === 'preset',
                  delay: frame.type === 'delay',
                }"
                :style="{
                  left: `${getFramePosition(layer, frameIndex)}px`,
                  width: `${Math.max(getFrameWidth(frame), 24)}px`,
                }"
                @mousedown="handleFrameMouseDown($event, layer.id, frameIndex)"
                @click.stop="selectFrame(layer.id, frameIndex)"
                @contextmenu.prevent="showFrameContextMenu($event, layer.id, frameIndex)"
              >
                <div class="cue-editor__frame-name">{{ frame.name }}</div>
                <div class="cue-editor__frame-meta sdmx-text-mono">
                  {{ frame.duration }}ms · {{ getFrameTypeLabel(frame) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-else-if="cueStore.activeCue && !isTimelineCue"
        class="cue-editor__stack"
      >
        <div class="cue-editor__stack-header">
          <div>
            <div class="text-subtitle1">{{ cueStore.activeCue.name }}</div>
            <div class="sdmx-text-caption">
              Sequential GO steps. Auto follows after fade-in; Time uses an explicit delay.
            </div>
          </div>
          <SdmxButton
            variant="primary"
            size="sm"
            icon="plus"
            label="Add Step"
            @click="addStackStep"
          />
        </div>

        <SdmxEmptyState
          v-if="!(cueStore.activeCue.stack?.length ?? 0)"
          icon="playlist"
          title="No steps yet"
          hint="Add a step to start building the stack cue."
        />

        <div
          v-else
          class="cue-editor__stack-steps"
        >
          <div
            v-for="(step, index) in cueStore.activeCue.stack"
            :key="step.id"
            class="cue-editor__stack-step"
          >
            <div class="cue-editor__stack-step-header">
              <SdmxStatusChip
                :label="`Step ${index + 1}`"
                variant="info"
              />
              <div class="cue-editor__stack-step-actions">
                <SdmxIconButton
                  icon="arrow-up"
                  info-key="program.cues.moveStepUp"
                  :disable="index === 0"
                  @click="moveStackStep(index, -1)"
                />
                <SdmxIconButton
                  icon="arrow-down"
                  info-key="program.cues.moveStepDown"
                  :disable="index === (cueStore.activeCue.stack?.length ?? 1) - 1"
                  @click="moveStackStep(index, 1)"
                />
                <SdmxIconButton
                  icon="trash"
                  color="negative"
                  info-key="program.cues.deleteStep"
                  @click="removeStackStep(index)"
                />
              </div>
            </div>
            <div class="cue-editor__stack-grid">
              <XInput
                v-model="step.label"
                dense
                label="Step label"
                @blur="cueStore.updateCueModified"
              />
              <XSelect
                v-model="step.presetId"
                :options="presetOptions"
                emit-value
                map-options
                clearable
                dense
                label="Preset"
                @update:model-value="cueStore.updateCueModified"
              />
              <XInput
                v-model.number="step.fadeIn"
                type="number"
                min="0"
                dense
                label="Fade in (ms)"
                @blur="normalizeStackStep(step)"
              />
              <XSelect
                v-model="step.follow"
                :options="stackFollowOptions"
                emit-value
                map-options
                dense
                label="Follow"
                @update:model-value="normalizeStackStep(step)"
              />
              <XInput
                v-if="step.follow === 'timed'"
                v-model.number="step.followTime"
                type="number"
                min="0"
                dense
                label="Follow time (ms)"
                @blur="normalizeStackStep(step)"
              />
            </div>
          </div>
        </div>
      </div>

      <div
        v-else
        class="cue-editor__empty"
      >
        <SdmxEmptyState
          icon="movie"
          title="No cue selected"
          hint="Use New cue in Program → Cues to create a timeline or stack, or add a timeline cue here."
        >
          <SdmxButton
            variant="primary"
            icon="plus"
            label="New timeline cue"
            @click="showAddCueDialog = true"
          />
        </SdmxEmptyState>
      </div>
    </div>

    <XDialog v-model="showAddCueDialog">
      <XDialogHeader title="New Timeline Cue" />
      <XDialogBody class="cue-editor__dialog-body">
        <XInput
          v-model="newCueName"
          label="Cue name"
          autofocus
          @keyup.enter="addCue"
        />
      </XDialogBody>
      <XDialogFooter>
        <XButton
          flat
          label="Cancel"
          color="default"
          @click="showAddCueDialog = false"
        />
        <XButton
          color="primary"
          label="Create"
          :disable="!newCueName.trim()"
          @click="addCue"
        />
      </XDialogFooter>
    </XDialog>

    <XDialog v-model="showAddLayerDialog">
      <XDialogHeader title="New Layer" />
      <XDialogBody class="cue-editor__dialog-body">
        <XInput
          v-model="newLayerName"
          label="Layer name"
          autofocus
          @keyup.enter="addLayer"
        />
      </XDialogBody>
      <XDialogFooter>
        <XButton
          flat
          label="Cancel"
          color="default"
          @click="showAddLayerDialog = false"
        />
        <XButton
          color="primary"
          label="Create"
          :disable="!newLayerName.trim()"
          @click="addLayer"
        />
      </XDialogFooter>
    </XDialog>

    <XDialog v-model="showPresetFrameDialog">
      <XDialogHeader title="Add Preset Frame" />
      <XDialogBody class="cue-editor__dialog-body">
        <XSelect
          v-model="presetFrameLayerId"
          :options="layerOptions"
          emit-value
          map-options
          label="Layer"
        />
        <XSelect
          v-model="presetFramePresetId"
          :options="presetOptions"
          emit-value
          map-options
          label="Preset"
        />
        <XInput
          v-model="presetFrameName"
          label="Frame name"
        />
        <XInput
          v-model.number="presetFrameDuration"
          type="number"
          min="1"
          label="Duration (ms)"
        />
        <XSelect
          v-model="presetFrameEasing"
          :options="frameEasingOptions"
          label="Easing"
        />
      </XDialogBody>
      <XDialogFooter>
        <XButton
          flat
          label="Cancel"
          color="default"
          @click="showPresetFrameDialog = false"
        />
        <XButton
          color="primary"
          label="Add"
          :disable="!presetFrameLayerId || !presetFramePresetId"
          @click="addPresetFrame"
        />
      </XDialogFooter>
    </XDialog>

    <XDialog v-model="showDelayFrameDialog">
      <XDialogHeader title="Add Delay Frame" />
      <XDialogBody class="cue-editor__dialog-body">
        <XSelect
          v-model="delayFrameLayerId"
          :options="layerOptions"
          emit-value
          map-options
          label="Layer"
        />
        <XInput
          v-model="delayFrameName"
          label="Frame name"
        />
        <XInput
          v-model.number="delayFrameDuration"
          type="number"
          min="1"
          label="Duration (ms)"
        />
      </XDialogBody>
      <XDialogFooter>
        <XButton
          flat
          label="Cancel"
          color="default"
          @click="showDelayFrameDialog = false"
        />
        <XButton
          color="primary"
          label="Add"
          :disable="!delayFrameLayerId"
          @click="addDelayFrame"
        />
      </XDialogFooter>
    </XDialog>
  </SdmxWindowChrome>
</template>

<style scoped lang="scss">
.cue-editor {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  border: none;
  border-radius: 0;
}

.cue-editor__body {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  background: var(--sdmx-color-bg-surface);
}

.cue-editor__toolbar,
.cue-editor__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sdmx-space-sm);
  padding: var(--sdmx-space-sm) var(--sdmx-space-md);
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
  background: var(--sdmx-color-bg-toolbar);
  flex-shrink: 0;
}

.cue-editor__toolbar-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sdmx-space-xs);
}

.cue-editor__toolbar-group--grow {
  flex: 1 1 280px;
  min-width: 0;
}

.cue-editor__snap-input {
  width: 96px;
}

.cue-editor__zoom {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-xs);
  min-width: 140px;
  flex: 1 1 160px;
}

.cue-editor__cue-select {
  min-width: 180px;
  flex: 1 1 180px;
}

.cue-editor__name-input {
  min-width: 160px;
  flex: 1 1 160px;
}

.cue-editor__view-select {
  min-width: 140px;
  flex: 0 1 140px;
}

.cue-editor__priority-input,
.cue-editor__tc-input {
  width: 110px;
}

.cue-editor__workspace {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.cue-editor__layers {
  width: min(240px, 34vw);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid var(--sdmx-color-border-subtle);
  background: var(--sdmx-color-bg-elevated);
}

.cue-editor__layers-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sdmx-space-sm) var(--sdmx-space-md);
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
  flex-shrink: 0;
}

.cue-editor__layer-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: var(--sdmx-space-xs);
}

.cue-editor__layer-item {
  display: flex;
  align-items: flex-start;
  gap: var(--sdmx-space-xs);
  padding: var(--sdmx-space-sm);
  border-radius: var(--sdmx-radius-sm);
  cursor: pointer;
}

.cue-editor__layer-item:hover {
  background: var(--sdmx-color-hover);
}

.cue-editor__layer-item.active {
  background: var(--sdmx-color-primary-soft);
  box-shadow: inset 3px 0 0 var(--sdmx-color-primary);
}

.cue-editor__layer-controls {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}

.cue-editor__layer-info {
  flex: 1 1 auto;
  min-width: 0;
}

.cue-editor__layer-name {
  font-size: var(--sdmx-font-size-label);
  font-weight: var(--sdmx-font-weight-bold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cue-editor__layer-meta {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-xs);
  margin-top: var(--sdmx-space-xs);
}

.cue-editor__opacity {
  width: 100%;
}

.cue-editor__timeline {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cue-editor__ruler {
  position: relative;
  height: 36px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
  background: var(--sdmx-color-bg-inset);
  overflow: hidden;
}

.cue-editor__marker {
  position: absolute;
  top: 0;
}

.cue-editor__marker-line {
  width: 1px;
  height: 16px;
  background: var(--sdmx-color-text-faint);
}

.cue-editor__marker-label {
  margin-top: 2px;
  font-size: 10px;
  color: var(--sdmx-color-text-muted);
  transform: translateX(-50%);
}

.cue-editor__timeline-content {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  background: var(--sdmx-color-bg-surface);
}

.cue-editor__playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--sdmx-color-accent, var(--sdmx-color-primary));
  z-index: 5;
  pointer-events: none;
}

.cue-editor__track {
  position: absolute;
  left: 0;
  right: 0;
  height: 52px;
  border-bottom: 1px solid var(--sdmx-color-border-faint);
}

.cue-editor__frame {
  position: absolute;
  top: 6px;
  height: 40px;
  padding: 4px 8px;
  border: 1px solid var(--sdmx-color-border);
  border-radius: var(--sdmx-radius-sm);
  background: color-mix(in srgb, var(--sdmx-color-primary) 75%, var(--sdmx-color-bg-elevated));
  cursor: grab;
  user-select: none;
  overflow: hidden;
}

.cue-editor__frame:hover {
  border-color: var(--sdmx-color-border-strong);
}

.cue-editor__frame.selected {
  border-color: var(--sdmx-color-active);
  box-shadow: 0 0 0 1px var(--sdmx-color-active);
}

.cue-editor__frame.active {
  border-color: var(--sdmx-color-warning);
}

.cue-editor__frame.dragging {
  opacity: 0.75;
  cursor: grabbing;
  z-index: 10;
}

.cue-editor__frame.preset {
  background: color-mix(in srgb, var(--sdmx-color-secondary) 70%, var(--sdmx-color-bg-elevated));
}

.cue-editor__frame.delay {
  background: color-mix(in srgb, var(--sdmx-color-text-muted) 35%, var(--sdmx-color-bg-elevated));
}

.cue-editor__frame-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--sdmx-color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cue-editor__frame-meta {
  font-size: 10px;
  color: var(--sdmx-color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cue-editor__stack,
.cue-editor__empty {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: var(--sdmx-space-lg);
}

.cue-editor__stack-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--sdmx-space-md);
  margin-bottom: var(--sdmx-space-lg);
}

.cue-editor__stack-steps {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-md);
}

.cue-editor__stack-step {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-sm);
  padding: var(--sdmx-space-md);
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-md);
  background: var(--sdmx-color-bg-inset);
}

.cue-editor__stack-step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--sdmx-space-sm);
}

.cue-editor__stack-step-actions {
  display: flex;
  gap: var(--sdmx-space-xs);
}

.cue-editor__stack-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--sdmx-space-sm);
  align-items: end;
}

.cue-editor__dialog-body {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-md);
  min-width: min(360px, 80vw);
}
</style>
