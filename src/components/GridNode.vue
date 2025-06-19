<script setup lang="ts">
import { useDMXStore } from 'src/stores/dmx';
import { storeToRefs } from 'pinia';

/**
 * DMX (Digital Multiplex) Grid Node Display
 *
 * This component renders a grid node display for DMX lighting control that is displayed on a canvas element, that gets composited onto a video later in OBS.
 * The canvas is initialized with a black rectangle and has a default size of 1920x208 pixels.
 *
 * Important considerations:
 * - Channels start a 1 and go up to 512, which is the standard for DMX512 universes.
 * - Each channel is represented as a 16x16 pixel square in the grid node.
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

        // Draw channels
        channels.value.forEach(channel => {
            const sectorIndex = Math.floor((channel.id - 1) / SECTOR_STRIP_COUNT);
            const channelInSector = (channel.id - 1) % SECTOR_STRIP_COUNT;

            // Calculate brightness based on channel value (0-255)
            const brightness = channel.value;
            ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;

            // Draw channel pixel
            ctx.fillRect(
                sectorIndex * CHANNEL_PIXEL_SIZE, // x position
                channelInSector * CHANNEL_PIXEL_SIZE, // y position
                CHANNEL_PIXEL_SIZE, // width
                CHANNEL_PIXEL_SIZE // height
            );
        });

        // Fill remaining channels with black
        if (channels.value.length < MAX_CHANNELS) {
            ctx.fillStyle = 'rgb(0, 0, 0)';
            for (let i = channels.value.length; i < MAX_CHANNELS; i++) {
                const sectorIndex = Math.floor(i / SECTOR_STRIP_COUNT);
                const channelInSector = i % SECTOR_STRIP_COUNT;
                ctx.fillRect(
                    sectorIndex * CHANNEL_PIXEL_SIZE,
                    channelInSector * CHANNEL_PIXEL_SIZE,
                    CHANNEL_PIXEL_SIZE,
                    CHANNEL_PIXEL_SIZE
                );
            }
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

// use requestAnimationFrame to draw the canvas
let animationFrameId: number;

function animate() {
    if (canvasElement.value) {
        drawCanvas();
    }
    animationFrameId = requestAnimationFrame(animate);
}

onMounted(() => {
    if (canvasElement.value) {
        drawCanvas();
        animate(); // Start the animation loop
    }
});

onBeforeUnmount(() => {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
});

watch(canvasElement, (element) => {
    if (element) {
        drawCanvas();
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
