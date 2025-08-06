<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useDMXStore } from 'src/stores/dmx';
import { storeToRefs } from 'pinia';
import { useIOClient } from 'src/lib/io-client';
import { ActiveChannel } from 'src/types';

/**
 * DMX (Digital Multiplex) Grid Node Display
 *
 * This component renders a grid node display for DMX lighting control that is displayed on a canvas element, that gets composited onto a video later in OBS.
 * The canvas is initialized with a black rectangle and has a default size of 1920x208 pixels.
 *
 * Important considerations:
 * - Channels start at 1 and go up to 512, which is the standard for DMX512 universes.
 * - Each channel is represented as a 16x16 pixel square in the grid node.
 * - Supports explicit channel assignments (e.g., fixture at channel 100) with gaps filled as black.
 * - Channels are displayed at their actual DMX channel positions, not sequential array positions.
 */
const canvasElement = ref<HTMLCanvasElement | null>(null);

const width = ref(1920);
const height = ref(208);

const MAX_CHANNELS = 512; // Maximum number of DMX channels, 512 is the standard for DMX512 universes
const CHANNEL_PIXEL_SIZE = 16; // Size of each channel in a sector strip, 16x16 pixels in this case
const SECTOR_STRIP_COUNT = 13; // Number of sector strips in the grid node


const { channels } = storeToRefs(useDMXStore());

const canvasStyle = computed(() => {
  return {
    width: `${width.value}px`,
    height: `${height.value}px`,
  };
});

function drawCanvas() {
  const canvas = canvasElement.value!;
  const ctx = canvas.getContext('2d');
  canvas.width = width.value;
  canvas.height = height.value;
  if (ctx) {
    // Clear canvas with black background
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width.value, height.value);

    // Update channel map cache if needed
    updateChannelMapCache();

    // Draw all 512 channels, using actual values where available
    for (let channelId = 1; channelId <= MAX_CHANNELS; channelId++) {
      const sectorIndex = Math.floor((channelId - 1) / SECTOR_STRIP_COUNT);
      const channelInSector = (channelId - 1) % SECTOR_STRIP_COUNT;

      // Get channel value from cache, default to 0 if not found
      const brightness = channelMapCache.get(channelId) ?? 0;
      ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;

      // Draw channel pixel
      ctx.fillRect(
        sectorIndex * CHANNEL_PIXEL_SIZE, // x position
        channelInSector * CHANNEL_PIXEL_SIZE, // y position
        CHANNEL_PIXEL_SIZE, // width
        CHANNEL_PIXEL_SIZE // height
      );
    }
  }
}

// watch(channels, () => {
//     if(!canvasElement.value) return;
//     drawCanvas();
// }, {
//     immediate: true,
//     deep: true,
// })

let channelsCached: ActiveChannel[] = [];
let channelMapCache = new Map<number, number>();
let isDirty = true; // Flag to track if we need to rebuild the channel map

// use requestAnimationFrame to draw the canvas
let animationFrameId: number;

function updateChannelMapCache() {
  if (isDirty) {
    channelMapCache.clear();
    channelsCached.forEach(channel => {
      channelMapCache.set(channel.id, channel.value);
    });
    isDirty = false;
  }
}

function animate() {
  if (canvasElement.value) {
    drawCanvas();
  }
  animationFrameId = requestAnimationFrame(animate);
}

function listenForUpdates() {
  const io = useIOClient();
  io.on('channels:update', (channels: ActiveChannel[]) => {
    if (canvasElement.value) {
      channelsCached = channels;
      isDirty = true; // Mark cache as dirty when channels update
      // drawCanvas();
    }
  });
}

function stopListeningForUpdates() {
  const io = useIOClient();
  io.off('channels:update');
}


onBeforeUnmount(() => {
  stopListeningForUpdates();
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
});

watch(canvasElement, (element) => {
  if (element) {
    listenForUpdates();
    drawCanvas();
    animate(); // Start the animation loop
  }
}, {
  immediate: true,
})
</script>

<template>
  <canvas
    ref="canvasElement"
    class="dmx-gridnode"
    :style="canvasStyle"
  ></canvas>
</template>

<style scoped></style>
