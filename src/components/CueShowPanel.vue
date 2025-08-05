<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<!--
  Purpose: Show mode panel for live cue control during performances
-->
<script setup lang="ts">
import { useCueStore } from 'src/stores/cue';
import { ref, computed } from 'vue';

const cueStore = useCueStore();

// Show control state
const showIntensities = ref<Map<string, number>>(new Map());
const activeCues = ref<Set<string>>(new Set());
const masterIntensity = ref(1.0);

// Blend mode options
const blendModeOptions = [
  { label: 'Replace', value: 'replace' },
  { label: 'Add', value: 'add' },
  { label: 'Multiply', value: 'multiply' },
  { label: 'Screen', value: 'screen' }
];

// Get all cues sorted by name
const allCues = computed(() => {
  return [...cueStore.cues].sort((a, b) => a.name.localeCompare(b.name));
});

// Cue control functions
const toggleCue = (cueId: string) => {
  if (activeCues.value.has(cueId)) {
    // Stop and remove from active
    cueStore.stopCue(cueId);
    activeCues.value.delete(cueId);
  } else {
    // Add to active and play
    activeCues.value.add(cueId);
    cueStore.playCue(cueId);
  }
};

const getCueIntensity = (cueId: string) => {
  return showIntensities.value.get(cueId) ?? 1.0;
};

const setCueIntensity = (cueId: string, intensity: number | null) => {
  if (intensity === null) return;
  showIntensities.value.set(cueId, intensity);
  // Apply intensity to the cue if it's playing
  if (activeCues.value.has(cueId)) {
    cueStore.setCueIntensity(cueId, intensity);
  }
};

const isCueActive = (cueId: string) => {
  return cueStore.playbackStates.has(cueId);
};

// Master controls
const stopAllCues = () => {
  cueStore.stopAllCues();
  activeCues.value.clear();
};

const setMasterIntensity = (intensity: number | null) => {
  if (intensity === null) return;
  masterIntensity.value = intensity;
  cueStore.setMasterIntensity(intensity);
};

// Quick actions
const flashCue = (cueId: string) => {
  if (!activeCues.value.has(cueId)) {
    cueStore.playCue(cueId);
    cueStore.setCueIntensity(cueId, 1.0);
    activeCues.value.add(cueId);
  }
};

const releaseCue = (cueId: string) => {
  if (activeCues.value.has(cueId)) {
    cueStore.stopCue(cueId);
    activeCues.value.delete(cueId);
  }
};

// Cue colors for visual grouping
const getCueColor = (cueId: string, index: number) => {
  const colors = ['primary', 'secondary', 'accent', 'positive', 'negative', 'info', 'warning'];
  return colors[index % colors.length];
};

// Priority sorting
const prioritySortedCues = computed(() => {
  return [...allCues.value].sort((a, b) => (b.priority || 1) - (a.priority || 1));
});

// Blend mode controls
const getCueBlendMode = (cueId: string) => {
  const cue = cueStore.cues.find(c => c.id === cueId);
  return cue?.layers[0]?.blendMode || 'replace';
};

const setCueBlendMode = (cueId: string, blendMode: string) => {
  const cue = cueStore.cues.find(c => c.id === cueId);
  if (cue && cue.layers[0]) {
    cue.layers[0].blendMode = blendMode as any;
    cueStore.updateCueModified();
  }
};

const getBlendModeColor = (blendMode: string) => {
  const colorMap: Record<string, string> = {
    'replace': 'blue',
    'add': 'green',
    'multiply': 'orange',
    'screen': 'purple'
  };
  return colorMap[blendMode] || 'grey';
};
</script>

