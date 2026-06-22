/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ref, watch } from 'vue';
import { defineStore } from 'pinia';
import type { ActiveChannel, Cue, CuePlaybackState } from '@softdmx/engine';
import type { LayerContribution } from '@softdmx/engine';
import { mergeLayers, scalesWithIntensityMaster } from '@softdmx/engine';
import { scratchToLayer } from '@softdmx/engine';
import { evaluateTimelineCueAtTime, getCueTotalDuration } from '@softdmx/engine';
import { getActiveTimelineCuesAtTimecode } from '@softdmx/engine';
import { evaluateStackCueAtTime, initStackPlayback, advanceStackStep } from '@softdmx/engine';
import { evaluateAllEffects } from '@softdmx/engine';
import {
  createAudioMappingEvalState,
  evaluateAudioMappings,
} from '@softdmx/engine';
import {
  createVideoMappingEvalState,
  evaluateVideoMapping,
} from '@softdmx/engine';
import { presetToChannels } from '@softdmx/engine';
import { useShowStore } from './show';
import { useScratchStore } from './scratch';
import { useDMXStore } from './dmx';
import { useLinkStore } from './link';
import { useAudioStore } from './audio';
import { useVideoStore } from './video';
import { clampDmx } from '@softdmx/engine';
import {
  clampUnit,
  computeCuePlaybackIntensity,
  resolveCueSubmasterScale,
} from '@softdmx/engine';
import type { ShowDocument } from '@softdmx/engine';
import { resolveVideoPixelMapIds } from '@softdmx/engine';
import { resolvePresetIdFromPoolSlot } from '@softdmx/engine';

interface CuePlayOptions {
  intensity?: number;
  fadeInMs?: number;
}

