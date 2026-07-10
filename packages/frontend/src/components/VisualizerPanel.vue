<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { FixturePosition } from '@softdmx/engine';
import { resolveFixturePosition } from '@softdmx/engine';
import { useShowStore } from 'src/stores/show';
import { useThemeStore } from 'src/stores/theme';
import { readThemeCanvasPalette } from 'src/utils/theme-css';
import XCard from 'src/components/controls/XCard.vue';

type VisualizerFixture = {
  name: string;
  position?: FixturePosition;
};

const props = defineProps<{
  fixtures?: VisualizerFixture[];
  selectedFixtures?: string[];
  snapEnabled?: boolean;
  snapStep?: number;
  showGrid?: boolean;
  showLabels?: boolean;
  showStageCenter?: boolean;
  allowDrag?: boolean;
  compact?: boolean;
}>();

const emit = defineEmits<{
  'select-fixture': [name: string];
  'move-fixture': [name: string, position: { x: number; y: number; z: number }];
}>();

const showStore = useShowStore();
const containerRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const themeStore = useThemeStore();
const resolvedFixtures = computed(() =>
  props.fixtures ??
  showStore.document.fixtures.map((fixture) => ({
    name: fixture.name,
    position: fixture.position,
  }))
);
let resizeObserver: ResizeObserver | null = null;
const zoomLevel = ref(1);
const panOffset = ref({ x: 0, y: 0 });
const selectedFixtureSet = computed(() => new Set(props.selectedFixtures ?? []));
let dragFixtureName: string | null = null;
let dragPointerId: number | null = null;
let suppressClick = false;

type ResolvedFixture = {
  name: string;
  position: { x: number; y: number; z: number };
};

type PlotLayout = {
  resolved: ResolvedFixture[];
  width: number;
  height: number;
  margin: number;
  scale: number;
  centerX: number;
  centerY: number;
};

function computeLayout(canvas: HTMLCanvasElement): PlotLayout {
  const width = canvas.width;
  const height = canvas.height;
  const margin = 30;
  const fixtures = resolvedFixtures.value;
  const resolved = fixtures.map((fixture, index) => ({
    name: fixture.name,
    position: resolveFixturePosition(fixture.position, index, fixtures.length),
  }));
  const allX = [0, ...resolved.map((fixture) => fixture.position.x)];
  const allZ = [0, ...resolved.map((fixture) => fixture.position.z)];
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minZ = Math.min(...allZ);
  const maxZ = Math.max(...allZ);
  const spanX = Math.max(maxX - minX, 1);
  const spanZ = Math.max(maxZ - minZ, 1);

  const baseScale = Math.min((width - margin * 2) / spanX, (height - margin * 2) / spanZ);
  const scale = Math.max(0.1, baseScale * zoomLevel.value);
  const centerX = width / 2 - ((minX + maxX) / 2) * scale + panOffset.value.x;
  const centerY = height / 2 + ((minZ + maxZ) / 2) * scale + panOffset.value.y;
  return { resolved, width, height, margin, scale, centerX, centerY };
}

function toCanvas(layout: PlotLayout, x: number, z: number) {
  return {
    x: layout.centerX + x * layout.scale,
    y: layout.centerY - z * layout.scale,
  };
}

function fromCanvas(layout: PlotLayout, x: number, y: number) {
  return {
    x: (x - layout.centerX) / layout.scale,
    z: (layout.centerY - y) / layout.scale,
  };
}

function canvasCoordinates(event: MouseEvent | PointerEvent, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function fixtureHit(layout: PlotLayout, x: number, y: number): ResolvedFixture | null {
  for (const fixture of layout.resolved) {
    const point = toCanvas(layout, fixture.position.x, fixture.position.z);
    const dx = x - point.x;
    const dy = y - point.y;
    if (dx * dx + dy * dy <= 12 * 12) return fixture;
  }
  return null;
}

function snapValue(value: number): number {
  if (!props.snapEnabled) return value;
  const step = Math.max(0.05, props.snapStep ?? 1);
  return Math.round(value / step) * step;
}

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

  if (!resolvedFixtures.value.length) {
    ctx.fillStyle = palette.empty;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No fixtures patched yet', width / 2, height / 2);
    return;
  }

  const layout = computeLayout(canvas);
  const toPoint = (x: number, z: number) => toCanvas(layout, x, z);

  if (props.showGrid !== false) {
    const gridSteps = 6;
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSteps; i += 1) {
      const t = i / gridSteps;
      const x = layout.margin + (width - layout.margin * 2) * t;
      const y = layout.margin + (height - layout.margin * 2) * t;
      ctx.beginPath();
      ctx.moveTo(x, layout.margin);
      ctx.lineTo(x, height - layout.margin);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(layout.margin, y);
      ctx.lineTo(width - layout.margin, y);
      ctx.stroke();
    }
  }

  if (props.showStageCenter !== false) {
    const stageCenter = toPoint(0, 0);
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
  }

  for (const fixture of layout.resolved) {
    const point = toPoint(fixture.position.x, fixture.position.z);
    const isSelected = selectedFixtureSet.value.has(fixture.name);
    ctx.fillStyle = isSelected ? palette.selected : palette.fixture;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
    ctx.fill();

    if (isSelected) {
      ctx.strokeStyle = palette.selected;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (props.showLabels !== false) {
      ctx.fillStyle = palette.label;
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(fixture.name, point.x, point.y - 10);
    }
  }
}