<template>
  <div class="cue-show-panel">
    <!-- Master Controls -->
    <div class="master-controls">
      <div class="master-section">
        <h6 class="section-title">Master Controls</h6>
        <div class="master-controls-grid">
          <div class="master-intensity">
            <q-linear-progress
              :value="masterIntensity"
              size="12px"
              color="orange"
              track-color="grey-8"
              class="intensity-bar"
            />
            <q-slider
              v-model="masterIntensity"
              :min="0"
              :max="1"
              :step="0.01"
              vertical
              reverse
              color="orange"
              track-color="grey-8"
              thumb-color="orange"
              class="master-slider"
              @update:model-value="setMasterIntensity"
            />
            <div class="intensity-label">
              Master<br>{{ Math.round(masterIntensity * 100) }}%
            </div>
          </div>

          <div class="master-buttons">
            <q-btn
              @click="stopAllCues"
              color="negative"
              size="lg"
              icon="stop"
              label="Stop All"
              class="stop-all-btn"
            />
            <q-btn
              @click="setMasterIntensity(1.0)"
              color="positive"
              size="md"
              label="Full"
            />
            <q-btn
              @click="setMasterIntensity(0)"
              color="warning"
              size="md"
              label="Blackout"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Cue Controls Grid -->
    <div class="cue-controls-section">
      <h6 class="section-title">
        Cue Controls
        <q-badge :label="activeCues.size" color="accent" />
      </h6>

      <div class="cue-grid">
        <div
          v-for="(cue, index) in allCues"
          :key="cue.id"
          class="cue-control-card"
          :class="{
            active: isCueActive(cue.id),
            'has-high-priority': (cue.priority || 1) > 1
          }"
        >
          <!-- Cue Header -->
          <div class="cue-header">
            <div class="cue-info">
              <div class="cue-name">{{ cue.name }}</div>
              <div class="cue-meta">
                <q-badge
                  v-if="cue.priority && cue.priority > 1"
                  :label="`P${cue.priority}`"
                  color="warning"
                  outline
                />
                <q-badge
                  v-if="cue.isLooping"
                  label="LOOP"
                  color="info"
                  outline
                />
                <q-badge
                  v-if="cue.layers.length > 1"
                  :label="`${cue.layers.length} layers`"
                  color="grey-6"
                  outline
                />
                <q-badge
                  v-if="isCueActive(cue.id)"
                  :label="getCueBlendMode(cue.id).toUpperCase()"
                  :color="getBlendModeColor(getCueBlendMode(cue.id))"
                  class="blend-mode-badge"
                />
              </div>
            </div>
          </div>

          <!-- Intensity Control -->
          <div class="intensity-section">
            <div class="intensity-display">
              {{ Math.round(getCueIntensity(cue.id) * 100) }}%
            </div>
            <q-slider
              :model-value="getCueIntensity(cue.id)"
              @update:model-value="(val) => setCueIntensity(cue.id, val)"
              :min="0"
              :max="1"
              :step="0.01"
              vertical
              reverse
              :color="getCueColor(cue.id, index)"
              track-color="grey-8"
              class="cue-intensity-slider"
              :disable="!isCueActive(cue.id)"
            />
          </div>

          <!-- Control Buttons -->
          <div class="cue-buttons">
            <q-btn
              @click="toggleCue(cue.id)"
              :color="isCueActive(cue.id) ? 'negative' : 'positive'"
              :icon="isCueActive(cue.id) ? 'stop' : 'play_arrow'"
              :label="isCueActive(cue.id) ? 'Stop' : 'Go'"
              size="sm"
              class="main-cue-btn"
              :class="{ 'cue-playing': isCueActive(cue.id) }"
            />

            <!-- Blend Mode Control -->
            <div class="blend-controls" v-if="isCueActive(cue.id)">
              <q-select
                :model-value="getCueBlendMode(cue.id)"
                @update:model-value="(val) => setCueBlendMode(cue.id, val)"
                :options="blendModeOptions"
                dense
                emit-value
                map-options
                label="Blend"
                class="blend-select"
                :color="getCueColor(cue.id, index)"
              />
            </div>

            <div class="quick-buttons">
              <q-btn
                @mousedown="flashCue(cue.id)"
                @mouseup="releaseCue(cue.id)"
                @mouseleave="releaseCue(cue.id)"
                color="accent"
                icon="flash_on"
                size="xs"
                round
                flat
                class="flash-btn"
              >
                <q-tooltip>Flash (hold)</q-tooltip>
              </q-btn>

              <q-btn
                @click="cueStore.setCueLooping(cue.id, !cue.isLooping)"
                :color="cue.isLooping ? 'info' : 'grey'"
                icon="repeat"
                size="xs"
                round
                flat
                :class="{ 'loop-active': cue.isLooping }"
              >
                <q-tooltip>Toggle Loop</q-tooltip>
              </q-btn>
            </div>
          </div>

          <!-- Progress Indicator -->
          <div v-if="isCueActive(cue.id)" class="cue-progress">
            <q-linear-progress
              :value="cueStore.getCueProgress(cue.id)"
              :color="getCueColor(cue.id, index)"
              size="3px"
              animation-speed="0"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Active Cues Summary -->
    <div v-if="activeCues.size > 0" class="active-summary">
      <div class="summary-header">
        <h6>Active Cues ({{ activeCues.size }})</h6>
        <q-btn
          @click="stopAllCues"
          color="negative"
          icon="stop"
          size="sm"
          label="Stop All"
        />
      </div>
      <div class="active-cues-list">
        <q-chip
          v-for="cueId in Array.from(activeCues)"
          :key="cueId"
          :label="cueStore.cues.find(c => c.id === cueId)?.name"
          removable
          @remove="toggleCue(cueId)"
          color="primary"
          text-color="white"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.cue-show-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--q-dark);
  color: white;
  overflow: hidden;
}

