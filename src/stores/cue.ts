/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import type { RecordedFrame, Cue, CueLayer, CuePlaybackState, ActiveChannel } from "src/types";
import { ref, computed, watch } from "vue";
import { defineStore } from "pinia";
import { useDMXStore } from "./dmx";
import { cloneDeep, merge } from "lodash-es";
import { useLocalStorage } from "@vueuse/core";

// Easing functions
const easingFunctions = {
  linear: (t: number) => t,
  ease: (t: number) => t * t * (3.0 - 2.0 * t),
  'ease-in': (t: number) => t * t,
  'ease-out': (t: number) => t * (2.0 - t),
  'ease-in-out': (t: number) => t < 0.5 ? 2.0 * t * t : -1.0 + (4.0 - 2.0 * t) * t,
  bounce: (t: number) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
  elastic: (t: number) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const p = 0.3;
    const s = p / 4;
    return -(Math.pow(2, 10 * (t -= 1)) * Math.sin((t - s) * (2 * Math.PI) / p));
  }
};

export const useCueStore = defineStore("cue-store", () => {
  const dmx = useDMXStore();

  // Core state
  const cues = useLocalStorage<Cue[]>("cues", []);
  const activeCueId = ref<string | null>(null);
  const activeLayerId = ref<string | null>(null);
  const activeFrameIndex = ref<number | null>(null);
  const playbackStates = ref<Map<string, CuePlaybackState>>(new Map());

  // Timeline state
  const timelinePosition = ref(0); // Current position in milliseconds
  const timelineZoom = ref(1); // Zoom level for timeline
  const timelineSnapping = ref(true);
  const snapInterval = ref(250); // Snap to 250ms intervals  // Editing state
  const selectedFrames = ref<Set<string>>(new Set());
  const clipboard = ref<RecordedFrame[]>([]);
  const isRecording = ref(false);

  // Playback state
  const masterVolume = ref(1.0);
  const isGlobalPlaying = ref(false);

  // Computed properties
  const activeCue = computed(() => {
    if (!activeCueId.value) return null;
    return cues.value.find(cue => cue.id === activeCueId.value) || null;
  });

  const activeLayer = computed(() => {
    if (!activeCue.value || !activeLayerId.value) return null;
    return activeCue.value.layers.find(layer => layer.id === activeLayerId.value) || null;
  });

  const totalDuration = computed(() => {
    if (!activeCue.value) return 0;
    return Math.max(...activeCue.value.layers.map(layer =>
      layer.frames.reduce((acc, frame) => acc + (frame.duration || 1000), 0)
    ));
  });

  // Core functions
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const createNewCue = (name: string): Cue => {
    const id = generateId();
    const now = new Date();
    return {
      id,
      name,
      description: '',
      layers: [createNewLayer(`${name} - Main`)],
      totalDuration: 0,
      isLooping: false,
      fadeInDuration: 0,
      fadeOutDuration: 0,
      priority: 1,
      tags: [],
      created: now,
      modified: now
    };
  };

  const createNewLayer = (name: string): CueLayer => ({
    id: generateId(),
    name,
    frames: [],
    enabled: true,
    opacity: 1.0,
    blendMode: 'replace',
    solo: false
  });

  const addCue = (name: string) => {
    const cue = createNewCue(name);
    cues.value.push(cue);
    activeCueId.value = cue.id;
    activeLayerId.value = cue.layers[0]?.id || null;
    return cue;
  };

  const duplicateCue = (cueId: string) => {
    const originalCue = cues.value.find(c => c.id === cueId);
    if (!originalCue) return;

    const duplicated = cloneDeep(originalCue);
    duplicated.id = generateId();
    duplicated.name = `${originalCue.name} Copy`;
    duplicated.created = new Date();
    duplicated.modified = new Date();

    // Generate new IDs for layers
    duplicated.layers = duplicated.layers.map(layer => ({
      ...layer,
      id: generateId()
    }));

    cues.value.push(duplicated);
    return duplicated;
  };

  const deleteCue = (cueId: string) => {
    const index = cues.value.findIndex(c => c.id === cueId);
    if (index === -1) return;

    cues.value.splice(index, 1);

    if (activeCueId.value === cueId) {
      activeCueId.value = cues.value.length > 0 ? cues.value[0]?.id || null : null;
      activeLayerId.value = activeCueId.value ? cues.value[0]?.layers[0]?.id || null : null;
    }
  };

  const addLayer = (cueId: string, name: string) => {
    const cue = cues.value.find(c => c.id === cueId);
    if (!cue) return;

    const layer = createNewLayer(name);
    cue.layers.push(layer);
    cue.modified = new Date();
    return layer;
  };

  const deleteLayer = (cueId: string, layerId: string) => {
    const cue = cues.value.find(c => c.id === cueId);
    if (!cue) return;

    const index = cue.layers.findIndex(l => l.id === layerId);
    if (index === -1) return;

    cue.layers.splice(index, 1);
    cue.modified = new Date();

    if (activeLayerId.value === layerId) {
      activeLayerId.value = cue.layers.length > 0 ? cue.layers[0]?.id || null : null;
    }
  };

  const recordFrame = (at?: number) => {
    if (!activeLayer.value) return;

    const channels = cloneDeep(dmx.channels);
    const position = at ?? timelinePosition.value;

    const frame: RecordedFrame = {
      name: `Frame ${activeLayer.value.frames.length + 1}`,
      type: 'channels',
      channels,
      duration: 1000, // Default 1 second
      easing: 'linear'
    };

    // Insert frame at the correct position based on timeline
    const insertIndex = activeLayer.value.frames.findIndex((f, i) => {
      const frameStart = activeLayer.value!.frames.slice(0, i).reduce((acc, fr) => acc + (fr.duration || 1000), 0);
      return frameStart > position;
    });

    if (insertIndex === -1) {
      activeLayer.value.frames.push(frame);
      activeFrameIndex.value = activeLayer.value.frames.length - 1;
    } else {
      activeLayer.value.frames.splice(insertIndex, 0, frame);
      activeFrameIndex.value = insertIndex;
    }

    updateCueModified();
    updateCueTotalDuration();
  };

  const updateCueTotalDuration = () => {
    if (activeCue.value) {
      activeCue.value.totalDuration = Math.max(...activeCue.value.layers.map(layer =>
        layer.frames.reduce((acc, frame) => acc + (frame.duration || 1000), 0)
      ), 0);
    }
  };

  const updateCueModified = () => {
    if (activeCue.value) {
      activeCue.value.modified = new Date();
    }
  };

  const deleteFrame = (layerId: string, frameIndex: number) => {
    const layer = activeCue.value?.layers.find(l => l.id === layerId);
    if (!layer || frameIndex < 0 || frameIndex >= layer.frames.length) return;

    layer.frames.splice(frameIndex, 1);

    if (activeFrameIndex.value === frameIndex) {
      activeFrameIndex.value = null;
    } else if (activeFrameIndex.value !== null && activeFrameIndex.value > frameIndex) {
      activeFrameIndex.value--;
    }

    updateCueModified();
    updateCueTotalDuration();
  };

  const moveFrame = (layerId: string, fromIndex: number, toIndex: number) => {
    const layer = activeCue.value?.layers.find(l => l.id === layerId);
    if (!layer) return;

    const frame = layer.frames.splice(fromIndex, 1)[0];
    if (frame) {
      layer.frames.splice(toIndex, 0, frame);
      updateCueModified();
    }
  };

  const copyFrames = (layerId: string, frameIndices: number[]) => {
    const layer = activeCue.value?.layers.find(l => l.id === layerId);
    if (!layer) return;

    clipboard.value = frameIndices
      .map(index => layer.frames[index])
      .filter((frame): frame is RecordedFrame => frame !== undefined)
      .map(frame => cloneDeep(frame));
  };

  const pasteFrames = (layerId: string, atIndex: number) => {
    const layer = activeCue.value?.layers.find(l => l.id === layerId);
    if (!layer || clipboard.value.length === 0) return;

    const framesToPaste = cloneDeep(clipboard.value);
    layer.frames.splice(atIndex, 0, ...framesToPaste);
    updateCueModified();
  };

  // Interpolation between frames
  const interpolateChannels = (fromChannels: ActiveChannel[], toChannels: ActiveChannel[], progress: number, easing: string = 'linear'): ActiveChannel[] => {
    const easingFn = easingFunctions[easing as keyof typeof easingFunctions] || easingFunctions.linear;
    const t = easingFn(progress);

    const result: ActiveChannel[] = [];

    // Create a map for faster lookup
    const toChannelsMap = new Map(toChannels.map(ch => [ch.id, ch]));

    fromChannels.forEach(fromChannel => {
      const toChannel = toChannelsMap.get(fromChannel.id);
      if (toChannel) {
        result.push({
          ...fromChannel,
          value: Math.round(fromChannel.value + (toChannel.value - fromChannel.value) * t)
        });
      } else {
        result.push({ ...fromChannel });
      }
    });

    // Add any channels that exist in toChannels but not in fromChannels
    toChannels.forEach(toChannel => {
      if (!fromChannels.find(ch => ch.id === toChannel.id)) {
        result.push({
          ...toChannel,
          value: Math.round(toChannel.value * t)
        });
      }
    });

    return result;
  };

  // Layer blending
  const blendLayers = (layers: { channels: ActiveChannel[], opacity: number, blendMode: string }[]): ActiveChannel[] => {
    if (layers.length === 0) return [];
    if (layers.length === 1) return layers[0]?.channels || [];

    let result = cloneDeep(layers[0]?.channels || []);

    for (let i = 1; i < layers.length; i++) {
      const layer = layers[i];
      if (!layer) continue;

      const channelsMap = new Map(result.map(ch => [ch.id, ch]));

      layer.channels.forEach(layerChannel => {
        const resultChannel = channelsMap.get(layerChannel.id);
        if (resultChannel) {
          const layerValue = layerChannel.value * layer.opacity;

          switch (layer.blendMode) {
            case 'add':
              resultChannel.value = Math.min(255, resultChannel.value + layerValue);
              break;
            case 'multiply':
              resultChannel.value = Math.round((resultChannel.value * layerValue) / 255);
              break;
            case 'screen':
              resultChannel.value = Math.round(255 - ((255 - resultChannel.value) * (255 - layerValue)) / 255);
              break;
            case 'replace':
            default:
              resultChannel.value = Math.round(resultChannel.value * (1 - layer.opacity) + layerValue);
              break;
          }

          resultChannel.value = Math.max(0, Math.min(255, resultChannel.value));
        } else {
          result.push({
            ...layerChannel,
            value: Math.round(layerChannel.value * layer.opacity)
          });
        }
      });
    }

    return result;
  };

  // Playback engine
  const evaluateCueAtTime = (cue: Cue, timeMs: number): ActiveChannel[] => {
    const enabledLayers = cue.layers.filter(layer => layer.enabled && !layer.solo);
    const soloLayers = cue.layers.filter(layer => layer.solo);
    const layersToProcess = soloLayers.length > 0 ? soloLayers : enabledLayers;

    // If no layers have frames, return current DMX state
    const hasAnyFrames = layersToProcess.some(layer => layer.frames.length > 0);
    if (!hasAnyFrames) {
      return dmx.channels.map(ch => ({ ...ch }));
    }

    const layerOutputs = layersToProcess.map(layer => {
      let currentTime = 0;

      for (let i = 0; i < layer.frames.length; i++) {
        const frame = layer.frames[i];
        if (!frame) continue;

        const frameDuration = frame.duration || 1000;

        if (timeMs >= currentTime && timeMs < currentTime + frameDuration) {
          // We're in this frame
          if (i === layer.frames.length - 1) {
            // Last frame, just return its channels
            return {
              channels: frame.channels,
              opacity: layer.opacity,
              blendMode: layer.blendMode
            };
          } else {
            // Interpolate to next frame
            const nextFrame = layer.frames[i + 1];
            if (!nextFrame) {
              return {
                channels: frame.channels,
                opacity: layer.opacity,
                blendMode: layer.blendMode
              };
            }

            const progress = (timeMs - currentTime) / frameDuration;
            const interpolatedChannels = interpolateChannels(
              frame.channels,
              nextFrame.channels,
              progress,
              frame.easing || 'linear'
            );

            return {
              channels: interpolatedChannels,
              opacity: layer.opacity,
              blendMode: layer.blendMode
            };
          }
        }

        currentTime += frameDuration;
      }

      // If we're past all frames, return the last frame
      if (layer.frames.length > 0) {
        const lastFrame = layer.frames[layer.frames.length - 1];
        return {
          channels: lastFrame?.channels || [],
          opacity: layer.opacity,
          blendMode: layer.blendMode
        };
      }

      return {
        channels: [],
        opacity: layer.opacity,
        blendMode: layer.blendMode
      };
    });

    return blendLayers(layerOutputs);
  };

  // Playback control
  let playbackAnimationId: number | null = null;

  const playCue = (cueId: string) => {
    const cue = cues.value.find(c => c.id === cueId);
    if (!cue) return;

    const state: CuePlaybackState = {
      cueId,
      startTime: performance.now(),
      currentTime: 0,
      isPlaying: true,
      isPaused: false,
      playbackRate: 1.0,
      fadeProgress: 0
    };

    playbackStates.value.set(cueId, state);
    isGlobalPlaying.value = true;

    if (!playbackAnimationId) {
      startPlaybackEngine();
    }
  };

  const pauseCue = (cueId: string) => {
    const state = playbackStates.value.get(cueId);
    if (state) {
      state.isPaused = !state.isPaused;
      if (!state.isPaused) {
        state.startTime = performance.now() - state.currentTime;
      }
    }
  };

  const stopCue = (cueId: string) => {
    playbackStates.value.delete(cueId);

    if (playbackStates.value.size === 0) {
      isGlobalPlaying.value = false;
      if (playbackAnimationId) {
        cancelAnimationFrame(playbackAnimationId);
        playbackAnimationId = null;
      }
    }
  };

  const stopAllCues = () => {
    playbackStates.value.clear();
    isGlobalPlaying.value = false;
    if (playbackAnimationId) {
      cancelAnimationFrame(playbackAnimationId);
      playbackAnimationId = null;
    }
  };

  const startPlaybackEngine = () => {
    const animate = (timestamp: number) => {
      const allChannelsMap = new Map<number, ActiveChannel>();

      // Process all playing cues
      for (const [cueId, state] of playbackStates.value.entries()) {
        if (state.isPaused) continue;

        const cue = cues.value.find(c => c.id === cueId);
        if (!cue) {
          playbackStates.value.delete(cueId);
          continue;
        }

        state.currentTime = (timestamp - state.startTime) * state.playbackRate;

        // Update timeline position for active cue
        if (cueId === activeCueId.value) {
          timelinePosition.value = state.currentTime;
        }

        // Handle looping
        const cueTotalDuration = cue.totalDuration || Math.max(...cue.layers.map(layer =>
          layer.frames.reduce((acc, frame) => acc + (frame.duration || 1000), 0)
        ), 1000); // Minimum 1 second

        if (cue.isLooping && state.currentTime > cueTotalDuration) {
          state.currentTime = state.currentTime % cueTotalDuration;
          state.startTime = timestamp - state.currentTime / state.playbackRate;
        } else if (!cue.isLooping && state.currentTime > cueTotalDuration) {
          playbackStates.value.delete(cueId);
          continue;
        }

        const channels = evaluateCueAtTime(cue, state.currentTime);

        // Merge channels with priority
        channels.forEach(channel => {
          const existing = allChannelsMap.get(channel.id);
          if (!existing || cue.priority >= (existing as any).priority) {
            allChannelsMap.set(channel.id, { ...channel, priority: cue.priority } as any);
          }
        });
      }

      // Apply to DMX
      const finalChannels = Array.from(allChannelsMap.values());

      if (finalChannels.length > 0) {
        // Update existing DMX channels instead of replacing the array
        finalChannels.forEach(cueChannel => {
          const dmxChannel = dmx.channels.find(ch => ch.path === cueChannel.path);
          if (dmxChannel) {
            dmxChannel.value = Math.round(cueChannel.value * masterVolume.value);
          }
        });
      }

      if (playbackStates.value.size > 0) {
        playbackAnimationId = requestAnimationFrame(animate);
      } else {
        playbackAnimationId = null;
        isGlobalPlaying.value = false;
      }
    };

    playbackAnimationId = requestAnimationFrame(animate);
  };

  // Timeline functions
  const setTimelinePosition = (timeMs: number) => {
    timelinePosition.value = timeMs;

    // If actively playing, update the playback state to sync scrubbing
    if (activeCue.value && isGlobalPlaying.value) {
      const state = playbackStates.value.get(activeCue.value.id);
      if (state && !state.isPaused) {
        // Update the start time to maintain the new position
        state.startTime = performance.now() - timeMs / state.playbackRate;
        state.currentTime = timeMs;
      }
    }

    if (activeCue.value && !isGlobalPlaying.value) {
      const channels = evaluateCueAtTime(activeCue.value, timeMs);
      // Update existing DMX channels instead of replacing the array
      channels.forEach(cueChannel => {
        const dmxChannel = dmx.channels.find(ch => ch.path === cueChannel.path);
        if (dmxChannel) {
          dmxChannel.value = Math.round(cueChannel.value * masterVolume.value);
        }
      });
    }
  };

  const snapToGrid = (timeMs: number): number => {
    if (!timelineSnapping.value) return timeMs;
    return Math.round(timeMs / snapInterval.value) * snapInterval.value;
  };

  // Initialize with example cue if no cues exist
  const initializeDefaultCues = () => {
    if (cues.value.length === 0) {
      const exampleCue = createNewCue("Example Cue");

      // Add a second layer for demonstration
      const layer2 = createNewLayer("Layer 2");
      exampleCue.layers.push(layer2);

      // Set it as looping for demo
      exampleCue.isLooping = true;

      cues.value.push(exampleCue);
      activeCueId.value = exampleCue.id;
      activeLayerId.value = exampleCue.layers[0]?.id || null;
    }
  };

  // Call initialization
  initializeDefaultCues();

  return {
    // State
    cues,
    activeCueId,
    activeLayerId,
    activeFrameIndex,
    timelinePosition,
    timelineZoom,
    timelineSnapping,
    snapInterval,
    selectedFrames,
    clipboard,
    isRecording,
    masterVolume,
    isGlobalPlaying,
    playbackStates,

    // Computed
    activeCue,
    activeLayer,
    totalDuration,

    // Cue management
    addCue,
    duplicateCue,
    deleteCue,

    // Layer management
    addLayer,
    deleteLayer,

    // Frame management
    recordFrame,
    deleteFrame,
    moveFrame,
    copyFrames,
    pasteFrames,

    // Playback
    playCue,
    pauseCue,
    stopCue,
    stopAllCues,
    evaluateCueAtTime,

    // Timeline
    setTimelinePosition,
    snapToGrid,

    // Utilities
    generateId,
    updateCueModified,
    updateCueTotalDuration
  };
});
