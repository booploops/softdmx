<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useShowStore } from 'src/stores/show';
import { useVideoStore } from 'src/stores/video';
import type { PixelMapDefinition, VideoInputKind, VideoSampleFps, VideoSampleRegion } from '@softdmx/engine';
import {
  FULL_VIDEO_SAMPLE_REGION,
  normalizeSampleRegion,
  resolvePixelMapVideoGain,
  resolvePixelMapVideoSmoothingMs,
  resolveVideoPixelMapIds,
} from '@softdmx/engine';

const ROI_COLORS = ['#1976d2', '#e53935', '#43a047', '#fb8c00', '#8e24aa', '#00acc1'];

const $q = useQuasar();
const showStore = useShowStore();
const videoStore = useVideoStore();

const previewRef = ref<HTMLCanvasElement | null>(null);
const selectedRoiMapId = ref('');
const dragMode = ref<'move' | 'resize' | null>(null);
const dragStart = ref<{ x: number; y: number; mapId: string; region: VideoSampleRegion } | null>(
  null
);
let previewLoopId: number | null = null;

const videoConfig = computed(() => showStore.document.video);
const pixelMaps = computed(() => showStore.document.pixelMaps ?? []);
const activeVideoMapIds = computed(() => resolveVideoPixelMapIds(videoConfig.value));

const activeVideoMaps = computed(() =>
  activeVideoMapIds.value
    .map((id) => pixelMaps.value.find((map) => map.id === id))
    .filter((map): map is PixelMapDefinition => Boolean(map))
);

const selectedRoiMap = computed(
  () => activeVideoMaps.value.find((map) => map.id === selectedRoiMapId.value) ?? null
);

const sampleRegion = computed(() => normalizeSampleRegion(selectedRoiMap.value?.sampleRegion));

const selectedMapGain = computed(() =>
  selectedRoiMap.value ? resolvePixelMapVideoGain(selectedRoiMap.value, videoConfig.value) : 1
);

const selectedMapSmoothingMs = computed(() =>
  selectedRoiMap.value
    ? resolvePixelMapVideoSmoothingMs(selectedRoiMap.value, videoConfig.value)
    : 80
);

const roiMapOptions = computed(() =>
  activeVideoMaps.value.map((map, index) => ({
    label: map.name,
    value: map.id,
    color: ROI_COLORS[index % ROI_COLORS.length],
  }))
);

const inputKindOptions = computed(() => {
  const options: { label: string; value: VideoInputKind }[] = [
    { label: 'None', value: 'none' },
    { label: 'Webcam / OBS Virtual Camera', value: 'webcam' },
  ];
  if ($q.platform.is.mac) options.push({ label: 'Syphon', value: 'syphon' });
  if ($q.platform.is.win) options.push({ label: 'Spout', value: 'spout' });
  return options;
});

const deviceOptions = computed(() =>
  videoStore.devices.map((device) => ({
    label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
    value: device.deviceId,
  }))
);

const senderOptions = computed(() =>
  videoStore.senders.map((sender) => ({
    label: sender.appName ? `${sender.name} (${sender.appName})` : sender.name,
    value: sender.name,
  }))
);

const pixelMapOptions = computed(() =>
  pixelMaps.value.map((map) => ({ label: map.name, value: map.id }))
);

const sampleFpsOptions: { label: string; value: VideoSampleFps }[] = [
  { label: '15', value: 15 },
  { label: '24', value: 24 },
  { label: '30', value: 30 },
  { label: '44 - DMX Max Rate', value: 44 },
  { label: '60', value: 60 },
];

function mapColor(mapId: string): string {
  const index = activeVideoMaps.value.findIndex((map) => map.id === mapId);
  return ROI_COLORS[Math.max(0, index) % ROI_COLORS.length] ?? ROI_COLORS[0]!;
}

function patchVideo(patch: Partial<NonNullable<typeof videoConfig.value>>) {
  showStore.updateDocument((doc) => {
    doc.video = { ...(doc.video ?? {}), ...patch };
  });
}

function patchPixelMap(mapId: string, patch: Partial<PixelMapDefinition>) {
  showStore.updateDocument((doc) => {
    doc.pixelMaps = (doc.pixelMaps ?? []).map((map) =>
      map.id === mapId ? { ...map, ...patch } : map
    );
  });
}

function patchRegion(mapId: string, region: VideoSampleRegion) {
  videoStore.updatePixelMapRegion(mapId, normalizeSampleRegion(region));
}

function canvasPoint(event: MouseEvent): { x: number; y: number } | null {
  const canvas = previewRef.value;
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height,
  };
}