.section-title {
  margin: 0 0 16px 0;
  padding: 0 16px;
  color: var(--q-primary);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

// Master Controls
.master-controls {
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 16px;

  .master-controls-grid {
    display: flex;
    align-items: stretch;
    gap: 24px;
    height: 120px;

    .master-intensity {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      min-width: 60px;

      .master-slider {
        flex: 1;
        width: 40px;
      }

      .intensity-label {
        text-align: center;
        font-size: 11px;
        font-weight: 600;
        color: var(--q-accent);
      }
    }

    .master-buttons {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .stop-all-btn {
        min-height: 50px;
        font-weight: 600;
      }
    }
  }
}

// Cue Controls
.cue-controls-section {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.cue-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.cue-control-card {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.3s ease;
  height: 280px;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.3);
  }

  &.active {
    background: rgba(var(--q-primary-rgb), 0.2);
    border-color: var(--q-primary);
    box-shadow: 0 0 12px rgba(var(--q-primary-rgb), 0.3);
  }

  &.has-high-priority {
    border-left: 4px solid var(--q-warning);
  }

  .cue-header {
    .cue-name {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 4px;
      word-break: break-word;
    }

    .cue-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;

      .blend-mode-badge {
        font-size: 10px;
        font-weight: 600;
        border: 1px solid currentColor;
        animation: glow 2s ease-in-out infinite alternate;
      }
    }
  }

  .intensity-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;

    .intensity-display {
      font-family: 'Courier New', monospace;
      font-weight: 600;
      font-size: 16px;
      color: var(--q-accent);
      min-height: 20px;
    }

    .cue-intensity-slider {
      flex: 1;
      width: 30px;
      min-height: 120px;
    }
  }

  .cue-buttons {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .main-cue-btn {
      font-weight: 600;

      &.cue-playing {
        animation: pulse 2s infinite;
      }
    }

    .blend-controls {
      .blend-select {
        font-size: 11px;
      }
    }

    .quick-buttons {
      display: flex;
      justify-content: space-around;
      gap: 4px;      .flash-btn:active {
        background: var(--q-accent) !important;
        color: white !important;
      }

      .loop-active {
        background: var(--q-info) !important;
        color: white !important;
      }
    }
  }

  .cue-progress {
    margin-top: auto;
  }
}

// Active Summary
.active-summary {
  background: rgba(255, 255, 255, 0.05);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 16px;

  .summary-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    h6 {
      margin: 0;
      color: var(--q-primary);
    }
  }

  .active-cues-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes glow {
  0% { box-shadow: 0 0 5px currentColor; }
  100% { box-shadow: 0 0 15px currentColor; }
}
</style>