export const useOutputPlaybackStore = defineStore('output-playback', () => {
  const grandMaster = ref(1.0);
  const playbackBusMaster = ref(1.0);
  const cueLevelById = ref<Map<string, number>>(new Map());
  const blackout = ref(false);
  const playbackStates = ref<Map<string, CuePlaybackState>>(new Map());
  const isGlobalPlaying = ref(false);
  const presetFadeStates = ref<Map<string, { startTime: number; duration: number; from: Map<string, number>; to: Map<string, number> }>>(new Map());
  const previousCueOutputById = ref<Map<string, Map<string, number>>>(new Map());
  const timecodePositionSeconds = ref(0);
  const timelinePreviewPositionSeconds = ref<number | null>(null);
  const audioStore = useAudioStore();
  const audioMappingState = createAudioMappingEvalState();
  const videoMappingState = createVideoMappingEvalState();

  let animationId: number | null = null;
  let linkPhase = 0;
  let previousTimecodePositionSeconds = 0;

  function maybeAdvanceStackCue(cueId: string, state: CuePlaybackState, cue: Cue) {
    const stack = cue.stack ?? [];
    const step = stack[state.stackStepIndex ?? 0];
    if (!step || state.isPaused) return;

    const stepStart = state.stackStepStartTime ?? state.startTime;
    const elapsed = performance.now() - stepStart;
    const rawFollow = (step as { follow?: string }).follow ?? 'manual';
    const followMode = rawFollow === 'go' ? 'auto' : rawFollow;
    const delayMs =
      followMode === 'timed'
        ? Math.max(0, step.followTime ?? step.fadeIn ?? 0)
        : followMode === 'auto'
          ? Math.max(0, step.fadeIn ?? 0)
          : null;

    if (delayMs !== null && elapsed >= delayMs) {
      const advanced = advanceStackStep(state, cue);
      if (!advanced) {
        playbackStates.value.delete(cueId);
      }
    }
  }

  function cueToLayer(channels: ActiveChannel[], priority: number): LayerContribution {
    const map = new Map<string, LayerContribution['channels'] extends Map<string, infer V> ? V : never>();
    for (const ch of channels) {
      map.set(ch.path, {
        path: ch.path,
        value: ch.value,
        attributeType: ch.attributeType ?? 'generic',
        priority,
        source: 'cue',
      });
    }
    return { source: 'cue', priority, channels: map };
  }

  function getCueSubmasterScale(cueId: string): number {
    return resolveCueSubmasterScale(showStore().document, cueId);
  }

  function getCueLevel(cueId: string): number {
    return clampUnit(cueLevelById.value.get(cueId) ?? 1);
  }

  function getPlaybackBusScale(): number {
    return clampUnit(playbackBusMaster.value);
  }

  function resolveCueOutputIntensity(stateIntensity: number, cueId: string): number {
    return computeCuePlaybackIntensity(
      stateIntensity,
      getPlaybackBusScale(),
      getCueSubmasterScale(cueId)
    );
  }

  function syncPlaybackFromShow(show: ShowDocument) {
    playbackBusMaster.value = clampUnit(show.playback?.busMaster ?? 1);
    const nextLevels = new Map<string, number>();
    for (const [cueId, level] of Object.entries(show.playback?.cueLevels ?? {})) {
      nextLevels.set(cueId, clampUnit(level));
    }
    cueLevelById.value = nextLevels;
  }

  function persistPlaybackToShow(cueLevelPatch?: { cueId: string; level: number }) {
    showStore().updateDocument((doc) => {
      const cueLevels = { ...(doc.playback?.cueLevels ?? {}) };
      for (const [cueId, level] of cueLevelById.value.entries()) {
        cueLevels[cueId] = level;
      }
      if (cueLevelPatch) {
        cueLevels[cueLevelPatch.cueId] = cueLevelPatch.level;
      }
      doc.playback = {
        busMaster: playbackBusMaster.value,
        cueLevels,
      };
    });
  }

  function getCueEffectiveIntensity(state: CuePlaybackState, now: number): number {
    let intensity = Math.max(0, Math.min(1, state.intensity ?? state.targetIntensity ?? 1));
    const targetIntensity = Math.max(0, Math.min(1, state.targetIntensity ?? intensity));

    if (state.fadeInMs && state.fadeInMs > 0 && state.fadeInStartTime !== undefined) {
      const fadeProgress = Math.min(1, (now - state.fadeInStartTime) / state.fadeInMs);
      intensity = targetIntensity * fadeProgress;
    }

    if (
      state.releaseMs &&
      state.releaseMs > 0 &&
      state.releaseStartTime !== undefined &&
      state.releaseFromIntensity !== undefined
    ) {
      const releaseProgress = Math.min(1, (now - state.releaseStartTime) / state.releaseMs);
      intensity = state.releaseFromIntensity * (1 - releaseProgress);
    }

    return Math.max(0, Math.min(1, intensity));
  }

  function applyCueIntensityAndFlags(
    cue: Cue,
    cueChannels: ActiveChannel[],
    baseChannels: ActiveChannel[],
    intensity: number
  ): ActiveChannel[] {
    const baseMap = new Map(baseChannels.map((ch) => [ch.path, ch.value]));
    const scaled = cueChannels.map((ch) => {
      const attr = ch.attributeType ?? 'generic';
      const shouldScale = scalesWithIntensityMaster(attr);
      return {
        ...ch,
        value: shouldScale ? clampDmx(ch.value * intensity) : ch.value,
      };
    });

    if (cue.block === true) {
      return scaled;
    }

    if (cue.tracking === true) {
      return scaled.filter((ch) => {
        const baseValue = baseMap.get(ch.path);
        return baseValue === undefined || baseValue !== ch.value;
      });
    }

    return scaled;
  }

  function applyGroupSubmasters(channels: ActiveChannel[], show: ShowDocument) {
    const groupSubmasters = (show.submasters ?? []).filter(
      (submaster) =>
        (submaster.mode ?? 'cue-intensity') === 'group-intensity' &&
        (submaster.targets ?? []).length > 0
    );
    if (groupSubmasters.length === 0) {
      return channels;
    }

    const fixtureScales = new Map<string, number>();
    for (const submaster of groupSubmasters) {
      const value = Math.max(0, Math.min(1, submaster.value ?? 1));
      for (const groupName of submaster.targets ?? []) {
        const group = show.groups.find((candidate) => candidate.name === groupName);
        if (!group) continue;
        for (const fixture of group.fixtures) {
          fixtureScales.set(fixture, (fixtureScales.get(fixture) ?? 1) * value);
        }
      }
    }

    return channels.map((ch) => {
      const attr = ch.attributeType ?? 'generic';
      if (!scalesWithIntensityMaster(attr)) return ch;

      const fixtureName = ch.path.split('/')[2];
      if (!fixtureName) return ch;
      const scale = fixtureScales.get(fixtureName);
      if (scale === undefined) return ch;
      return {
        ...ch,
        value: clampDmx(ch.value * scale),
      };
    });
  }

  function effectToLayer(values: Map<string, number>, baseChannels: ActiveChannel[]): LayerContribution {
    const map = new Map<string, LayerContribution['channels'] extends Map<string, infer V> ? V : never>();
    const baseMap = new Map(baseChannels.map((ch) => [ch.path, ch]));

    for (const [path, value] of values) {
      const base = baseMap.get(path);
      map.set(path, {
        path,
        value,
        attributeType: base?.attributeType ?? 'generic',
        priority: 50,
        source: 'effect',
      });
    }

    return { source: 'effect', priority: 50, channels: map };
  }

  function audioToLayer(values: Map<string, number>, baseChannels: ActiveChannel[]): LayerContribution {
    const map = new Map<string, LayerContribution['channels'] extends Map<string, infer V> ? V : never>();
    const baseMap = new Map(baseChannels.map((ch) => [ch.path, ch]));

    for (const [path, value] of values) {
      const base = baseMap.get(path);
      map.set(path, {
        path,
        value,
        attributeType: base?.attributeType ?? 'generic',
        priority: 60,
        source: 'audio',
      });
    }

    return { source: 'audio', priority: 60, channels: map };
  }

  function videoToLayer(values: Map<string, number>, baseChannels: ActiveChannel[]): LayerContribution {
    const map = new Map<string, LayerContribution['channels'] extends Map<string, infer V> ? V : never>();
    const baseMap = new Map(baseChannels.map((ch) => [ch.path, ch]));

    for (const [path, value] of values) {
      const base = baseMap.get(path);
      map.set(path, {
        path,
        value,
        attributeType: base?.attributeType ?? 'color',
        priority: 55,
        source: 'video',
      });
    }

    return { source: 'video', priority: 55, channels: map };
  }

  function shouldApplyVideoMapping() {
    const show = showStore().document;
    return show.video?.enabled === true && resolveVideoPixelMapIds(show.video).length > 0;
  }

  function shouldApplyAudioMappings() {
    const show = showStore().document;
    return (
      show.audio?.enabled !== false &&
      audioStore.enabled &&
      (show.audioMappings ?? []).some((mapping) => mapping.enabled !== false)
    );
  }

  function shouldUseTimecodeSetPlayback(show: ShowDocument): boolean {
    return show.timecode?.enabled === true && show.timeline?.syncMode === 'timecode';
  }

  function appendTimelineCueLayers(
    show: ShowDocument,
    timecodeSeconds: number,
    baseChannels: ActiveChannel[],
    layers: LayerContribution[]
  ) {
    const activeCues = getActiveTimelineCuesAtTimecode(show.cues, timecodeSeconds);
    for (const { cue, localMs } of activeCues) {
      const intensity = resolveCueOutputIntensity(getCueLevel(cue.id), cue.id);
      let cueChannels = evaluateTimelineCueAtTime(show, cue, localMs, baseChannels);
      cueChannels = applyCueIntensityAndFlags(cue, cueChannels, baseChannels, intensity);
      layers.push(cueToLayer(cueChannels, cue.priority));
    }
  }

  function computeMergedOutput(options?: { includeBlindScratch?: boolean }) {
    const dmx = useDMXStore();
    const showStore = useShowStore();
    const scratchStore = useScratchStore();
    const linkStore = useLinkStore();
    const show = showStore.document;
    const now = performance.now();

    const baseChannels = dmx.baseChannels;
    const layers: LayerContribution[] = [];
    const useTimecodeSet = shouldUseTimecodeSetPlayback(show);
    const previewSeconds = timelinePreviewPositionSeconds.value;

    if (previewSeconds !== null) {
      appendTimelineCueLayers(show, previewSeconds, baseChannels, layers);
    } else if (useTimecodeSet) {
      appendTimelineCueLayers(show, timecodePositionSeconds.value, baseChannels, layers);
    }

    // Cue playback layers
    for (const [cueId, state] of playbackStates.value) {
      if (state.isPaused) continue;

      const cue = show.cues.find((c) => c.id === cueId);
      if (!cue) continue;

      if (
        (previewSeconds !== null || useTimecodeSet) &&
        cue.view === 'timeline' &&
        typeof cue.timecodeIn === 'number'
      ) {
        continue;
      }

      const intensity = resolveCueOutputIntensity(getCueEffectiveIntensity(state, now), cueId);
      let cueChannels: ActiveChannel[];

      if (cue.view === 'stack') {
        const previous = previousCueOutputById.value.get(cueId);
        cueChannels = evaluateStackCueAtTime(show, cue, state, baseChannels, previous);
      } else {
        const timeMs = state.currentTime;
        cueChannels = evaluateTimelineCueAtTime(show, cue, timeMs, baseChannels);
        cueChannels = applyCueIntensityAndFlags(cue, cueChannels, baseChannels, intensity);
      }

      if (cue.view === 'stack') {
        cueChannels = applyCueIntensityAndFlags(cue, cueChannels, baseChannels, intensity);
        previousCueOutputById.value.set(
          cueId,
          new Map(cueChannels.map((channel) => [channel.path, channel.value]))
        );
      }

      layers.push(cueToLayer(cueChannels, cue.priority));
    }

    // Preset fade layers
    const completedFades: string[] = [];
    for (const [fadeId, fade] of presetFadeStates.value) {
      const elapsed = performance.now() - fade.startTime;
      const progress = fade.duration <= 0 ? 1 : Math.min(1, elapsed / fade.duration);
      const fadeChannels = baseChannels.map((ch) => {
        const fromVal = fade.from.get(ch.path) ?? ch.value;
        const toVal = fade.to.get(ch.path) ?? ch.value;
        const blended = Math.round(fromVal + (toVal - fromVal) * progress);
        const attr = ch.attributeType ?? 'generic';
        const busScale = scalesWithIntensityMaster(attr) ? getPlaybackBusScale() : 1;
        return { ...ch, value: clampDmx(blended * busScale) };
      });
      layers.push(cueToLayer(fadeChannels, 80));
      if (progress >= 1) completedFades.push(fadeId);
    }
    for (const id of completedFades) presetFadeStates.value.delete(id);

    // Effect layer
    const effectValues = evaluateAllEffects(show, {
      timeMs: performance.now(),
      linkPhase,
      linkEnabled: linkStore.isEnabled,
    });
    if (effectValues.size > 0) {
      layers.push(effectToLayer(effectValues, baseChannels));
    }

    // Audio-reactive layer
    if (shouldApplyAudioMappings()) {
      const audioLeadMs = show.audio?.latencyMs ?? 0;
      const audioValues = evaluateAudioMappings(show, {
        rms: audioStore.levels.rms,
        peak: audioStore.levels.peak,
        bands: audioStore.levels.bands,
        beatPulse: audioStore.beatPulse,
      }, audioMappingState, performance.now() + audioLeadMs);
      if (audioValues.size > 0) {
        layers.push(audioToLayer(audioValues, baseChannels));
      }
    }

    // Video / pixel map layer
    if (shouldApplyVideoMapping()) {
      const videoStore = useVideoStore();
      const videoValues = evaluateVideoMapping(
        show,
        videoStore.latestPixelsByMap,
        videoMappingState,
        performance.now()
      );
      if (videoValues.size > 0) {
        layers.push(videoToLayer(videoValues, baseChannels));
      }
    }

    // Pixel map hook wired via video layer in output-engine.ts

    // Scratch layer (highest priority)
    const allowBlindScratch = options?.includeBlindScratch === true;
    if ((allowBlindScratch || !scratchStore.blindMode) && scratchStore.isActive) {
      layers.push(scratchToLayer(scratchStore.getEntries()));
    }

    const merged = mergeLayers(baseChannels, layers, {
      grandMaster: grandMaster.value,
      blackout: blackout.value,
    });
    return applyGroupSubmasters(merged, show);
  }

  function mergeAndApply() {
    const dmx = useDMXStore();
    const merged = computeMergedOutput();

    dmx.applyMergedOutput(merged);
  }

  function processTimecodeCueCrossings() {
    const show = showStore().document;
    if (show.timecode?.enabled !== true || shouldUseTimecodeSetPlayback(show)) {
      previousTimecodePositionSeconds = timecodePositionSeconds.value;
      return;
    }

    const current = Math.max(0, timecodePositionSeconds.value);
    const previous = Math.max(0, previousTimecodePositionSeconds);
    previousTimecodePositionSeconds = current;

    if (current < previous) {
      return;
    }

    for (const cue of show.cues) {
      const timecodeIn = typeof cue.timecodeIn === 'number' ? Math.max(0, cue.timecodeIn) : null;
      const timecodeOut = typeof cue.timecodeOut === 'number' ? Math.max(0, cue.timecodeOut) : null;

      if (timecodeIn !== null && previous < timecodeIn && current >= timecodeIn) {
        playCue(cue.id);
      }
      if (timecodeOut !== null && previous < timecodeOut && current >= timecodeOut) {
        stopCue(cue.id, Math.max(0, cue.fadeOutDuration ?? 0));
      }
    }
  }

  function tick(timestamp: number) {
    processTimecodeCueCrossings();

    for (const [cueId, state] of playbackStates.value) {
      if (state.isPaused) continue;

      const cue = showStore().document.cues.find((c) => c.id === cueId);
      if (!cue) {
        playbackStates.value.delete(cueId);
        continue;
      }

      state.currentTime = (timestamp - state.startTime) * state.playbackRate;
      const totalDuration = getCueTotalDuration(cue) || cue.totalDuration || 1000;

      if (cue.view === 'stack') {
        maybeAdvanceStackCue(cueId, state, cue);
      }

      if (cue.isLooping && state.currentTime > totalDuration) {
        state.currentTime = state.currentTime % totalDuration;
        state.startTime = timestamp - state.currentTime / state.playbackRate;
      } else if (!cue.isLooping && state.currentTime > totalDuration) {
        playbackStates.value.delete(cueId);
        continue;
      }

      if (
        state.releaseMs &&
        state.releaseMs > 0 &&
        state.releaseStartTime !== undefined &&
        timestamp - state.releaseStartTime >= state.releaseMs
      ) {
        playbackStates.value.delete(cueId);
      }
    }

    if (playbackStates.value.size === 0 && presetFadeStates.value.size === 0) {
      const show = showStore().document;
      const scratchStore = useScratchStore();
      if (
        show.effects.some((e) => e.enabled) ||
        (scratchStore.isActive && !scratchStore.blindMode) ||
        show.timecode?.enabled === true ||
        timelinePreviewPositionSeconds.value !== null ||
        shouldUseTimecodeSetPlayback(show)
      ) {
        mergeAndApply();
        animationId = requestAnimationFrame(tick);
      } else {
        animationId = null;
        isGlobalPlaying.value = false;
        mergeAndApply();
      }
      return;
    }

    mergeAndApply();

    if (playbackStates.value.size > 0 || presetFadeStates.value.size > 0) {
      animationId = requestAnimationFrame(tick);
    } else {
      animationId = null;
      isGlobalPlaying.value = false;
    }
  }

  function showStore() {
    return useShowStore();
  }

  watch(
    () => [audioStore.levels, audioStore.beatPulse, audioStore.enabled],
    () => {
      if (shouldApplyAudioMappings()) {
        mergeAndApply();
      }
    },
    { deep: true }
  );

  function startEngine() {
    if (!animationId) {
      isGlobalPlaying.value = true;
      animationId = requestAnimationFrame(tick);
    }
  }

  function ensureTick() {
    startEngine();
  }

  function setExternalTimecodePosition(seconds: number) {
    timecodePositionSeconds.value = Math.max(0, seconds);
    ensureTick();
  }

  function setTimelinePreviewPosition(seconds: number | null) {
    timelinePreviewPositionSeconds.value =
      seconds === null || !Number.isFinite(seconds) ? null : Math.max(0, seconds);
    ensureTick();
  }

  function playCue(cueId: string, options?: CuePlayOptions) {
    const cue = showStore().document.cues.find((c) => c.id === cueId);
    if (!cue) return;

    const targetIntensity = Math.max(
      0,
      Math.min(1, options?.intensity ?? getCueLevel(cueId))
    );
    const fadeInMs = Math.max(0, options?.fadeInMs ?? 0);
    const now = performance.now();
    const state: CuePlaybackState = {
      cueId,
      startTime: now,
      currentTime: 0,
      isPlaying: true,
      isPaused: false,
      playbackRate: 1.0,
      fadeProgress: 0,
      intensity: fadeInMs > 0 ? 0 : targetIntensity,
      targetIntensity,
      fadeInMs: fadeInMs > 0 ? fadeInMs : undefined,
      fadeInStartTime: fadeInMs > 0 ? now : undefined,
    };

    if (cue.view === 'stack') {
      initStackPlayback(state);
    }

    playbackStates.value.set(cueId, state);
    startEngine();
  }

  function pauseCue(cueId: string) {
    const state = playbackStates.value.get(cueId);
    if (state) {
      state.isPaused = !state.isPaused;
      if (!state.isPaused) {
        state.startTime = performance.now() - state.currentTime;
        startEngine();
      }
    }
  }

  function stopCue(cueId: string, releaseMs = 0) {
    const state = playbackStates.value.get(cueId);
    if (!state) return;

    const clampedRelease = Math.max(0, releaseMs);
    if (clampedRelease <= 0) {
      playbackStates.value.delete(cueId);
      mergeAndApply();
      return;
    }

    const now = performance.now();
    state.releaseStartTime = now;
    state.releaseMs = clampedRelease;
    state.releaseFromIntensity = getCueEffectiveIntensity(state, now);
    state.fadeInMs = undefined;
    state.fadeInStartTime = undefined;
    startEngine();
    mergeAndApply();
  }

  function stopAllCues() {
    playbackStates.value.clear();
    presetFadeStates.value.clear();
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    isGlobalPlaying.value = false;
    mergeAndApply();
  }

  function stackGo(cueId: string) {
    const state = playbackStates.value.get(cueId);
    const cue = showStore().document.cues.find((c) => c.id === cueId);
    if (!state || !cue || cue.view !== 'stack') {
      playCue(cueId);
      return;
    }
    advanceStackStep(state, cue);
    mergeAndApply();
  }

  function firePreset(presetId: string, fadeMs = 0) {
    const show = showStore().document;
    const preset = show.presets.find((p) => p.id === presetId);
    if (!preset) return;

    const toMap = presetToChannels(show, preset);
    const fromMap = new Map(computeMergedOutput({ includeBlindScratch: true }).map((ch) => [ch.path, ch.value]));

    if (fadeMs <= 0) {
      const scratch = useScratchStore();
      for (const [path, val] of toMap) {
        scratch.setChannel(path, val.value, val.attributeType);
      }
      mergeAndApply();
      return;
    }

    presetFadeStates.value.set(presetId, {
      startTime: performance.now(),
      duration: fadeMs,
      from: fromMap,
      to: new Map(Array.from(toMap.entries()).map(([k, v]) => [k, v.value])),
    });
    startEngine();
  }

  function firePresetPoolSlot(poolId: string, slotIndex: number, fadeMs = 0) {
    const show = showStore().document;
    const presetId = resolvePresetIdFromPoolSlot(show, poolId, slotIndex);
    if (!presetId) return;
    firePreset(presetId, fadeMs);
  }

  function setGrandMaster(value: number) {
    grandMaster.value = clampUnit(value);
    mergeAndApply();
  }

  function setPlaybackBusMaster(value: number) {
    playbackBusMaster.value = clampUnit(value);
    persistPlaybackToShow();
    mergeAndApply();
  }

  function setCueLevel(cueId: string, level: number) {
    const clamped = clampUnit(level);
    cueLevelById.value.set(cueId, clamped);
    persistPlaybackToShow({ cueId, level: clamped });
    if (playbackStates.value.has(cueId)) {
      setCueIntensity(cueId, clamped);
      return;
    }
    mergeAndApply();
  }

  function setBlackout(value: boolean) {
    blackout.value = value;
    mergeAndApply();
  }

  function setCueIntensity(cueId: string, intensity: number) {
    const state = playbackStates.value.get(cueId);
    if (state) {
      const clamped = Math.max(0, Math.min(1, intensity));
      state.intensity = clamped;
      state.targetIntensity = clamped;
      state.fadeInMs = undefined;
      state.fadeInStartTime = undefined;
      state.releaseMs = undefined;
      state.releaseStartTime = undefined;
      state.releaseFromIntensity = undefined;
      mergeAndApply();
    }
  }

  function resetPlayback() {
    stopAllCues();
    grandMaster.value = 1.0;
    blackout.value = false;
  }

  function requestMerge() {
    mergeAndApply();
    const show = showStore().document;
    if (show.effects.some((e) => e.enabled)) {
      startEngine();
    }
  }

  function updateLinkPhase(phase: number) {
    linkPhase = phase;
    if (showStore().document.effects.some((e) => e.enabled && e.sync === 'link')) {
      requestMerge();
      startEngine();
    }
  }

  return {
    grandMaster,
    playbackBusMaster,
    blackout,
    playbackStates,
    isGlobalPlaying,
    playCue,
    pauseCue,
    stopCue,
    stopAllCues,
    stackGo,
    firePreset,
    firePresetPoolSlot,
    setGrandMaster,
    setPlaybackBusMaster,
    setCueLevel,
    getCueLevel,
    syncPlaybackFromShow,
    setBlackout,
    setCueIntensity,
    resetPlayback,
    requestMerge,
    mergeAndApply,
    computeMergedOutput,
    updateLinkPhase,
    ensureTick,
    setExternalTimecodePosition,
    setTimelinePreviewPosition,
  };
});

/** @deprecated Use useOutputPlaybackStore */
export const useOutputEngineStore = useOutputPlaybackStore;