function regionForMap(map: PixelMapDefinition): VideoSampleRegion {
  return normalizeSampleRegion(map.sampleRegion);
}

function hitTestRegion(
  point: { x: number; y: number },
  region: VideoSampleRegion
): 'resize' | 'move' | null {
  const inResize =
    point.x >= region.x + region.width - 0.03 &&
    point.x <= region.x + region.width + 0.01 &&
    point.y >= region.y + region.height - 0.03 &&
    point.y <= region.y + region.height + 0.01;
  if (inResize) return 'resize';

  const inMove =
    point.x >= region.x &&
    point.x <= region.x + region.width &&
    point.y >= region.y &&
    point.y <= region.y + region.height;
  if (inMove) return 'move';

  return null;
}

function drawMapRoi(
  ctx: CanvasRenderingContext2D,
  map: PixelMapDefinition,
  width: number,
  height: number,
  selected: boolean
) {
  const region = regionForMap(map);
  const color = mapColor(map.id);
  const rx = region.x * width;
  const ry = region.y * height;
  const rw = region.width * width;
  const rh = region.height * height;

  ctx.strokeStyle = color;
  ctx.lineWidth = selected ? 3 : 2;
  ctx.strokeRect(rx, ry, rw, rh);
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = color;
  ctx.fillRect(rx, ry, rw, rh);
  ctx.restore();

  if (selected) {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= map.width; x += 1) {
      const px = rx + (x / map.width) * rw;
      ctx.beginPath();
      ctx.moveTo(px, ry);
      ctx.lineTo(px, ry + rh);
      ctx.stroke();
    }
    for (let y = 0; y <= map.height; y += 1) {
      const py = ry + (y / map.height) * rh;
      ctx.beginPath();
      ctx.moveTo(rx, py);
      ctx.lineTo(rx + rw, py);
      ctx.stroke();
    }

    const handle = 10;
    ctx.fillStyle = color;
    ctx.fillRect(rx + rw - handle, ry + rh - handle, handle, handle);
  }

  ctx.fillStyle = color;
  ctx.font = '12px sans-serif';
  ctx.fillText(map.name, rx + 4, ry + 14);
}

function drawPreview() {
  const canvas = previewRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.clientWidth || 640;
  const height = canvas.clientHeight || 360;
  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, width, height);

  const video = videoStore.getVideoElement();
  if (video && video.readyState >= 2 && video.videoWidth > 0) {
    ctx.drawImage(video, 0, 0, width, height);
  } else {
    ctx.fillStyle = '#333';
    ctx.font = '14px sans-serif';
    ctx.fillText('No video preview — enable a source', 16, 28);
  }

  for (const map of activeVideoMaps.value) {
    drawMapRoi(ctx, map, width, height, map.id === selectedRoiMapId.value);
  }
}

function onPointerDown(event: MouseEvent) {
  const point = canvasPoint(event);
  if (!point) return;

  for (let i = activeVideoMaps.value.length - 1; i >= 0; i -= 1) {
    const map = activeVideoMaps.value[i]!;
    const region = regionForMap(map);
    const hit = hitTestRegion(point, region);
    if (hit === 'resize') {
      selectedRoiMapId.value = map.id;
      dragMode.value = 'resize';
      dragStart.value = { x: point.x, y: point.y, mapId: map.id, region: { ...region } };
      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);
      return;
    }
  }

  for (let i = activeVideoMaps.value.length - 1; i >= 0; i -= 1) {
    const map = activeVideoMaps.value[i]!;
    const region = regionForMap(map);
    if (hitTestRegion(point, region) === 'move') {
      selectedRoiMapId.value = map.id;
      dragMode.value = 'move';
      dragStart.value = { x: point.x, y: point.y, mapId: map.id, region: { ...region } };
      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);
      return;
    }
  }

  const targetMapId = selectedRoiMapId.value || activeVideoMaps.value[0]?.id;
  if (!targetMapId) return;

  selectedRoiMapId.value = targetMapId;
  dragMode.value = 'move';
  const nextRegion = { x: point.x, y: point.y, width: 0.15, height: 0.15 };
  patchRegion(targetMapId, nextRegion);
  dragStart.value = { x: point.x, y: point.y, mapId: targetMapId, region: nextRegion };
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);
  drawPreview();
}

