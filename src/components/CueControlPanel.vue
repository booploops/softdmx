<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<!--
  Purpose: Simple cue control panel for quick access to cue functions
-->
<script setup lang="ts">
import { useCueStore } from 'src/stores/cue';
import { computed, ref } from 'vue';

const cueStore = useCueStore();

// Quick cue creation
const showQuickCueDialog = ref(false);
const quickCueName = ref('');

const createQuickCue = () => {
  if (quickCueName.value.trim()) {
    const cue = cueStore.addCue(quickCueName.value.trim());
    // Record current state as first frame
    cueStore.recordFrame();
    quickCueName.value = '';
    showQuickCueDialog.value = false;
  }
};

// Playback status
const isPlaying = computed(() => {
  return cueStore.activeCue ? cueStore.playbackStates.has(cueStore.activeCue.id) : false;
});

const playbackProgress = computed(() => {
  if (!cueStore.activeCue) return 0;

  // Use the same timeline position that CueEditor uses for consistency
  const currentTime = cueStore.timelinePosition;

  // Use the same duration calculation as CueEditor
  const duration = cueStore.totalDuration || 1000; // fallback to 1 second

  return Math.min((currentTime / duration) * 100, 100);
});

// Quick actions
const togglePlayback = () => {
  if (!cueStore.activeCue) return;

  if (isPlaying.value) {
    cueStore.pauseCue(cueStore.activeCue.id);
  } else {
    cueStore.playCue(cueStore.activeCue.id);
  }
};

const stopPlayback = () => {
  if (cueStore.activeCue) {
    cueStore.stopCue(cueStore.activeCue.id);
    cueStore.setTimelinePosition(0);
  }
};

const recordFrame = () => {
  cueStore.recordFrame();
};

// Cue blending
const showBlendingControls = ref(false);

// Timeline scrubbing
const handleProgressClick = (event: MouseEvent) => {
  if (!cueStore.activeCue) return;

  const progressBar = event.currentTarget as HTMLElement;
  const rect = progressBar.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const progressPercent = clickX / rect.width;
  const duration = cueStore.totalDuration || 1000;
  const newTime = progressPercent * duration;

  cueStore.setTimelinePosition(Math.max(0, Math.min(newTime, duration)));
};
</script>

