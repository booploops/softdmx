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
import { SdmxButton, SdmxIconButton } from 'src/components/ui';
import { useCueStore } from 'src/stores/cue';
import { useShowStore } from 'src/stores/show';
import { createMenu } from 'src/lib/menus';
import { computed, ref, onMounted, onUnmounted } from 'vue';
import type { CueLayer, RecordedFrame, StackStep } from '@softdmx/engine';
import { formatSmpte, parseSmpteInput } from '@softdmx/engine';

const cueStore = useCueStore();
const showStore = useShowStore();
const emit = defineEmits<{ close: [] }>();
const activeCueLayers = computed(() => cueStore.activeCue?.layers ?? []);
const isTimelineCue = computed(() => cueStore.activeCue?.view !== 'stack');
const presetOptions = computed(() =>
  showStore.document.presets.map((preset) => ({ label: preset.name, value: preset.id }))
);
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

// Timeline refs
const timelineContainer = ref<HTMLElement>();
const timelineWidth = ref(800);

// Timeline state
const isDragging = ref(false);
const dragStartTime = ref(0);
const dragStartX = ref(0);
const dragFrameData = ref<{ layerId: string, frameIndex: number, originalStartTime: number } | null>(null);
const selectedFrame = ref<{ layerId: string; frameIndex: number } | null>(null);
const selectedFrameId = computed(() =>
  selectedFrame.value ? `${selectedFrame.value.layerId}-${selectedFrame.value.frameIndex}` : null
);

// Computed properties
const timelineScale = computed(() => {
  return timelineWidth.value / Math.max(cueStore.totalDuration, 10000);
});

const playheadPosition = computed(() => {
  return cueStore.timelinePosition * timelineScale.value;
});

const timelineMarkers = computed(() => {
  const markers = [];
  const interval = 1000; // 1 second intervals
  const maxTime = Math.max(cueStore.totalDuration, 10000);

  for (let time = 0; time <= maxTime; time += interval) {
    markers.push({
      time,
      position: time * timelineScale.value,
      label: `${Math.floor(time / 1000)}s`
    });
  }

  return markers;
});

// Layer management
const showAddLayerDialog = ref(false);
const newLayerName = ref('');

const addLayer = () => {
  if (cueStore.activeCue && newLayerName.value.trim()) {
    cueStore.addLayer(cueStore.activeCue.id, newLayerName.value.trim());
    newLayerName.value = '';
    showAddLayerDialog.value = false;
  }
};

// Frame management
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

