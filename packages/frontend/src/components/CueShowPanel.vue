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
import { useOutputEngineStore } from 'src/stores/output-engine';
import { ref, computed } from 'vue';

const cueStore = useCueStore();
const outputEngine = useOutputEngineStore();

// Show control state
const activeCues = computed(() => {
  return new Set(cueStore.playbackStates.keys());
});
const playbackBusMaster = computed({
  get: () => outputEngine.playbackBusMaster,
  set: (value: number) => outputEngine.setPlaybackBusMaster(value),
});
const playbackBusPercent = computed(() => Math.round(playbackBusMaster.value * 100));

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
const hasCues = computed(() => allCues.value.length > 0);

// Cue control functions
const toggleCue = (cueId: string) => {
  const cue = cueStore.cues.find((c) => c.id === cueId);
  if (isCueActive(cueId)) {
    cueStore.stopCue(cueId);
  } else if (cue?.view === 'stack') {
    cueStore.playCue(cueId);
  } else {
    cueStore.playCue(cueId);
    cueStore.setCueIntensity(cueId, getCueIntensity(cueId));
  }
};

const stackGo = (cueId: string) => {
  cueStore.stackGo(cueId);
};

const getCueIntensity = (cueId: string) => {
  return cueStore.getCueLevel(cueId);
};

const setCueIntensity = (cueId: string, intensity: number | null) => {
  if (intensity === null) return;
  cueStore.setCueLevel(cueId, intensity);
};

const isCueActive = (cueId: string) => {
  return cueStore.playbackStates.has(cueId);
};

// Master controls
const stopAllCues = () => {
  cueStore.stopAllCues();
};

const setPlaybackBusMaster = (intensity: number | null) => {
  if (intensity === null) return;
  outputEngine.setPlaybackBusMaster(intensity);
};

const outputGrandMaster = computed({
  get: () => outputEngine.grandMaster,
  set: (value: number | null) => {
    if (value === null) return;
    outputEngine.setGrandMaster(value);
  },
});

const outputGrandMasterPercent = computed(() => Math.round(outputGrandMaster.value * 100));

const toggleOutputBlackout = () => {
  outputEngine.setBlackout(!outputEngine.blackout);
};

// Quick actions
const flashCue = (cueId: string) => {
  if (!isCueActive(cueId)) {
    cueStore.playCue(cueId);
    cueStore.setCueIntensity(cueId, 1.0);
  }
};