function onPointerMove(event: MouseEvent) {
  if (!dragMode.value || !dragStart.value) return;
  const point = canvasPoint(event);
  if (!point) return;

  const start = dragStart.value;
  if (dragMode.value === 'move') {
    const dx = point.x - start.x;
    const dy = point.y - start.y;
    patchRegion(
      start.mapId,
      normalizeSampleRegion({
        x: start.region.x + dx,
        y: start.region.y + dy,
        width: start.region.width,
        height: start.region.height,
      })
    );
  } else {
    patchRegion(
      start.mapId,
      normalizeSampleRegion({
        x: start.region.x,
        y: start.region.y,
        width: Math.max(0.05, point.x - start.region.x),
        height: Math.max(0.05, point.y - start.region.y),
      })
    );
  }
  drawPreview();
}

function onPointerUp() {
  dragMode.value = null;
  dragStart.value = null;
  window.removeEventListener('mousemove', onPointerMove);
  window.removeEventListener('mouseup', onPointerUp);
}

function resetRegion() {
  const mapId = selectedRoiMapId.value || activeVideoMaps.value[0]?.id;
  if (!mapId) return;
  patchRegion(mapId, { ...FULL_VIDEO_SAMPLE_REGION });
  drawPreview();
}

function lockMapAspect() {
  const map = selectedRoiMap.value;
  if (!map) return;
  const aspect = map.width / map.height;
  const region = sampleRegion.value;
  const width = region.width;
  const height = Math.min(region.height, width / aspect);
  patchRegion(map.id, normalizeSampleRegion({ ...region, height }));
}

function startPreviewPaintLoop() {
  const loop = () => {
    if (videoStore.running) {
      drawPreview();
    }
    previewLoopId = requestAnimationFrame(loop);
  };
  if (previewLoopId !== null) cancelAnimationFrame(previewLoopId);
  previewLoopId = requestAnimationFrame(loop);
}

function stopPreviewPaintLoop() {
  if (previewLoopId !== null) {
    cancelAnimationFrame(previewLoopId);
    previewLoopId = null;
  }
}

onMounted(async () => {
  await videoStore.refreshDevices();
  await videoStore.refreshSenders();
  if (!selectedRoiMapId.value && activeVideoMaps.value[0]) {
    selectedRoiMapId.value = activeVideoMaps.value[0].id;
  }
  drawPreview();
  startPreviewPaintLoop();
});

onUnmounted(() => {
  stopPreviewPaintLoop();
});

watch(activeVideoMapIds, (ids) => {
  if (ids.length === 0) {
    selectedRoiMapId.value = '';
    return;
  }
  if (!ids.includes(selectedRoiMapId.value)) {
    selectedRoiMapId.value = ids[0] ?? '';
  }
  drawPreview();
});

watch(
  () => [videoStore.running, pixelMaps.value.map((map) => map.sampleRegion)],
  () => drawPreview(),
  { deep: true }
);
</script>

