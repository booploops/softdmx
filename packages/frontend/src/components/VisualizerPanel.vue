<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { FixturePosition } from 'src/types';
import { resolveFixturePosition } from 'src/utils/pan-tilt-aim';
import { useThemeStore } from 'src/stores/theme';
import { readThemeCanvasPalette } from 'src/utils/theme-css';

type VisualizerFixture = {
  name: string;
  position?: FixturePosition;
};

const props = defineProps<{
  fixtures: VisualizerFixture[];
  compact?: boolean;
}>();

const emit = defineEmits<{ 'select-fixture': [name: string] }>();

const containerRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const themeStore = useThemeStore();
let resizeObserver: ResizeObserver | null = null;

function readCanvasCssSize(): { width: number; height: number } | null {
  const container = containerRef.value;
  if (!container) return null;

  const rect = container.getBoundingClientRect();
  const width = Math.floor(rect.width);
  const height = Math.floor(rect.height);
  if (width < 1) return null;

  if (props.compact) {
    if (height < 1) return null;
    return { width, height };
  }

  return { width, height: Math.max(280, height || 280) };
}

function render() {
  const canvas = canvasRef.value;
  const size = readCanvasCssSize();
  if (!canvas || !size) return;

  const { width, height } = size;
  const palette = readThemeCanvasPalette();

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, width, height);

  if (!props.fixtures.length) {
    ctx.fillStyle = palette.empty;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No fixtures patched yet', width / 2, height / 2);
    return;
  }

  const resolved = props.fixtures.map((fixture, index) => ({
    name: fixture.name,
    position: resolveFixturePosition(fixture.position, index, props.fixtures.length),
  }));

  const allX = [0, ...resolved.map((f) => f.position.x)];
  const allZ = [0, ...resolved.map((f) => f.position.z)];
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minZ = Math.min(...allZ);
  const maxZ = Math.max(...allZ);
  const spanX = Math.max(maxX - minX, 1);
  const spanZ = Math.max(maxZ - minZ, 1);
  const margin = 30;

  const scale = Math.min((width - margin * 2) / spanX, (height - margin * 2) / spanZ);
  const centerX = width / 2 - ((minX + maxX) / 2) * scale;
  const centerY = height / 2 + ((minZ + maxZ) / 2) * scale;

  const toCanvas = (x: number, z: number) => ({
    x: centerX + x * scale,
    y: centerY - z * scale,
  });

  const gridSteps = 6;
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= gridSteps; i += 1) {
    const t = i / gridSteps;
    const x = margin + (width - margin * 2) * t;
    const y = margin + (height - margin * 2) * t;
    ctx.beginPath();
    ctx.moveTo(x, margin);
    ctx.lineTo(x, height - margin);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(width - margin, y);
    ctx.stroke();
  }

  const stageCenter = toCanvas(0, 0);
  ctx.strokeStyle = palette.center;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(stageCenter.x - 8, stageCenter.y);
  ctx.lineTo(stageCenter.x + 8, stageCenter.y);
  ctx.moveTo(stageCenter.x, stageCenter.y - 8);
  ctx.lineTo(stageCenter.x, stageCenter.y + 8);
  ctx.stroke();
  ctx.fillStyle = palette.center;
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Stage center', stageCenter.x + 10, stageCenter.y - 10);

  for (const fixture of resolved) {
    const point = toCanvas(fixture.position.x, fixture.position.z);
    ctx.fillStyle = palette.fixture;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = palette.label;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(fixture.name, point.x, point.y - 10);
  }
}

watch(
  () => props.fixtures,
  () => {
    render();
  },
  { deep: true }
);

watch(
  () => themeStore.resolvedTheme,
  () => {
    render();
  },
  { deep: true }
);

onMounted(async () => {
  await nextTick();
  render();
  if (!containerRef.value) return;
  resizeObserver = new ResizeObserver(() => {
    render();
  });
  resizeObserver.observe(containerRef.value);
  window.addEventListener('resize', render);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  window.removeEventListener('resize', render);
});

function onCanvasClick(event: MouseEvent) {
  const canvas = canvasRef.value;
  const container = containerRef.value;
  if (!canvas || !container || !props.fixtures.length) return;

  const rect = canvas.getBoundingClientRect();
  const clickX = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const clickY = ((event.clientY - rect.top) / rect.height) * canvas.height;

  const resolved = props.fixtures.map((fixture, index) => ({
    name: fixture.name,
    position: resolveFixturePosition(fixture.position, index, props.fixtures.length),
  }));

  const allX = [0, ...resolved.map((f) => f.position.x)];
  const allZ = [0, ...resolved.map((f) => f.position.z)];
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minZ = Math.min(...allZ);
  const maxZ = Math.max(...allZ);
  const spanX = Math.max(maxX - minX, 1);
  const spanZ = Math.max(maxZ - minZ, 1);
  const margin = 30;
  const width = canvas.width;
  const height = canvas.height;
  const scale = Math.min((width - margin * 2) / spanX, (height - margin * 2) / spanZ);
  const centerX = width / 2 - ((minX + maxX) / 2) * scale;
  const centerY = height / 2 + ((minZ + maxZ) / 2) * scale;

  for (const fixture of resolved) {
    const x = centerX + fixture.position.x * scale;
    const y = centerY - fixture.position.z * scale;
    const dx = clickX - x;
    const dy = clickY - y;
    if (dx * dx + dy * dy <= 12 * 12) {
      emit('select-fixture', fixture.name);
      return;
    }
  }
}
</script>

<template>
  <div
    class="visualizer-root"
    :class="{ 'visualizer-root--compact': compact }"
  >
    <q-card v-if="!compact" flat bordered class="visualizer-card sdmx-panel--inset q-mb-md">
      <q-card-section class="q-pb-sm">
        <div class="text-subtitle1 text-weight-medium">Fixture Layout Visualizer</div>
        <div class="text-caption text-grey-5">
          Top-down layout using fixture positions (auto-grid fallback when x/y/z is missing).
        </div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <div ref="containerRef" class="visualizer-canvas-wrap">
          <canvas ref="canvasRef" class="visualizer-canvas" @click="onCanvasClick" />
        </div>
      </q-card-section>
    </q-card>
    <div v-else ref="containerRef" class="visualizer-stage">
      <canvas ref="canvasRef" class="visualizer-canvas" @click="onCanvasClick" />
    </div>
  </div>
</template>

<style scoped>
.visualizer-root--compact {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.visualizer-stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  width: 100%;
  overflow: hidden;
}

.visualizer-stage .visualizer-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.visualizer-canvas-wrap {
  width: 100%;
}

.visualizer-canvas {
  border-radius: var(--sdmx-radius-sm);
  border: 1px solid var(--sdmx-color-border);
  background: var(--sdmx-color-canvas-bg);
  cursor: crosshair;
  display: block;
}

.visualizer-canvas-wrap .visualizer-canvas {
  width: 100%;
  height: 280px;
}
</style>