watch(
  resolvedFixtures,
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

watch(
  () => props.selectedFixtures,
  () => {
    render();
  },
  { deep: true }
);

watch(
  () => [props.showGrid, props.showLabels, props.showStageCenter],
  () => {
    render();
  }
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
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  const canvas = canvasRef.value;
  const container = containerRef.value;
  if (!canvas || !container || !resolvedFixtures.value.length) return;

  const click = canvasCoordinates(event, canvas);
  const layout = computeLayout(canvas);
  const hit = fixtureHit(layout, click.x, click.y);
  if (hit) {
    emit('select-fixture', hit.name);
  }
}

function onCanvasWheel(event: WheelEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  event.preventDefault();
  const point = canvasCoordinates(event, canvas);
  const oldLayout = computeLayout(canvas);
  const worldBefore = fromCanvas(oldLayout, point.x, point.y);
  const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
  zoomLevel.value = Math.max(0.5, Math.min(8, zoomLevel.value * zoomFactor));
  const newLayout = computeLayout(canvas);
  const canvasAfter = toCanvas(newLayout, worldBefore.x, worldBefore.z);
  panOffset.value = {
    x: panOffset.value.x + (point.x - canvasAfter.x),
    y: panOffset.value.y + (point.y - canvasAfter.y),
  };
  render();
}

function onCanvasPointerDown(event: PointerEvent) {
  if (props.allowDrag === false) return;
  const canvas = canvasRef.value;
  if (!canvas) return;
  const point = canvasCoordinates(event, canvas);
  const layout = computeLayout(canvas);
  const hit = fixtureHit(layout, point.x, point.y);
  if (!hit) return;

  dragFixtureName = hit.name;
  dragPointerId = event.pointerId;
  suppressClick = false;
  canvas.setPointerCapture(event.pointerId);
}

function onCanvasPointerMove(event: PointerEvent) {
  if (props.allowDrag === false) return;
  const canvas = canvasRef.value;
  if (!canvas || !dragFixtureName || dragPointerId !== event.pointerId) return;
  const point = canvasCoordinates(event, canvas);
  const layout = computeLayout(canvas);
  const world = fromCanvas(layout, point.x, point.y);
  emit('move-fixture', dragFixtureName, { x: snapValue(world.x), y: 0, z: snapValue(world.z) });
  suppressClick = true;
}

function onCanvasPointerEnd(event: PointerEvent) {
  const canvas = canvasRef.value;
  if (!canvas || dragPointerId !== event.pointerId) return;
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
  dragFixtureName = null;
  dragPointerId = null;
}
</script>

<template>
  <div
    class="visualizer-root"
    :class="{ 'visualizer-root--compact': compact }"
  >
    <XCard v-if="!compact" :flat="true" :bordered="true" class="visualizer-card sdmx-panel--inset">
      <template #header>
        <div class="text-subtitle1 text-weight-medium">Fixture Layout Visualizer</div>
        <div class="text-caption text-grey-5">
          Top-down layout using fixture positions (auto-grid fallback when x/y/z is missing).
        </div>
      </template>
      <div ref="containerRef" class="visualizer-canvas-wrap">
        <canvas
          ref="canvasRef"
          class="visualizer-canvas"
          @click="onCanvasClick"
          @wheel="onCanvasWheel"
          @pointerdown="onCanvasPointerDown"
          @pointermove="onCanvasPointerMove"
          @pointerup="onCanvasPointerEnd"
          @pointercancel="onCanvasPointerEnd"
        />
      </div>
    </XCard>
    <div v-else ref="containerRef" class="visualizer-stage">
      <canvas
        ref="canvasRef"
        class="visualizer-canvas"
        @click="onCanvasClick"
        @wheel="onCanvasWheel"
        @pointerdown="onCanvasPointerDown"
        @pointermove="onCanvasPointerMove"
        @pointerup="onCanvasPointerEnd"
        @pointercancel="onCanvasPointerEnd"
      />
    </div>
  </div>
</template>

<style scoped>
.visualizer-card {
  margin-bottom: 16px;
}
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
