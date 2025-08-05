<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<!--
  Purpose: Professional timeline-based cue editor for lighting shows
-->
<script setup lang="ts">
import { useCueStore } from 'src/stores/cue';
import { computed, ref, onMounted, onUnmounted } from 'vue';
import type { Cue, CueLayer, RecordedFrame } from 'src/types';

const cueStore = useCueStore();

// Timeline refs
const timelineContainer = ref<HTMLElement>();
const timelineWidth = ref(800);
const timelineHeight = ref(400);

// Timeline state
const isDragging = ref(false);
const dragStartTime = ref(0);
const selectedFrameId = ref<string | null>(null);

// Computed properties
const timelineScale = computed(() => {
  return timelineWidth.value / Math.max(cueStore.totalDuration, 10000); // minimum 10 seconds
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

const getFrameWidth = (frame: RecordedFrame) => {
  return (frame.duration || 1000) * timelineScale.value;
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

const handleFrameMouseDown = (event: MouseEvent, layerId: string, frameIndex: number) => {
  event.stopPropagation();

  isDragging.value = true;
  dragStartTime.value = event.clientX;
  selectedFrameId.value = `${layerId}-${frameIndex}`;

  // Add global mouse listeners
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

const handleMouseMove = (event: MouseEvent) => {
  if (!isDragging.value) return;

  // TODO: Implement frame dragging logic
  const deltaX = event.clientX - dragStartTime.value;
  const deltaTime = deltaX / timelineScale.value;

  // For now, just update the timeline position
  // In a full implementation, you'd update frame positions
};

const handleMouseUp = () => {
  isDragging.value = false;
  selectedFrameId.value = null;

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
  cueStore.recordFrame();
};

// Cue management
const showAddCueDialog = ref(false);
const newCueName = ref('');

const addCue = () => {
  if (newCueName.value.trim()) {
    cueStore.addCue(newCueName.value.trim());
    newCueName.value = '';
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
const showContextMenu = ref(false);

const showFrameContextMenu = (layerId: string, frameIndex: number) => {
  frameContextMenu.value = { layerId, frameIndex };
  showContextMenu.value = true;
};

const duplicateFrame = () => {
  if (!frameContextMenu.value || !cueStore.activeCue) return;

  const { layerId, frameIndex } = frameContextMenu.value;
  const layer = cueStore.activeCue.layers.find(l => l.id === layerId);
  if (!layer) return;

  const frame = layer.frames[frameIndex];
  if (frame) {
    const duplicated = { ...frame, name: `${frame.name} Copy` };
    layer.frames.splice(frameIndex + 1, 0, duplicated);
    cueStore.updateCueModified();
  }

  frameContextMenu.value = null;
  showContextMenu.value = false;
};

const deleteFrame = () => {
  if (!frameContextMenu.value) return;

  const { layerId, frameIndex } = frameContextMenu.value;
  cueStore.deleteFrame(layerId, frameIndex);
  frameContextMenu.value = null;
  showContextMenu.value = false;
};
</script>

<template>
  <div class="cue-editor">
    <!-- Header Controls -->
    <div class="cue-header">
      <div class="cue-controls">
        <q-btn-group unelevated>
          <q-btn @click="showAddCueDialog = true" icon="add" label="New Cue" />
          <q-btn
            v-if="cueStore.activeCue"
            @click="cueStore.duplicateCue(cueStore.activeCue.id)"
            icon="content_copy"
            label="Duplicate"
          />
          <q-btn
            v-if="cueStore.activeCue"
            @click="cueStore.deleteCue(cueStore.activeCue.id)"
            icon="delete"
            label="Delete"
            color="negative"
          />
        </q-btn-group>

        <q-separator vertical inset />

        <q-btn-group unelevated>
          <q-btn @click="playPause" :icon="cueStore.isGlobalPlaying ? 'pause' : 'play_arrow'" />
          <q-btn @click="stop" icon="stop" />
          <q-btn @click="record" icon="fiber_manual_record" color="red" />
        </q-btn-group>

        <q-separator vertical inset />

        <div class="timeline-controls">
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
          </div>
        </div>
      </div>
    </div>

    <!-- Timeline -->
    <div class="timeline-wrapper" v-if="cueStore.activeCue">
      <div class="layers-panel">
        <div class="layers-header">
          <span>Layers</span>
          <q-btn
            @click="showAddLayerDialog = true"
            icon="add"
            size="sm"
            flat
            round
          />
        </div>

        <div class="layer-list">
          <div
            v-for="layer in cueStore.activeCue.layers"
            :key="layer.id"
            class="layer-item"
            :class="{ active: cueStore.activeLayerId === layer.id }"
            @click="cueStore.activeLayerId = layer.id"
          >
            <div class="layer-controls">
              <q-checkbox v-model="layer.enabled" size="sm" />
              <q-btn
                v-if="layer.solo"
                @click="layer.solo = false"
                icon="volume_up"
                size="sm"
                flat
                color="orange"
              />
              <q-btn
                v-else
                @click="layer.solo = true"
                icon="volume_off"
                size="sm"
                flat
              />
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

            <q-btn
              @click="cueStore.deleteLayer(cueStore.activeCue!.id, layer.id)"
              icon="delete"
              size="sm"
              flat
              color="negative"
            />
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
            v-for="(layer, layerIndex) in cueStore.activeCue.layers"
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
                active: cueStore.activeLayerId === layer.id && cueStore.activeFrameIndex === frameIndex
              }"
              :style="{
                left: `${getFramePosition(layer, frameIndex)}px`,
                width: `${getFrameWidth(frame)}px`
              }"
              @mousedown="handleFrameMouseDown($event, layer.id, frameIndex)"
              @contextmenu.prevent="showFrameContextMenu(layer.id, frameIndex)"
            >
              <div class="frame-content">
                <div class="frame-name">{{ frame.name }}</div>
                <div class="frame-duration">{{ frame.duration }}ms</div>
                <div class="frame-easing">{{ frame.easing }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- No Cue State -->
    <div v-else class="no-cue-state">
      <q-card flat class="text-center q-pa-xl">
        <q-icon name="music_note" size="4rem" class="text-grey-6" />
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

    <!-- Frame Context Menu -->
    <q-menu
      v-if="frameContextMenu"
      v-model="showContextMenu"
      context-menu
    >
      <q-list>
        <q-item clickable @click="duplicateFrame">
          <q-item-section>Duplicate Frame</q-item-section>
        </q-item>
        <q-item clickable @click="deleteFrame">
          <q-item-section>Delete Frame</q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </div>
</template>

<style scoped lang="scss">
.cue-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--q-dark);
  color: white;
}

.cue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;

  .layers-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    cursor: pointer;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    &.active {
      background: rgba(var(--q-primary-rgb), 0.2);
      border-left: 3px solid var(--q-primary);
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
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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
      background: rgba(255, 255, 255, 0.3);
    }

    .marker-label {
      font-size: 10px;
      margin-top: 2px;
      color: rgba(255, 255, 255, 0.7);
      transform: translateX(-50%);
    }
  }
}

.timeline-content {
  flex: 1;
  position: relative;
  overflow: auto;
  background: linear-gradient(to bottom, #1e1e1e 0%, #2a2a2a 100%);

  .playhead {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--q-accent);
    z-index: 100;
    pointer-events: none;
    box-shadow: 0 0 4px var(--q-accent);
  }

  .timeline-track {
    position: absolute;
    left: 0;
    right: 0;
    height: 50px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .timeline-frame {
    position: absolute;
    top: 5px;
    height: 40px;
    background: linear-gradient(135deg, var(--q-primary), var(--q-secondary));
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    cursor: pointer;
    user-select: none;

    &:hover {
      border-color: rgba(255, 255, 255, 0.4);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    &.selected {
      border-color: var(--q-accent);
      box-shadow: 0 0 0 2px var(--q-accent);
    }

    &.active {
      border-color: var(--q-warning);
      box-shadow: 0 0 0 2px var(--q-warning);
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
        color: rgba(255, 255, 255, 0.8);
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
</style>