const releaseCue = (cueId: string) => {
  if (isCueActive(cueId)) {
    cueStore.stopCue(cueId);
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
  return cue?.layers?.[0]?.blendMode || 'replace';
};

const setCueBlendMode = (cueId: string, blendMode: string) => {
  const cue = cueStore.cues.find(c => c.id === cueId);
  if (cue?.layers?.[0]) {
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
        <div class="master-controls-row">
          <div class="master-intensity-horizontal">
            <span class="intensity-label">Playback: {{ playbackBusPercent }}%</span>
            <q-slider
              v-model="playbackBusMaster"
              :min="0"
              :max="1"
              :step="0.01"
              color="deep-purple"
              track-color="grey-8"
              thumb-color="deep-purple"
              class="master-slider"
            />
          </div>

          <div class="master-intensity-horizontal output-master-horizontal">
            <span class="intensity-label">Output GM: {{ outputGrandMasterPercent }}%</span>
            <q-slider
              v-model="outputGrandMaster"
              :min="0"
              :max="1"
              :step="0.01"
              color="amber"
              track-color="grey-8"
              thumb-color="amber"
              class="master-slider"
            />
          </div>

          <div class="master-buttons">
            <q-btn
              @click="stopAllCues"
              color="negative"
              icon="stop"
              label="Stop All"
              class="stop-all-btn"
              unelevated
            />
            <q-btn
              @click="setPlaybackBusMaster(1.0)"
              color="positive"
              label="Full"
              class="quick-btn"
              unelevated
            />
            <q-btn
              @click="setPlaybackBusMaster(0)"
              color="warning"
              label="Off"
              class="quick-btn"
              unelevated
            />
            <q-btn
              @click="toggleOutputBlackout"
              :color="outputEngine.blackout ? 'negative' : 'grey-7'"
              :label="outputEngine.blackout ? 'Output BO ON' : 'Output BO'"
              class="quick-btn"
              unelevated
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

      <div v-if="hasCues" class="cue-grid">
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
                  v-if="(cue.layers?.length ?? 0) > 1"
                  :label="`${cue.layers?.length ?? 0} layers`"
                  color="grey-6"
                  outline
                />
                <q-badge
                  v-if="cue.view === 'stack' && (cue.stack?.length ?? 0) > 0"
                  :label="`${cue.stack?.length ?? 0} steps`"
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
            />
          </div>

          <!-- Blend Mode Control (above buttons when active) -->
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

          <!-- Control Buttons — pinned to bottom via margin-top: auto -->
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

            <q-btn
              v-if="cue.view === 'stack'"
              @click="stackGo(cue.id)"
              color="secondary"
              icon="skip_next"
              label="Next"
              size="sm"
              class="q-ml-sm"
            />

            <div class="quick-buttons">
              <q-btn
                @mousedown="flashCue(cue.id)"
                @mouseup="releaseCue(cue.id)"
                @mouseleave="releaseCue(cue.id)"
                color="accent"
                icon="flash_on"
                unelevated
                class="flash-btn"
              >
                <q-tooltip>Flash (hold)</q-tooltip>
              </q-btn>

              <q-btn
                @click="cueStore.setCueLooping(cue.id, !cue.isLooping)"
                :color="cue.isLooping ? 'info' : 'grey-8'"
                icon="repeat"
                unelevated
                class="loop-btn"
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
      <div v-else class="empty-cues-state">
        <q-icon name="playlist_remove" size="3rem" class="text-grey-5 q-mb-sm" />
        <div class="text-h6">No cues in this show</div>
        <div class="text-caption text-grey-5">Open Cue Editor to create your first cue.</div>
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
  background: var(--sdmx-color-bg-surface);
  color: white;
  overflow: hidden;
}

.section-title {
  margin: 0 0 16px 0;
  padding: 0 16px;
  color: var(--sdmx-color-primary);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

// Master Controls
.master-controls {
  background: var(--sdmx-color-border-faint);
  border-bottom: 1px solid var(--sdmx-color-border);
  padding: 16px;

  .master-controls-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 24px;

    .master-intensity-horizontal {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 12px;
      min-width: 250px;
      flex: 1;
      max-width: 400px;

      .intensity-label {
        font-size: 13px;
        font-weight: 600;
        color: var(--sdmx-color-accent);
        white-space: nowrap;
        min-width: 90px;
      }

      .master-slider {
        flex: 1;
      }
    }

    .master-buttons {
      display: flex;
      flex-direction: row;
      gap: 12px;
      align-items: center;

      .stop-all-btn, .quick-btn {
        font-weight: 600;
        border-radius: 6px;
        height: 40px;
        min-width: 90px;
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
  grid-template-columns: repeat(auto-fill, 150px);
  justify-content: center;
  gap: 16px;
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.empty-cues-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.cue-control-card {
  background: var(--sdmx-color-border-subtle);
  border: 1px solid var(--sdmx-color-border-strong);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.3s ease;
  height: 360px;
  overflow: hidden;

  &:hover {
    background: var(--sdmx-color-border);
    border-color: var(--sdmx-color-text-faint);
  }

  &.active {
    background: var(--sdmx-color-primary-soft);
    border-color: var(--sdmx-color-primary);
    box-shadow: 0 0 12px var(--sdmx-color-primary-soft);
  }

  &.has-high-priority {
    border-left: 4px solid var(--sdmx-color-warning);
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
      color: var(--sdmx-color-accent);
      min-height: 20px;
    }

    .cue-intensity-slider {
      flex: 1;
      width: 20px;
      min-height: 80px;
    }
  }

  .cue-buttons {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: auto;

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
      gap: 8px;
      width: 100%;

      .flash-btn, .loop-btn {
        flex: 1;
        font-weight: 600;
        border-radius: 6px;
        height: 32px;
      }
    }
  }

  .cue-progress {
    margin-top: auto;
  }
}

// Active Summary
.active-summary {
  background: var(--sdmx-color-border-faint);
  border-top: 1px solid var(--sdmx-color-border);
  padding: 16px;

  .summary-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    h6 {
      margin: 0;
      color: var(--sdmx-color-primary);
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
