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
import { LightMoverModel } from './light-mover.types';
import { useChannelBinding } from 'src/composables/useChannelBinding';
import { SdmxIconButton } from 'src/components/ui';

const val = defineModel<LightMoverModel>({required: true});

const pan = useChannelBinding(() => val.value.panChannel, 'position');
const panFine = useChannelBinding(() => val.value.panFineChannel, 'position');
const tilt = useChannelBinding(() => val.value.tiltChannel, 'position');
const tiltFine = useChannelBinding(() => val.value.tiltFineChannel, 'position');

const hasFineChannels = computed(
  () => !!val.value.panFineChannel && !!val.value.tiltFineChannel
);

// Convert DMX values to pad coordinates (0-100%)
const panPosition = computed(() => {
  if (hasFineChannels.value) {
    const combined = (pan.value * 256 + panFine.value) / 65535;
    return combined * 100;
  }
  return (pan.value / 255) * 100;
});

const tiltPosition = computed(() => {
  if (hasFineChannels.value) {
    const combined = (tilt.value * 256 + tiltFine.value) / 65535;
    return combined * 100;
  }
  return (tilt.value / 255) * 100;
});

const panDisplay = computed(() => {
  if (hasFineChannels.value) {
    return `${pan.value}.${String(panFine.value).padStart(3, '0')}`;
  }
  return String(pan.value);
});
const tiltDisplay = computed(() => {
  if (hasFineChannels.value) {
    return `${tilt.value}.${String(tiltFine.value).padStart(3, '0')}`;
  }
  return String(tilt.value);
});

const padRef = ref<HTMLElement>();

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

  // Convert to DMX values
  if (hasFineChannels.value) {
    const panValue16bit = Math.round(x * 65535);
    const tiltValue16bit = Math.round(y * 65535);
    pan.value = Math.floor(panValue16bit / 256);
    panFine.value = panValue16bit % 256;
    tilt.value = Math.floor(tiltValue16bit / 256);
    tiltFine.value = tiltValue16bit % 256;
  } else {
    pan.value = Math.round(x * 255);
    tilt.value = Math.round(y * 255);
  }
}

function resetPosition() {
  if (hasFineChannels.value) {
    pan.value = 127;
    panFine.value = 128;
    tilt.value = 127;
    tiltFine.value = 128;
    return;
  }

  pan.value = 127;
  tilt.value = 127;
}

</script>

<template>
  <div class="light-mover-widget">
    <div class="mover-header">
      <span class="mover-title">Light Mover</span>
      <SdmxIconButton
        icon="center_focus_strong"
        info-key="widgets.lightMover.reset"
        class="reset-btn"
        @click="resetPosition"
      />
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
        <span class="value">{{ panDisplay }}</span>
      </div>
      <div class="value-row">
        <span class="label">Tilt:</span>
        <span class="value">{{ tiltDisplay }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.light-mover-widget {
  background: var(--sdmx-color-bg-surface);
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
    color: var(--sdmx-color-primary);
  }

  .reset-btn {
    color: var(--sdmx-color-accent);
  }
}

.mover-pad {
  position: relative;
  width: 100%;
  height: 200px;
  background: var(--sdmx-gradient-widget);
  border: 2px solid var(--sdmx-color-primary);
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
    background: var(--sdmx-color-border);

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
  background: var(--sdmx-color-accent);
  border: 2px solid white;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  box-shadow: 0 2px 8px var(--sdmx-color-shadow);
  z-index: 2;
}

.axis-labels {
  position: absolute;
  pointer-events: none;

  .pan-label {
    position: absolute;
    bottom: 4px;
    right: 8px;
    color: var(--sdmx-color-text-muted);
    font-size: 12px;
  }

  .tilt-label {
    position: absolute;
    top: 8px;
    left: 4px;
    color: var(--sdmx-color-text-muted);
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
      color: var(--sdmx-color-text-muted);
      margin-bottom: 2px;
    }

    .value {
      font-family: 'Courier New', monospace;
      font-size: 14px;
      color: var(--sdmx-color-accent);
      font-weight: bold;
    }
  }
}
</style>
