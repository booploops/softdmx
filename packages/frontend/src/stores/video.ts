/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import type { PixelColor } from '@softdmx/engine';
import type { PixelMapDefinition, ShowVideoConfig, VideoInputKind } from '@softdmx/engine';
import { useShowStore } from './show';
import { useOutputEngineStore } from './output-playback';
import { normalizeVideoFps, resolveVideoPixelMapIds, sampleRgbGridBuffer } from '@softdmx/engine';
import VideoSamplerWorker from '../workers/video-sampler.worker.ts?worker';
import { recordRuntimeMetric } from 'src/utils/runtime-metrics';

export interface VideoSenderInfo {
  name: string;
  appName?: string;
}

export interface VideoStatus {
  connected: boolean;
  sourceWidth: number;
  sourceHeight: number;
  fps: number;
  droppedFrames: number;
}

const DEFAULT_STATUS: VideoStatus = {
  connected: false,
  sourceWidth: 0,
  sourceHeight: 0,
  fps: 0,
  droppedFrames: 0,
};

function frameIntervalMs(fps: number): number {
  return 1000 / Math.max(1, fps);
}

export const useVideoStore = defineStore('video', () => {
  const running = ref(false);
  const previewCanvas = ref<HTMLCanvasElement | null>(null);
  const sampleCanvas = ref<HTMLCanvasElement | null>(null);
  const videoElement = ref<HTMLVideoElement | null>(null);
  const mediaStream = ref<MediaStream | null>(null);
  const devices = ref<MediaDeviceInfo[]>([]);
  const senders = ref<VideoSenderInfo[]>([]);
  const status = ref<VideoStatus>({ ...DEFAULT_STATUS });
  const latestPixelsByMap = ref<Map<string, PixelColor[][]>>(new Map());
  const previewUrl = ref<string | null>(null);

  let rafId: number | null = null;
  let previewRafId: number | null = null;
  let lastSampleAt = 0;
  let frameCounter = 0;
  let previewFrameCounter = 0;
  let lastFpsAt = performance.now();
  let previewHost: HTMLDivElement | null = null;
  let samplerWorker: Worker | null = null;

  const isElectron = computed(() => Boolean(window.electronVideo));
  const canUseWebcam = computed(
    () => typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
  );

  const activePixelMaps = computed<PixelMapDefinition[]>(() => {
    const show = useShowStore().document;
    const ids = resolveVideoPixelMapIds(show.video);
    const maps = show.pixelMaps ?? [];
    return ids
      .map((id) => maps.find((map) => map.id === id))
      .filter((map): map is PixelMapDefinition => Boolean(map));
  });

  function ensureCanvases() {
    if (!sampleCanvas.value && typeof document !== 'undefined') {
      sampleCanvas.value = document.createElement('canvas');
    }
    if (!previewCanvas.value && typeof document !== 'undefined') {
      previewCanvas.value = document.createElement('canvas');
    }
    if (!videoElement.value && typeof document !== 'undefined') {
      videoElement.value = document.createElement('video');
      videoElement.value.muted = true;
      videoElement.value.playsInline = true;
      videoElement.value.autoplay = true;
    }
    attachVideoToDom();
  }

  /** Chromium often stalls off-DOM camera streams after the first decoded frame. */
  function attachVideoToDom() {
    const video = videoElement.value;
    if (!video || typeof document === 'undefined') return;

    if (!previewHost) {
      previewHost = document.createElement('div');
      previewHost.setAttribute('data-sdmx-video-host', 'true');
      previewHost.style.cssText =
        'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;';
      document.body.appendChild(previewHost);
    }

    if (video.parentElement !== previewHost) {
      previewHost.appendChild(video);
    }
  }

  function detachVideoFromDom() {
    videoElement.value?.remove();
  }

  function stopPreviewLoop() {
    if (previewRafId !== null) {
      cancelAnimationFrame(previewRafId);
      previewRafId = null;
    }
    previewFrameCounter = 0;
  }

  function connectionConfigKey(config: ShowVideoConfig | undefined): string {
    if (!config) return 'none';
    return [
      config.enabled ? '1' : '0',
      config.inputKind ?? 'none',
      config.deviceId ?? '',
      config.senderName ?? '',
    ].join('|');
  }

  let lastConnectionKey = '';

  async function refreshDevices() {
    if (!canUseWebcam.value) {
      devices.value = [];
      return;
    }
    const all = await navigator.mediaDevices.enumerateDevices();
    devices.value = all.filter((device) => device.kind === 'videoinput');
  }

  async function refreshSenders() {
    if (!window.electronVideo) {
      senders.value = [];
      return;
    }
    try {
      senders.value = await window.electronVideo.listSenders();
    } catch {
      senders.value = [];
    }
  }

  function stopMediaStream() {
    mediaStream.value?.getTracks().forEach((track) => track.stop());
    mediaStream.value = null;
    if (videoElement.value) {
      videoElement.value.srcObject = null;
    }
  }

  async function disconnectNative() {
    try {
      await window.electronVideo?.disconnect();
    } catch {
      // IPC may be unavailable during early startup or teardown.
    }
    window.electronVideo?.removeFrameListener();
  }

  async function stop() {
    running.value = false;
    stopPreviewLoop();
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    stopMediaStream();
    await disconnectNative();
    detachVideoFromDom();
    latestPixelsByMap.value = new Map();
    status.value = { ...DEFAULT_STATUS };
    lastConnectionKey = '';
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value);
      previewUrl.value = null;
    }
    if (samplerWorker) {
      samplerWorker.terminate();
      samplerWorker = null;
    }
  }

  function markPreviewFrame(sourceWidth: number, sourceHeight: number) {
    previewFrameCounter += 1;
    const now = performance.now();
    if (now - lastFpsAt >= 1000) {
      status.value = {
        ...status.value,
        fps: frameCounter > 0 ? frameCounter : previewFrameCounter,
        sourceWidth,
        sourceHeight,
        connected: true,
      };
      frameCounter = 0;
      previewFrameCounter = 0;
      lastFpsAt = now;
    } else if (sourceWidth > 0 && sourceHeight > 0) {
      status.value = {
        ...status.value,
        sourceWidth,
        sourceHeight,
        connected: true,
      };
    }
  }

  function previewTick() {
    if (!running.value) return;

    const video = videoElement.value;
    if (video && video.readyState >= 2 && video.videoWidth > 0) {
      markPreviewFrame(video.videoWidth, video.videoHeight);
    }

    previewRafId = requestAnimationFrame(previewTick);
  }

  function startPreviewLoop() {
    stopPreviewLoop();
    previewRafId = requestAnimationFrame(previewTick);
  }

  function publishSampledPixels(
    samples: Map<string, PixelColor[][]>,
    source?: { width: number; height: number }
  ) {
    latestPixelsByMap.value = samples;
    frameCounter += 1;
    const now = performance.now();
    if (now - lastFpsAt >= 1000) {
      status.value = {
        ...status.value,
        fps: frameCounter,
        sourceWidth: source?.width ?? status.value.sourceWidth,
        sourceHeight: source?.height ?? status.value.sourceHeight,
        connected: true,
      };
      frameCounter = 0;
      lastFpsAt = now;
    }
    useOutputEngineStore().requestMerge();
  }

  function initWorker() {
    if (samplerWorker) return;

    const worker = new VideoSamplerWorker();
    worker.onmessage = (e) => {
      if (e.data.type === 'sampled') {
        const { samples, source } = e.data;
        const samplesMap = new Map<string, PixelColor[][]>();
        for (const [id, item] of Object.entries(samples) as [string, { width: number; height: number; buffer: ArrayBuffer }][]) {
          const grid = sampleRgbGridBuffer(
            new Uint8Array(item.buffer),
            item.width,
            item.height
          );
          samplesMap.set(id, grid);
        }
        publishSampledPixels(samplesMap, source);
      } else if (e.data.type === 'error') {
        console.error('Video Sampler Worker Error:', e.data.error);
      }
    };
    worker.postMessage({ type: 'init' });
    samplerWorker = worker;
  }

  function sampleAllMapsFromVideoElement() {
    const startedAt = performance.now();
    const maps = activePixelMaps.value;
    if (maps.length === 0) return;

    const video = videoElement.value;
    const canvas = sampleCanvas.value;
    if (!video || !canvas || video.readyState < 2) return;

    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    if (sourceWidth <= 0 || sourceHeight <= 0) return;

    canvas.width = sourceWidth;
    canvas.height = sourceHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, sourceWidth, sourceHeight);
    const imageData = ctx.getImageData(0, 0, sourceWidth, sourceHeight);
    const frameData = imageData.data.buffer;

    initWorker();
    samplerWorker!.postMessage({
      type: 'sample',
      frameWidth: sourceWidth,
      frameHeight: sourceHeight,
      frameData,
      maps: maps.map(m => ({
        id: m.id,
        width: m.width,
        height: m.height,
        region: m.sampleRegion ?? { x: 0, y: 0, width: 1, height: 1 },
        flipY: false
      }))
    }, [frameData]);
    recordRuntimeMetric('video.sample.webcam.frameDispatch', performance.now() - startedAt);
  }

  function sampleAllMapsFromNativeFrame(payload: { width: number; height: number; data: ArrayBuffer }) {
    const startedAt = performance.now();
    const maps = activePixelMaps.value;
    if (maps.length === 0) return;

    initWorker();
    samplerWorker!.postMessage({
      type: 'sample',
      frameWidth: payload.width,
      frameHeight: payload.height,
      frameData: payload.data,
      maps: maps.map(m => ({
        id: m.id,
        width: m.width,
        height: m.height,
        region: m.sampleRegion ?? { x: 0, y: 0, width: 1, height: 1 },
        flipY: false
      }))
    }, [payload.data]);
    recordRuntimeMetric('video.sample.native.frameDispatch', performance.now() - startedAt);
  }

  async function startWebcam(config: ShowVideoConfig) {
    ensureCanvases();
    stopMediaStream();

    const constraints: MediaStreamConstraints = {
      video: config.deviceId ? { deviceId: { exact: config.deviceId } } : true,
      audio: false,
    };

    mediaStream.value = await navigator.mediaDevices.getUserMedia(constraints);
    if (videoElement.value) {
      attachVideoToDom();
      videoElement.value.srcObject = mediaStream.value;
      await videoElement.value.play();
    }
    status.value = { ...DEFAULT_STATUS, connected: true };
    lastFpsAt = performance.now();
  }

  async function startNative(config: ShowVideoConfig, kind: 'syphon' | 'spout') {
    if (!window.electronVideo || !config.senderName) return;

    await disconnectNative();
    const connected = await window.electronVideo.connect({
      kind,
      senderName: config.senderName,
      fps: normalizeVideoFps(config.fps),
    });

    if (!connected) {
      status.value = { ...DEFAULT_STATUS, connected: false };
      return;
    }

    window.electronVideo.onFrame((payload) => {
      sampleAllMapsFromNativeFrame(payload);
    });

    status.value = { ...DEFAULT_STATUS, connected: true };
  }

  function tick(now: number) {
    if (!running.value) return;

    const show = useShowStore().document;
    const config = show.video;
    const maps = activePixelMaps.value;

    const interval = frameIntervalMs(normalizeVideoFps(config?.fps));
    const canSample =
      config?.enabled === true &&
      maps.length > 0 &&
      config.inputKind === 'webcam' &&
      now - lastSampleAt >= interval;

    if (canSample) {
      lastSampleAt = now;
      try {
        sampleAllMapsFromVideoElement();
      } catch {
        status.value = {
          ...status.value,
          droppedFrames: status.value.droppedFrames + 1,
        };
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  async function applyConfig(config: ShowVideoConfig | undefined) {
    const nextKey = connectionConfigKey(config);
    const connectionChanged = nextKey !== lastConnectionKey;

    if (!config?.enabled || config.inputKind === 'none' || !config.inputKind) {
      await stop();
      return;
    }

    if (!connectionChanged && running.value) {
      return;
    }

    await stop();
    lastConnectionKey = nextKey;

    const kind: VideoInputKind = config.inputKind;
    if (kind === 'webcam') {
      await startWebcam(config);
    } else if (kind === 'syphon' || kind === 'spout') {
      await startNative(config, kind);
    } else {
      return;
    }

    running.value = true;
    lastSampleAt = 0;
    startPreviewLoop();
    rafId = requestAnimationFrame(tick);
  }

  function init() {
    ensureCanvases();
    void refreshDevices();

    const showStore = useShowStore();
    watch(
      () => ({ ...showStore.document.video }),
      (config) => {
        void applyConfig(config);
      },
      { deep: true, immediate: true }
    );

    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', () => {
        void refreshDevices();
      });
    }
  }

  function updateShowVideo(updater: (config: ShowVideoConfig) => ShowVideoConfig) {
    const showStore = useShowStore();
    showStore.updateDocument((doc) => {
      doc.video = updater({ ...(doc.video ?? {}), ...showStore.document.video });
    });
  }

  function updatePixelMapRegion(mapId: string, region: PixelMapDefinition['sampleRegion']) {
    const showStore = useShowStore();
    showStore.updateDocument((doc) => {
      doc.pixelMaps = (doc.pixelMaps ?? []).map((map) =>
        map.id === mapId ? { ...map, sampleRegion: region } : map
      );
    });
  }

  return {
    running,
    devices,
    senders,
    status,
    latestPixelsByMap,
    previewUrl,
    isElectron,
    canUseWebcam,
    activePixelMaps,
    init,
    stop,
    refreshDevices,
    refreshSenders,
    applyConfig,
    updateShowVideo,
    updatePixelMapRegion,
    getPreviewCanvas: () => previewCanvas.value,
    getVideoElement: () => videoElement.value,
  };
});