// Timeline interactions
const handleTimelineClick = (event: MouseEvent) => {
  if (!timelineContainer.value) return;

  const rect = timelineContainer.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
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

  const layer = cueStore.activeCue?.layers?.find(l => l.id === layerId);
  if (!layer) return;

  isDragging.value = true;
  dragStartX.value = event.clientX;
  dragStartTime.value = getFrameStartTime(layer, frameIndex);
  selectFrame(layerId, frameIndex);

  // Store drag data for calculations
  dragFrameData.value = {
    layerId,
    frameIndex,
    originalStartTime: dragStartTime.value
  };

  // Add global mouse listeners
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

const handleMouseMove = (event: MouseEvent) => {
  if (!isDragging.value || !dragFrameData.value || !cueStore.activeCue) return;

  const deltaX = event.clientX - dragStartX.value;
  const deltaTime = deltaX / timelineScale.value;
  const newStartTime = Math.max(0, dragFrameData.value.originalStartTime + deltaTime);

  // Snap to grid if enabled
  const snappedTime = cueStore.snapToGrid(newStartTime);

  // Find the layer and frame
  const layer = activeCueLayers.value.find(l => l.id === dragFrameData.value!.layerId);
  if (!layer) return;

  const frame = layer.frames[dragFrameData.value.frameIndex];
  if (!frame) return;

  // Calculate new position and duration adjustments
  const currentStartTime = getFrameStartTime(layer, dragFrameData.value.frameIndex);
  const timeDiff = snappedTime - currentStartTime;

  if (Math.abs(timeDiff) > 10) { // Minimum 10ms movement to avoid jitter
    // For now, we'll implement a simple reordering when dragged significantly
    // In a more complex implementation, you might adjust durations of adjacent frames

    // Find the new insertion point
    let newIndex = 0;
    let accumulatedTime = 0;

    for (let i = 0; i < layer.frames.length; i++) {
      if (i === dragFrameData.value.frameIndex) continue; // Skip the frame being dragged

      const frameStart = accumulatedTime;
      const frameEnd = accumulatedTime + (layer.frames[i]?.duration || 1000);

      if (snappedTime < frameEnd) {
        newIndex = i;
        break;
      }

      accumulatedTime += layer.frames[i]?.duration || 1000;
      newIndex = i + 1;
    }

    // Adjust for the removed frame's position
    if (newIndex > dragFrameData.value.frameIndex) {
      newIndex--;
    }

    // Only move if position actually changed
    if (newIndex !== dragFrameData.value.frameIndex) {
      // Use the store's moveFrame function
      cueStore.moveFrame(dragFrameData.value.layerId, dragFrameData.value.frameIndex, newIndex);

      // Update drag data for continued dragging
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

// Playback controls
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

// Cue management
const showAddCueDialog = ref(false);
const newCueName = ref('');
const newCueView = ref<'timeline' | 'stack'>('timeline');

const addCue = () => {
  if (newCueName.value.trim()) {
    cueStore.addCue(newCueName.value.trim(), newCueView.value);
    newCueName.value = '';
    newCueView.value = 'timeline';
    showAddCueDialog.value = false;
  }
};

// Resize handling
const updateTimelineWidth = () => {
  if (timelineContainer.value) {
    timelineWidth.value = timelineContainer.value.clientWidth - 200; // Account for layer names
  }
};

onMounted(() => {
  updateTimelineWidth();
  window.addEventListener('resize', updateTimelineWidth);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateTimelineWidth);
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
});

// Frame context menu
const frameContextMenu = ref<{ layerId: string, frameIndex: number } | null>(null);

const showFrameContextMenu = (event: MouseEvent, layerId: string, frameIndex: number) => {
  selectFrame(layerId, frameIndex);
  frameContextMenu.value = { layerId, frameIndex };

  const menu = createMenu([
    {
      label: 'Copy Frame',
      click: () => {
        cueStore.copyFrames(layerId, [frameIndex]);
        frameContextMenu.value = null;
      }
    },
    {
      label: 'Paste After',
      enabled: cueStore.clipboard.length > 0,
      click: () => {
        cueStore.pasteFrames(layerId, frameIndex + 1);
        frameContextMenu.value = null;
      }
    },
    {
      label: 'Duplicate Frame',
      click: () => {
        const layer = activeCueLayers.value.find(l => l.id === layerId);
        if (layer) {
          const frame = layer.frames[frameIndex];
          if (frame) {
            const duplicated = { ...frame, name: `${frame.name} Copy` };
            layer.frames.splice(frameIndex + 1, 0, duplicated);
            cueStore.updateCueModified();
          }
        }
        frameContextMenu.value = null;
      }
    },
    {
      label: 'Delete Frame',
      click: () => {
        cueStore.deleteFrame(layerId, frameIndex);
        frameContextMenu.value = null;
      }
    }
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
  const atIndex = selectedFrame.value ? selectedFrame.value.frameIndex + 1 : activeCueLayers.value.find((l) => l.id === layerId)?.frames.length ?? 0;
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
  const presetName = showStore.document.presets.find((p) => p.id === presetFramePresetId.value)?.name ?? 'Preset';
  presetFrameName.value = `${presetName} Frame`;
  showPresetFrameDialog.value = true;
};

const addPresetFrame = () => {
  if (!presetFrameLayerId.value || !presetFramePresetId.value) return;
  const layer = activeCueLayers.value.find((l) => l.id === presetFrameLayerId.value);
  if (!layer) return;

  const presetName = showStore.document.presets.find((p) => p.id === presetFramePresetId.value)?.name ?? 'Preset';
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
</script>

<template>
  <div class="cue-editor">
    <!-- Header Controls -->
    <div class="cue-header">
      <div class="cue-controls">
        <q-btn-group unelevated>
          <SdmxButton  @click="showAddCueDialog = true" icon="plus" label="New Cue" />
          <SdmxButton  v-if="cueStore.activeCue" @click="cueStore.duplicateCue(cueStore.activeCue.id)" icon="copy" label="Duplicate" />
          <SdmxButton variant="danger" v-if="cueStore.activeCue" @click="cueStore.deleteCue(cueStore.activeCue.id)" icon="trash" label="Delete" />
        </q-btn-group>

        <q-separator vertical inset />

        <q-btn-group unelevated>
          <SdmxIconButton  @click="playPause" :icon="cueStore.isGlobalPlaying ? 'player-pause-filled' : 'player-play-filled'" />
          <SdmxIconButton  @click="stop" icon="square" />
          <SdmxIconButton color="negative" @click="record" icon="circle-filled" :disable="!isTimelineCue" />
        </q-btn-group>

        <q-separator vertical inset />

        <div class="timeline-controls">
          <SdmxButton variant="ghost" v-if="isTimelineCue" @click="openPresetFrameDialog" icon="folder-plus" label="Preset Frame" size="sm" />
          <SdmxButton variant="ghost" v-if="isTimelineCue" @click="openDelayFrameDialog" icon="hourglass" label="Delay" size="sm" />
          <SdmxButton variant="ghost" v-if="isTimelineCue" @click="copySelectedFrames" icon="copy" label="Copy" size="sm" :disable="!selectedFrame" />
          <SdmxButton variant="ghost" v-if="isTimelineCue" @click="pasteFramesAfterSelection" icon="clipboard" label="Paste" size="sm" :disable="cueStore.clipboard.length === 0" />
          <q-btn-toggle
            v-model="cueStore.timelineSnapping"
            :options="[{label: 'Snap', value: true}]"
            toggle-color="primary"
            size="sm"
          />
          <q-input
            v-model.number="cueStore.snapInterval"
            label="Snap (ms)"
            type="number"
            dense
            style="width: 100px"
          />
          <q-slider
            v-model="cueStore.timelineZoom"
            :min="0.1"
            :max="5"
            :step="0.1"
            label
            style="width: 150px"
          />
        </div>
      </div>

      <!-- Cue Selector -->
      <div class="cue-selector">
        <q-select
          v-model="cueStore.activeCueId"
          :options="cueStore.cues.map(c => ({ label: c.name, value: c.id }))"
          emit-value
          map-options
          label="Active Cue"
          style="min-width: 200px"
        />

        <div v-if="cueStore.activeCue" class="cue-info">
          <q-input
            v-model="cueStore.activeCue.name"
            dense
            @blur="cueStore.updateCueModified"
          />
          <div class="cue-meta">
            <q-checkbox v-model="cueStore.activeCue.isLooping" label="Loop" />
            <q-input
              v-model.number="cueStore.activeCue.priority"
              label="Priority"
              type="number"
              dense
              style="width: 80px"
            />
            <template v-if="isTimelineCue">
              <q-input
                v-model="activeCueTimecodeIn"
                label="TC In"
                dense
                style="width: 130px"
              />
              <q-input
                v-model="activeCueTimecodeOut"
                label="TC Out"
                dense
                style="width: 130px"
              />
            </template>
          </div>
        </div>
      </div>

      <SdmxButton variant="ghost" size="sm" round icon="x" aria-label="Close cue editor" @click="emit('close')" />
    </div>

    <!-- Timeline -->
    <div class="timeline-wrapper" v-if="cueStore.activeCue && isTimelineCue">
      <div class="layers-panel">
        <div class="layers-header">
          <span>Layers</span>
          <SdmxIconButton  @click="showAddLayerDialog = true" icon="plus" size="sm" round />
        </div>

        <div class="layer-list">
          <div
            v-for="layer in activeCueLayers"
            :key="layer.id"
            class="layer-item"
            :class="{ active: cueStore.activeLayerId === layer.id }"
            @click="cueStore.activeLayerId = layer.id"
          >
            <div class="layer-controls">
              <q-checkbox v-model="layer.enabled" size="sm" />
              <SdmxIconButton  v-if="layer.solo" @click="layer.solo = false" icon="volume" size="sm" />
              <SdmxIconButton  v-else @click="layer.solo = true" icon="volume-off" size="sm" />
            </div>

            <div class="layer-info">
              <div class="layer-name">{{ layer.name }}</div>
              <div class="layer-meta">
                <q-select
                  v-model="layer.blendMode"
                  :options="['replace', 'add', 'multiply', 'screen']"
                  dense
                  style="width: 80px"
                />
                <q-slider
                  v-model="layer.opacity"
                  :min="0"
                  :max="1"
                  :step="0.1"
                  style="width: 60px"
                />
              </div>
            </div>

            <SdmxIconButton color="negative" @click="cueStore.deleteLayer(cueStore.activeCue!.id, layer.id)" icon="trash" size="sm" />
          </div>
        </div>
      </div>

      <div class="timeline-panel">
        <!-- Timeline Header -->
        <div class="timeline-header">
          <div class="timeline-ruler">
            <div
              v-for="marker in timelineMarkers"
              :key="marker.time"
              class="timeline-marker"
              :style="{ left: `${marker.position}px` }"
            >
              <div class="marker-line"></div>
              <div class="marker-label">{{ marker.label }}</div>
            </div>
          </div>
        </div>

        <!-- Timeline Content -->
        <div
          ref="timelineContainer"
          class="timeline-content"
          @click="handleTimelineClick"
        >
          <!-- Playhead -->
          <div
            class="playhead"
            :style="{ left: `${playheadPosition}px` }"
          ></div>

          <!-- Layer Tracks -->
          <div
            v-for="(layer, layerIndex) in activeCueLayers"
            :key="layer.id"
            class="timeline-track"
            :style="{ top: `${layerIndex * 60 + 40}px` }"
          >
            <!-- Frames -->
            <div
              v-for="(frame, frameIndex) in layer.frames"
              :key="`${layer.id}-${frameIndex}`"
              class="timeline-frame"
              :class="{
                selected: selectedFrameId === `${layer.id}-${frameIndex}`,
                active: cueStore.activeLayerId === layer.id && cueStore.activeFrameIndex === frameIndex,
                dragging: isDragging && selectedFrameId === `${layer.id}-${frameIndex}`,
                preset: frame.type === 'preset',
                delay: frame.type === 'delay'
              }"
              :style="{
                left: `${getFramePosition(layer, frameIndex)}px`,
                width: `${getFrameWidth(frame)}px`
              }"
              @mousedown="handleFrameMouseDown($event, layer.id, frameIndex)"
              @click.stop="selectFrame(layer.id, frameIndex)"
              @contextmenu.prevent="showFrameContextMenu($event, layer.id, frameIndex)"
            >
              <div class="frame-content">
                <div class="frame-name">{{ frame.name }}</div>
                <div class="frame-duration">{{ frame.duration }}ms</div>
                <div class="frame-easing">{{ getFrameTypeLabel(frame) }} · {{ frame.easing }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Stack cue editor -->
    <div v-else-if="cueStore.activeCue && !isTimelineCue" class="no-cue-state">
      <q-card flat class="stack-editor">
        <div class="stack-header">
          <div>
            <div class="text-h6">{{ cueStore.activeCue.name }}</div>
            <div class="text-body2 text-grey-6">
              Build sequential steps for GO playback. Auto follows after fade-in, Time uses an explicit delay.
            </div>
          </div>
          <SdmxButton variant="primary" icon="plus" label="Add Step" @click="addStackStep" />
        </div>

        <div v-if="(cueStore.activeCue.stack?.length ?? 0) === 0" class="empty-stack">
          <XIcon name="playlist" size="3rem" class="text-grey-6" />
          <div class="text-body2 text-grey-6">No steps yet. Add a step to start building the stack cue.</div>
        </div>

        <div v-else class="stack-steps">
          <q-card
            v-for="(step, index) in cueStore.activeCue.stack"
            :key="step.id"
            flat
            bordered
            class="stack-step"
          >
            <div class="step-header">
              <q-badge color="primary" :label="`Step ${index + 1}`" />
              <div class="step-actions">
                <SdmxIconButton size="sm" icon="arrow-up" :disable="index === 0" @click="moveStackStep(index, -1)" />
                <SdmxIconButton size="sm" icon="arrow-down" :disable="index === (cueStore.activeCue.stack?.length ?? 1) - 1" @click="moveStackStep(index, 1)" />
                <SdmxIconButton color="negative" size="sm" icon="trash" @click="removeStackStep(index)" />
              </div>
            </div>

            <div class="step-grid">
              <q-input
                v-model="step.label"
                dense
                label="Step Label"
                @blur="cueStore.updateCueModified"
              />
              <q-select
                v-model="step.presetId"
                :options="presetOptions"
                emit-value
                map-options
                clearable
                dense
                label="Preset"
                @update:model-value="cueStore.updateCueModified"
              />
              <q-input
                v-model.number="step.fadeIn"
                type="number"
                min="0"
                dense
                label="Fade In (ms)"
                @blur="normalizeStackStep(step)"
              />
              <q-select
                v-model="step.follow"
                :options="stackFollowOptions"
                emit-value
                map-options
                dense
                label="Follow"
                @update:model-value="normalizeStackStep(step)"
              />
              <q-input
                v-if="step.follow === 'timed'"
                v-model.number="step.followTime"
                type="number"
                min="0"
                dense
                label="Follow Time (ms)"
                @blur="normalizeStackStep(step)"
              />
            </div>
          </q-card>
        </div>
      </q-card>
    </div>

    <!-- No Cue State -->
    <div v-else class="no-cue-state">
      <q-card flat class="text-center q-pa-xl">
        <XIcon name="music" size="4rem" class="text-grey-6" />
        <div class="text-h6 q-mt-md">No Cue Selected</div>
        <div class="text-body2 text-grey-6 q-mb-md">
          Create a new cue to start building your lighting show
        </div>
        <q-btn @click="showAddCueDialog = true" color="primary" label="Create New Cue" />
      </q-card>
    </div>

    <!-- Add Cue Dialog -->
    <q-dialog v-model="showAddCueDialog">
      <q-card style="min-width: 300px">
        <q-card-section class="row items-center">
          <div class="text-h6">New Cue</div>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="newCueName"
            label="Cue Name"
            autofocus
            @keyup.enter="addCue"
          />
          <q-option-group
            v-model="newCueView"
            :options="[
              { label: 'Timeline Cue', value: 'timeline' },
              { label: 'Stack Cue', value: 'stack' }
            ]"
            type="radio"
            class="q-mt-md"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="primary" label="Create" @click="addCue" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Add Layer Dialog -->
    <q-dialog v-model="showAddLayerDialog">
      <q-card style="min-width: 300px">
        <q-card-section class="row items-center">
          <div class="text-h6">New Layer</div>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="newLayerName"
            label="Layer Name"
            autofocus
            @keyup.enter="addLayer"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="primary" label="Create" @click="addLayer" />
        </q-card-actions>
      </q-card>
    </q-dialog>



    <q-dialog v-model="showPresetFrameDialog">
      <q-card style="min-width: 340px">
        <q-card-section class="text-h6">Add Preset Frame</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select
            v-model="presetFrameLayerId"
            :options="activeCueLayers.map((layer) => ({ label: layer.name, value: layer.id }))"
            emit-value
            map-options
            dense
            label="Layer"
          />
          <q-select
            v-model="presetFramePresetId"
            :options="presetOptions"
            emit-value
            map-options
            dense
            label="Preset"
          />
          <q-input v-model="presetFrameName" dense label="Frame Name" />
          <q-input v-model.number="presetFrameDuration" dense type="number" min="1" label="Duration (ms)" />
          <q-select v-model="presetFrameEasing" :options="frameEasingOptions" dense label="Easing" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="primary" label="Add" @click="addPresetFrame" :disable="!presetFrameLayerId || !presetFramePresetId" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showDelayFrameDialog">
      <q-card style="min-width: 340px">
        <q-card-section class="text-h6">Add Delay Frame</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select
            v-model="delayFrameLayerId"
            :options="activeCueLayers.map((layer) => ({ label: layer.name, value: layer.id }))"
            emit-value
            map-options
            dense
            label="Layer"
          />
          <q-input v-model="delayFrameName" dense label="Frame Name" />
          <q-input v-model.number="delayFrameDuration" dense type="number" min="1" label="Duration (ms)" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="primary" label="Add" @click="addDelayFrame" :disable="!delayFrameLayerId" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<style scoped lang="scss">
.cue-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--sdmx-color-bg-surface);
  color: white;
}

.cue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--sdmx-color-border);
  gap: 16px;

  .cue-controls {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .timeline-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .cue-selector {
    display: flex;
    align-items: center;
    gap: 16px;

    .cue-info {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .cue-meta {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }
  }
}

.timeline-wrapper {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.layers-panel {
  width: 200px;
  border-right: 1px solid var(--sdmx-color-border);
  display: flex;
  flex-direction: column;

  .layers-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border-bottom: 1px solid var(--sdmx-color-border);
    font-weight: 600;
  }

  .layer-list {
    flex: 1;
    overflow-y: auto;
  }

  .layer-item {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid var(--sdmx-color-border-faint);
    cursor: pointer;

    &:hover {
      background: var(--sdmx-color-border-faint);
    }

    &.active {
      background: var(--sdmx-color-primary-soft);
      border-left: 3px solid var(--sdmx-color-primary);
    }

    .layer-controls {
      display: flex;
      gap: 4px;
    }

    .layer-info {
      flex: 1;
      margin: 0 8px;

      .layer-name {
        font-weight: 500;
        font-size: 14px;
      }

      .layer-meta {
        display: flex;
        gap: 8px;
        margin-top: 4px;
      }
    }
  }
}

.timeline-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.timeline-header {
  height: 40px;
  border-bottom: 1px solid var(--sdmx-color-border);
  position: relative;

  .timeline-ruler {
    position: relative;
    height: 100%;
  }

  .timeline-marker {
    position: absolute;
    top: 0;

    .marker-line {
      width: 1px;
      height: 20px;
      background: var(--sdmx-color-text-faint);
    }

    .marker-label {
      font-size: 10px;
      margin-top: 2px;
      color: var(--sdmx-color-text-muted);
      transform: translateX(-50%);
    }
  }
}

.timeline-content {
  flex: 1;
  position: relative;
  overflow: auto;
  background: var(--sdmx-gradient-surface);

  .playhead {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--sdmx-color-accent);
    z-index: 100;
    pointer-events: none;
    box-shadow: 0 0 4px var(--sdmx-color-accent);
  }

  .timeline-track {
    position: absolute;
    left: 0;
    right: 0;
    height: 50px;
    border-bottom: 1px solid var(--sdmx-color-border-faint);
  }

  .timeline-frame {
    position: absolute;
    top: 5px;
    height: 40px;
    background: linear-gradient(135deg, var(--sdmx-color-primary), var(--sdmx-color-secondary));
    border: 1px solid var(--sdmx-color-border);
    border-radius: 4px;
    cursor: grab;
    user-select: none;

    &:hover {
      border-color: var(--sdmx-color-border-strong);
      box-shadow: 0 2px 8px var(--sdmx-color-shadow);
    }

    &.selected {
      border-color: var(--sdmx-color-accent);
      box-shadow: 0 0 0 2px var(--sdmx-color-accent);
    }

    &.active {
      border-color: var(--sdmx-color-warning);
      box-shadow: 0 0 0 2px var(--sdmx-color-warning);
    }

    &.dragging {
      opacity: 0.7;
      transform: scale(1.05);
      z-index: 1000;
      cursor: grabbing;
      box-shadow: 0 4px 16px var(--sdmx-color-shadow-strong);
    }

    &.preset {
      background: var(--sdmx-gradient-keyframe);
    }

    &.delay {
      background: var(--sdmx-gradient-keyframe-disabled);
    }

    .frame-content {
      padding: 4px 8px;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;

      .frame-name {
        font-size: 12px;
        font-weight: 600;
        color: white;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .frame-duration,
      .frame-easing {
        font-size: 10px;
        color: var(--sdmx-color-text-muted);
      }
    }
  }
}

.no-cue-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stack-editor {
  width: min(1000px, 95%);
  max-height: 90%;
  overflow: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stack-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.empty-stack {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 12px;
}

.stack-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stack-step {
  background: var(--sdmx-color-bg-inset);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.step-actions {
  display: flex;
  gap: 4px;
}

.step-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  align-items: end;
}
</style>