<template>
  <div class="cue-control-panel">
    <!-- Main Controls -->
    <q-toolbar class="cue-toolbar">
      <!-- Cue Selection -->
      <div class="cue-selection">
        <q-select
          v-model="cueStore.activeCueId"
          :options="(cueStore.cues || []).map(c => ({ label: c.name, value: c.id }))"
          emit-value
          map-options
          label="Active Cue"
          dense
          style="min-width: 150px"
        />
        <q-btn
          @click="showQuickCueDialog = true"
          icon="add"
          size="sm"
          color="primary"
          round
        >
          <q-tooltip>Create Quick Cue</q-tooltip>
        </q-btn>
      </div>

      <!-- Playback Controls -->
      <div class="playback-controls">
        <q-btn-group unelevated>
          <q-btn
            @click="togglePlayback"
            :icon="isPlaying ? 'pause' : 'play_arrow'"
            :color="isPlaying ? 'warning' : 'positive'"
            :disable="!cueStore.activeCue"
          />
          <q-btn
            @click="stopPlayback"
            icon="stop"
            color="negative"
            :disable="!cueStore.activeCue"
          />
          <q-btn
            @click="recordFrame"
            icon="fiber_manual_record"
            color="red"
            :disable="!cueStore.activeCue"
          />
        </q-btn-group>
      </div>

      <!-- Progress Bar -->
      <div class="progress-section" v-if="cueStore.activeCue">
        <div class="progress-info">
          <span class="cue-name">{{ cueStore.activeCue.name }}</span>
          <span class="progress-text">
            {{ Math.round(cueStore.timelinePosition / 1000) }}s / {{ Math.round((cueStore.totalDuration || 1000) / 1000) }}s
          </span>
        </div>
        <q-linear-progress
          :value="playbackProgress / 100"
          color="primary"
          track-color="grey-8"
          size="8px"
          class="progress-bar clickable"
          @click="handleProgressClick"
        />
      </div>

      <!-- Master Controls -->
      <div class="master-controls">
        <div class="master-volume">
          <q-icon name="volume_up" />
          <q-slider
            v-model="cueStore.masterVolume"
            :min="0"
            :max="1"
            :step="0.1"
            color="primary"
            style="width: 80px"
          />
          <span class="volume-text">{{ Math.round(cueStore.masterVolume * 100) }}%</span>
        </div>

        <q-btn
          @click="showBlendingControls = !showBlendingControls"
          :icon="showBlendingControls ? 'expand_less' : 'expand_more'"
          flat
          size="sm"
        >
          Advanced
        </q-btn>
      </div>
    </q-toolbar>

    <!-- Advanced Controls (Collapsible) -->
    <q-slide-transition>
      <div v-show="showBlendingControls" class="advanced-controls">
        <q-toolbar class="advanced-toolbar">
          <!-- Layer Controls -->
          <div class="layer-controls" v-if="cueStore.activeCue">
            <span class="controls-label">Layers:</span>
            <div class="layer-buttons">
              <q-btn
                v-for="layer in cueStore.activeCue.layers"
                :key="layer.id"
                :label="layer.name"
                :color="layer.enabled ? 'primary' : 'grey'"
                :outline="!layer.enabled"
                size="sm"
                @click="layer.enabled = !layer.enabled"
              >
                <q-badge v-if="layer.solo" color="orange" floating>S</q-badge>
              </q-btn>
            </div>
          </div>

          <!-- Cue Properties -->
          <div class="cue-properties" v-if="cueStore.activeCue">
            <q-checkbox
              v-model="cueStore.activeCue.isLooping"
              label="Loop"
              @update:model-value="cueStore.updateCueModified"
            />
            <q-input
              v-model.number="cueStore.activeCue.priority"
              label="Priority"
              type="number"
              dense
              style="width: 80px"
              @blur="cueStore.updateCueModified"
            />
          </div>

          <!-- Timeline Controls -->
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
          </div>

          <!-- Quick Actions -->
          <div class="quick-actions">
            <q-btn @click="cueStore.stopAllCues" color="negative" size="sm">
              Stop All
            </q-btn>
          </div>
        </q-toolbar>
      </div>
    </q-slide-transition>

    <!-- Quick Cue Dialog -->
    <q-dialog v-model="showQuickCueDialog">
      <q-card style="min-width: 300px">
        <q-card-section>
          <div class="text-h6">Create Quick Cue</div>
          <div class="text-body2 text-grey-6 q-mt-sm">
            This will create a new cue with the current lighting state as the first frame.
          </div>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="quickCueName"
            label="Cue Name"
            autofocus
            @keyup.enter="createQuickCue"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="primary" label="Create" @click="createQuickCue" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<style scoped lang="scss">
.cue-control-panel {
  background: var(--q-dark);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.cue-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  min-height: 56px;

  .cue-selection {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .playback-controls {
    display: flex;
    align-items: center;
  }

  .progress-section {
    flex: 1;
    margin: 0 16px;

    .progress-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;

      .cue-name {
        font-weight: 600;
        color: var(--q-primary);
      }

      .progress-text {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        font-family: 'Courier New', monospace;
      }
    }

    .progress-bar {
      border-radius: 4px;

      &.clickable {
        cursor: pointer;
        transition: opacity 0.2s;

        &:hover {
          opacity: 0.8;
        }
      }
    }
  }

  .master-controls {
    display: flex;
    align-items: center;
    gap: 16px;

    .master-volume {
      display: flex;
      align-items: center;
      gap: 8px;

      .volume-text {
        font-size: 12px;
        min-width: 35px;
        text-align: right;
        font-family: 'Courier New', monospace;
      }
    }
  }
}

.advanced-controls {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.02);
}

.advanced-toolbar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 8px 16px;
  min-height: 48px;

  .controls-label {
    font-size: 12px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .layer-controls {
    display: flex;
    align-items: center;
    gap: 8px;

    .layer-buttons {
      display: flex;
      gap: 4px;
    }
  }

  .cue-properties {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .timeline-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .quick-actions {
    margin-left: auto;
  }
}
</style>