<template>
  <div class="video-mapping-panel">
    <div class="video-mapping-panel__title">Video → Pixel Map</div>
    <div class="video-mapping-panel__subtitle">
      Sample live video into one or more pixel maps. Each map has its own ROI on the shared source —
      use disjoint regions to drive different fixture groups from the same feed.
    </div>

    <section class="preview-section">
      <div class="preview-wrap">
        <canvas
          ref="previewRef"
          class="video-preview-canvas"
          @mousedown="onPointerDown"
        />
      </div>
      <div class="preview-toolbar">
        <div
          v-if="activeVideoMaps.length > 1"
          class="preview-toolbar__select"
        >
          <XSelect
            :model-value="selectedRoiMapId"
            :options="roiMapOptions"
            label="Edit ROI for"
            @update:model-value="selectedRoiMapId = String($event ?? '')"
          />
        </div>
        <XButton
          flat
          label="Full frame"
          :disable="!selectedRoiMap"
          @click="resetRegion"
        />
        <XButton
          flat
          label="Lock map aspect"
          :disable="!selectedRoiMap"
          @click="lockMapAspect"
        />
        <span
          v-if="selectedRoiMap"
          class="preview-toolbar__roi"
        >
          {{ selectedRoiMap.name }} ROI:
          x {{ (sampleRegion.x * 100).toFixed(1) }}%
          y {{ (sampleRegion.y * 100).toFixed(1) }}%
          w {{ (sampleRegion.width * 100).toFixed(1) }}%
          h {{ (sampleRegion.height * 100).toFixed(1) }}%
        </span>
      </div>
      <div
        v-if="selectedRoiMap"
        class="preview-params"
      >
        <XInput
          type="number"
          :label="`${selectedRoiMap.name} gain`"
          :model-value="selectedMapGain"
          @update:model-value="patchPixelMap(selectedRoiMapId, { videoGain: Number($event) })"
        />
        <XInput
          type="number"
          :label="`${selectedRoiMap.name} smoothing (ms)`"
          :model-value="selectedMapSmoothingMs"
          @update:model-value="
            patchPixelMap(selectedRoiMapId, { videoSmoothingMs: Number($event) })
          "
        />
      </div>
    </section>

    <section class="options-section">
      <XSwitch
        :model-value="videoConfig?.enabled === true"
        label="Enable video mapping"
        @update:model-value="patchVideo({ enabled: $event })"
      />

      <div class="options-grid">
        <div class="options-grid__maps">
          <div class="field-label">Pixel maps</div>
          <div class="options-grid__map-list">
            <XCheckbox
              v-for="opt in pixelMapOptions"
              :key="opt.value"
              :label="opt.label"
              :model-value="activeVideoMapIds.includes(opt.value)"
              @update:model-value="(checked) => {
                const current = [...activeVideoMapIds];
                if (checked) {
                  if (!current.includes(opt.value)) current.push(opt.value);
                } else {
                  const idx = current.indexOf(opt.value);
                  if (idx > -1) current.splice(idx, 1);
                }
                patchVideo({ pixelMapIds: current });
              }"
            />
          </div>
        </div>

        <XSelect
          :model-value="videoConfig?.inputKind ?? 'none'"
          :options="inputKindOptions"
          label="Source"
          @update:model-value="patchVideo({ inputKind: $event })"
        />

        <XSelect
          v-if="videoConfig?.inputKind === 'webcam'"
          :model-value="videoConfig?.deviceId"
          :options="deviceOptions"
          label="Camera device"
          @update:model-value="patchVideo({ deviceId: $event })"
        />

        <div
          v-if="videoConfig?.inputKind === 'syphon' || videoConfig?.inputKind === 'spout'"
          class="options-grid__sender"
        >
          <XSelect
            :model-value="videoConfig?.senderName"
            :options="senderOptions"
            label="Sender"
            @update:model-value="patchVideo({ senderName: $event })"
          />
          <XButton
            flat
            icon="refresh"
            @click="videoStore.refreshSenders()"
          />
        </div>

        <XInput
          type="number"
          label="Black level"
          :model-value="videoConfig?.blackLevel ?? 0"
          @update:model-value="patchVideo({ blackLevel: Number($event) })"
        />
        <XSelect
          :model-value="videoConfig?.fps ?? 30"
          :options="sampleFpsOptions"
          label="Sample FPS"
          @update:model-value="patchVideo({ fps: $event as VideoSampleFps })"
        />
      </div>

      <div class="status-line">
        Status: {{ videoStore.status.connected ? 'connected' : 'idle' }}
        · {{ videoStore.status.fps }} fps
        <span v-if="videoStore.status.sourceWidth">
          · {{ videoStore.status.sourceWidth }}×{{ videoStore.status.sourceHeight }}
        </span>
        <span v-if="activeVideoMaps.length > 0">
          · {{ activeVideoMaps.length }} map{{ activeVideoMaps.length === 1 ? '' : 's' }} active
        </span>
      </div>
      <div
        v-if="videoConfig?.enabled && activeVideoMaps.length === 0"
        class="status-warning"
      >
        Select at least one pixel map to drive fixtures. Preview still works without one.
      </div>
    </section>
  </div>
</template>

<style scoped>
.video-mapping-panel {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.video-mapping-panel__title {
  font-size: 1.1rem;
  font-weight: 600;
}

.video-mapping-panel__subtitle {
  font-size: 12px;
  color: var(--sdmx-color-text-muted);
}

.preview-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-wrap {
  width: 100%;
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-md);
  background: #000;
  aspect-ratio: 16 / 9;
}

.preview-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.preview-toolbar__select {
  min-width: 180px;
}

.preview-toolbar__roi {
  font-size: 12px;
  color: var(--sdmx-color-text-muted);
}

.preview-params {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 220px));
  gap: 12px;
}

.options-section {
  width: 100%;
  padding-top: 12px;
  border-top: 1px solid var(--sdmx-color-border-subtle);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  align-items: start;
}

.options-grid__maps {
  grid-column: 1 / -1;
}

.options-grid__map-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 4px;
}

.options-grid__sender {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.field-label {
  font-size: 12px;
  color: var(--sdmx-color-text-muted);
  margin-bottom: 6px;
}

.status-line {
  font-size: 12px;
  color: var(--sdmx-color-text-muted);
}

.status-warning {
  font-size: 12px;
  color: var(--sdmx-color-warning, #ff9f0a);
}

.video-preview-canvas {
  width: 100%;
  height: 100%;
  display: block;
  cursor: crosshair;
}
</style>
