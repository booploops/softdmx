<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<!--
  Purpose: A widget for moving lights in the 3D space
-->
<script setup lang="ts">
import { unwrapRef } from 'src/utils';
import { LightMoverModel } from './LightMover';

const val = defineModel<LightMoverModel>({required: true});

const padRef = ref<HTMLElement>();

// Convert DMX values (0-255) to pad coordinates (0-100%)
const panPosition = computed(() => {
  const panValue = val.value.panChannel.reference.value;
  const panFineValue = val.value.panFineChannel.reference.value;
  // Combine coarse and fine values for 16-bit precision
  const combined = (panValue * 256 + panFineValue) / 65535;
  return combined * 100;
});

const tiltPosition = computed(() => {
  const tiltValue = val.value.tiltChannel.reference.value;
  const tiltFineValue = val.value.tiltFineChannel.reference.value;
  // Combine coarse and fine values for 16-bit precision
  const combined = (tiltValue * 256 + tiltFineValue) / 65535;
  return combined * 100;
});

// Handle mouse/touch interactions
const isDragging = ref(false);

function startDrag(event: MouseEvent | TouchEvent) {
  isDragging.value = true;
  updatePosition(event);

  // Add global event listeners
  const moveHandler = (e: MouseEvent | TouchEvent) => {
    if (isDragging.value) {
      updatePosition(e);
    }
  };

  const endHandler = () => {
    isDragging.value = false;
    document.removeEventListener('mousemove', moveHandler);
    document.removeEventListener('mouseup', endHandler);
    document.removeEventListener('touchmove', moveHandler);
    document.removeEventListener('touchend', endHandler);
  };

  document.addEventListener('mousemove', moveHandler);
  document.addEventListener('mouseup', endHandler);
  document.addEventListener('touchmove', moveHandler);
  document.addEventListener('touchend', endHandler);

  event.preventDefault();
}

function updatePosition(event: MouseEvent | TouchEvent) {
  if (!padRef.value) return;

  const rect = padRef.value.getBoundingClientRect();
  let clientX: number, clientY: number;

  if (event.type.startsWith('touch')) {
    const touch = (event as TouchEvent).touches[0] || (event as TouchEvent).changedTouches[0];
    if (!touch) return;
    clientX = touch.clientX;
    clientY = touch.clientY;
  } else {
    clientX = (event as MouseEvent).clientX;
    clientY = (event as MouseEvent).clientY;
  }

  // Calculate relative position (0-1)
  const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

  // Convert to 16-bit DMX values
  const panValue16bit = Math.round(x * 65535);
  const tiltValue16bit = Math.round(y * 65535);

  // Split into coarse and fine channels
  val.value.panChannel.reference.value = Math.floor(panValue16bit / 256);
  val.value.panFineChannel.reference.value = panValue16bit % 256;
  val.value.tiltChannel.reference.value = Math.floor(tiltValue16bit / 256);
  val.value.tiltFineChannel.reference.value = tiltValue16bit % 256;
}

// Reset to center position
function resetPosition() {
  val.value.panChannel.reference.value = 127;
  val.value.panFineChannel.reference.value = 128;
  val.value.tiltChannel.reference.value = 127;
  val.value.tiltFineChannel.reference.value = 128;
}

</script>

<template>
  <div class="light-mover-widget">
    <div class="mover-header">
      <span class="mover-title">Light Mover</span>
      <q-btn
        flat
        dense
        round
        icon="center_focus_strong"
        size="sm"
        @click="resetPosition"
        class="reset-btn"
      >
        <q-tooltip>Reset to center</q-tooltip>
      </q-btn>
    </div>

    <div
      ref="padRef"
      class="mover-pad"
      @mousedown="startDrag"
      @touchstart="startDrag"
    >
      <!-- Grid lines for visual reference -->
      <div class="grid-lines">
        <div class="grid-line horizontal" style="top: 25%"></div>
        <div class="grid-line horizontal" style="top: 50%"></div>
        <div class="grid-line horizontal" style="top: 75%"></div>
        <div class="grid-line vertical" style="left: 25%"></div>
        <div class="grid-line vertical" style="left: 50%"></div>
        <div class="grid-line vertical" style="left: 75%"></div>
      </div>

      <!-- Position indicator -->
      <div
        class="position-indicator"
        :style="{
          left: `${panPosition}%`,
          top: `${tiltPosition}%`
        }"
      ></div>

      <!-- Axis labels -->
      <div class="axis-labels">
        <span class="pan-label">Pan</span>
        <span class="tilt-label">Tilt</span>
      </div>
    </div>

    <!-- Value display -->
    <div class="value-display">
      <div class="value-row">
        <span class="label">Pan:</span>
        <span class="value">{{ val.panChannel.reference.value }}.{{ String(val.panFineChannel.reference.value).padStart(3, '0') }}</span>
      </div>
      <div class="value-row">
        <span class="label">Tilt:</span>
        <span class="value">{{ val.tiltChannel.reference.value }}.{{ String(val.tiltFineChannel.reference.value).padStart(3, '0') }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.light-mover-widget {
  background: var(--q-dark);
  border-radius: 8px;
  padding: 16px;
  min-width: 280px;
  user-select: none;
}

.mover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  .mover-title {
    font-weight: 500;
    color: var(--q-primary);
  }

  .reset-btn {
    color: var(--q-accent);
  }
}

.mover-pad {
  position: relative;
  width: 100%;
  height: 200px;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border: 2px solid var(--q-primary);
  border-radius: 8px;
  cursor: crosshair;
  margin-bottom: 12px;
  overflow: hidden;

  &:active {
    cursor: grabbing;
  }
}

.grid-lines {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;

  .grid-line {
    position: absolute;
    background: rgba(255, 255, 255, 0.1);

    &.horizontal {
      left: 0;
      right: 0;
      height: 1px;
    }

    &.vertical {
      top: 0;
      bottom: 0;
      width: 1px;
    }
  }
}

.position-indicator {
  position: absolute;
  width: 16px;
  height: 16px;
  background: var(--q-accent);
  border: 2px solid white;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  z-index: 2;
}

.axis-labels {
  position: absolute;
  pointer-events: none;

  .pan-label {
    position: absolute;
    bottom: 4px;
    right: 8px;
    color: rgba(255, 255, 255, 0.6);
    font-size: 12px;
  }

  .tilt-label {
    position: absolute;
    top: 8px;
    left: 4px;
    color: rgba(255, 255, 255, 0.6);
    font-size: 12px;
    transform: rotate(-90deg);
    transform-origin: left center;
  }
}

.value-display {
  display: flex;
  justify-content: space-between;
  gap: 16px;

  .value-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;

    .label {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 2px;
    }

    .value {
      font-family: 'Courier New', monospace;
      font-size: 14px;
      color: var(--q-accent);
      font-weight: bold;
    }
  }
}
</style>
