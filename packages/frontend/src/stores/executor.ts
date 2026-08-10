/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import type { ExecutorSlot, ShowExecutor } from '@softdmx/engine';
import type { ShowDocument } from '@softdmx/engine';
import {
  assignExecutorSlotContent,
  resolveAudioMappingLabel,
  resolveExecutorSlotContentType,
  type ExecutorSlotContentType,
} from '@softdmx/engine';
import { useShowStore } from './show';
import { useOutputEngineStore } from './output-playback';

export type { ExecutorSlotContentType };

export type ExecutorRailSlot =
  | ExecutorSlot
  | {
      id: '__grand-master__';
      name: 'GM';
      page: number;
      index: number;
      mode: 'special-gm';
      level: number;
      isGrandMaster: true;
    };

interface SlotRuntimeState {
  activeCueId?: string;
  activePresetId?: string;
  activeAudioMappingId?: string;
  isFlashing?: boolean;
  flashRestoreIntensity?: number;
  flashRestoreEffectEnabled?: boolean;
  flashRestoreAudioActive?: boolean;
}

export interface ActiveAudioContribution {
  mappingId: string;
  level: number;
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function buildFallbackExecutor(): ShowExecutor {
  return {
    id: 'runtime-executor',
    name: 'Runtime',
    pages: 1,
    defaultReleaseMs: 400,
    slots: Array.from({ length: 8 }, (_, index) => ({
      id: `runtime-slot-${index + 1}`,
      name: `Slot ${index + 1}`,
      page: 1,
      index,
      mode: 'go',
    })),
  };
}

export const useExecutorStore = defineStore('executor', () => {
  const showStore = useShowStore();
  const output = useOutputEngineStore();

  const activePage = ref(1);
  const selectedSlotId = ref<string | null>(null);
  const runtimeBySlot = ref<Map<string, SlotRuntimeState>>(new Map());

  const executors = computed(() => showStore.document.executors ?? []);
  const executor = computed<ShowExecutor>(() => executors.value[0] ?? buildFallbackExecutor());
  const slots = computed(() => executor.value.slots ?? []);
  const pageCount = computed(() => Math.max(1, executor.value.pages ?? 1));
  const visibleSlots = computed(() =>
    [...slots.value]
      .filter((slot) => slot.page === activePage.value)
      .sort((a, b) => a.index - b.index)
  );
  const visibleRailSlots = computed<ExecutorRailSlot[]>(() => [
    {
      id: '__grand-master__',
      name: 'GM',
      page: activePage.value,
      index: -1,
      mode: 'special-gm',
      level: output.grandMaster,
      isGrandMaster: true,
    },
    ...visibleSlots.value,
  ]);
  const submasters = computed(() => showStore.document.submasters ?? []);

  watch(
    () => executor.value.activePage,
    (nextPage) => {
      if (typeof nextPage === 'number' && Number.isFinite(nextPage)) {
        activePage.value = Math.max(1, Math.min(pageCount.value, Math.round(nextPage)));
      }
    },
    { immediate: true }
  );

  function ensureRootExecutor(doc: ShowDocument) {
    doc.executors = doc.executors ?? [];
    if (!doc.executors[0]) {
      doc.executors[0] = buildFallbackExecutor();
    }
    return doc.executors[0];
  }

  function resolveSlot(slotId: string): ExecutorSlot | undefined {
    return slots.value.find((slot) => slot.id === slotId);
  }

  function slotContentType(slot: ExecutorSlot): ExecutorSlotContentType {
    return resolveExecutorSlotContentType(slot);
  }

  function setEffectEnabled(effectId: string, enabled: boolean) {
    showStore.updateDocument((doc) => {
      const effect = doc.effects.find((entry) => entry.id === effectId);
      if (effect) effect.enabled = enabled;
    });
    output.requestMerge();
  }

  function isEffectEnabled(effectId: string): boolean {
    return showStore.document.effects.find((entry) => entry.id === effectId)?.enabled ?? false;
  }

  function currentSlotCueId(slotId: string): string | undefined {
    const runtimeCueId = runtimeBySlot.value.get(slotId)?.activeCueId;
    if (runtimeCueId && output.playbackStates.has(runtimeCueId)) {
      return runtimeCueId;
    }
    const slotCueId = resolveSlot(slotId)?.cueId;
    if (slotCueId && output.playbackStates.has(slotCueId)) {
      return slotCueId;
    }
    return undefined;
  }

  function isPresetSlotActive(slotId: string): boolean {
    const slot = resolveSlot(slotId);
    if (!slot?.presetId) return false;
    const runtime = runtimeBySlot.value.get(slotId);
    if (runtime?.activePresetId === slot.presetId) return true;
    return output.isPresetFading(slot.presetId);
  }

  function isAudioSlotActive(slotId: string): boolean {
    const slot = resolveSlot(slotId);
    if (!slot?.audioMappingId) return false;
    return runtimeBySlot.value.get(slotId)?.activeAudioMappingId === slot.audioMappingId;
  }

  function stopCueSlot(slotId: string) {
    const slot = resolveSlot(slotId);
    if (!slot?.cueId) return;
    const activeCueId = currentSlotCueId(slotId);
    if (!activeCueId) return;

    const releaseMs = slot.releaseMs ?? executor.value?.defaultReleaseMs ?? 0;
    output.stopCue(activeCueId, releaseMs);
  }

  function stopPresetSlot(slotId: string) {
    const slot = resolveSlot(slotId);
    if (!slot?.presetId) return;

    output.revertPreset(slot.presetId);
    const runtime = runtimeBySlot.value.get(slotId);
    if (runtime) {
      runtime.activePresetId = undefined;
      runtimeBySlot.value.set(slotId, runtime);
    }
  }

  function stopEffectSlot(slotId: string) {
    const slot = resolveSlot(slotId);
    if (!slot?.effectId) return;
    setEffectEnabled(slot.effectId, false);
  }

  function stopAudioSlot(slotId: string) {
    const runtime = runtimeBySlot.value.get(slotId);
    if (!runtime?.activeAudioMappingId) return;
    runtime.activeAudioMappingId = undefined;
    runtimeBySlot.value.set(slotId, runtime);
    output.requestMerge();
  }

  function stopSlot(slotId: string) {
    const slot = resolveSlot(slotId);
    if (!slot) return;

    switch (slotContentType(slot)) {
      case 'cue':
        stopCueSlot(slotId);
        break;
      case 'preset':
        stopPresetSlot(slotId);
        break;
      case 'effect':
        stopEffectSlot(slotId);
        break;
      case 'audio':
        stopAudioSlot(slotId);
        break;
    }
  }

  function goCueSlot(slotId: string) {
    const slot = resolveSlot(slotId);
    if (!slot?.cueId) return;

    const activeCueId = currentSlotCueId(slotId);
    if (activeCueId && activeCueId !== slot.cueId) {
      const releaseMs = slot.releaseMs ?? executor.value?.defaultReleaseMs ?? 0;
      output.stopCue(activeCueId, releaseMs);
    }

    const runtime = runtimeBySlot.value.get(slotId) ?? {};
    runtime.activeCueId = slot.cueId;
    runtimeBySlot.value.set(slotId, runtime);
    output.playCue(slot.cueId, {
      fadeInMs: slot.fadeMs ?? 0,
      intensity: clampUnit((slot.level ?? 1) * output.getCueLevel(slot.cueId)),
    });
  }

  function goPresetSlot(slotId: string) {
    const slot = resolveSlot(slotId);
    if (!slot?.presetId) return;

    const runtime = runtimeBySlot.value.get(slotId) ?? {};
    runtime.activePresetId = slot.presetId;
    runtimeBySlot.value.set(slotId, runtime);
    output.firePreset(slot.presetId, slot.fadeMs ?? 0);
  }

  function goEffectSlot(slotId: string) {
    const slot = resolveSlot(slotId);
    if (!slot?.effectId) return;
    setEffectEnabled(slot.effectId, true);
  }

  function goAudioSlot(slotId: string) {
    const slot = resolveSlot(slotId);
    if (!slot?.audioMappingId) return;

    const runtime = runtimeBySlot.value.get(slotId) ?? {};
    runtime.activeAudioMappingId = slot.audioMappingId;
    runtimeBySlot.value.set(slotId, runtime);
    output.requestMerge();
  }

  function goSlot(slotId: string) {
    const slot = resolveSlot(slotId);
    if (!slot) return;

    switch (slotContentType(slot)) {
      case 'cue':
        goCueSlot(slotId);
        break;
      case 'preset':
        goPresetSlot(slotId);
        break;
      case 'effect':
        goEffectSlot(slotId);
        break;
      case 'audio':
        goAudioSlot(slotId);
        break;
    }
  }

  function toggleSlot(slotId: string) {
    const slot = resolveSlot(slotId);
    if (!slot) return;

    switch (slotContentType(slot)) {
      case 'cue':
        if (currentSlotCueId(slotId)) stopCueSlot(slotId);
        else goCueSlot(slotId);
        break;
      case 'preset':
        if (isPresetSlotActive(slotId)) stopPresetSlot(slotId);
        else goPresetSlot(slotId);
        break;
      case 'effect':
        setEffectEnabled(slot.effectId!, !isEffectEnabled(slot.effectId!));
        break;
      case 'audio':
        if (isAudioSlotActive(slotId)) stopAudioSlot(slotId);
        else goAudioSlot(slotId);
        break;
    }
  }

  function latchSlot(slotId: string, latched?: boolean) {
    const slot = resolveSlot(slotId);
    if (!slot) return;

    const contentType = slotContentType(slot);
    const isActive =
      contentType === 'cue'
        ? Boolean(currentSlotCueId(slotId))
        : contentType === 'preset'
          ? isPresetSlotActive(slotId)
          : contentType === 'effect'
            ? isEffectEnabled(slot.effectId!)
            : contentType === 'audio'
              ? isAudioSlotActive(slotId)
              : false;

    const shouldLatch = latched ?? !isActive;
    if (shouldLatch) {
      goSlot(slotId);
    } else {
      stopSlot(slotId);
    }
  }

  function flashSlotStart(slotId: string) {
    const slot = resolveSlot(slotId);
    if (!slot) return;

    const contentType = slotContentType(slot);
    const runtime = runtimeBySlot.value.get(slotId) ?? {};
    runtime.isFlashing = true;

    if (contentType === 'effect' && slot.effectId) {
      runtime.flashRestoreEffectEnabled = isEffectEnabled(slot.effectId);
      runtimeBySlot.value.set(slotId, runtime);
      setEffectEnabled(slot.effectId, true);
      return;
    }

    if (contentType === 'preset' && slot.presetId) {
      runtime.activePresetId = slot.presetId;
      runtimeBySlot.value.set(slotId, runtime);
      output.firePreset(slot.presetId, slot.fadeMs ?? 0);
      return;
    }

    if (contentType === 'audio' && slot.audioMappingId) {
      runtime.flashRestoreAudioActive = isAudioSlotActive(slotId);
      runtime.activeAudioMappingId = slot.audioMappingId;
      runtimeBySlot.value.set(slotId, runtime);
      output.requestMerge();
      return;
    }

    if (!slot.cueId) return;

    if (output.playbackStates.has(slot.cueId)) {
      runtime.flashRestoreIntensity = output.playbackStates.get(slot.cueId)?.intensity ?? 1;
    } else {
      runtime.flashRestoreIntensity = undefined;
      goCueSlot(slotId);
    }
    runtime.activeCueId = slot.cueId;
    runtimeBySlot.value.set(slotId, runtime);
    output.setCueIntensity(slot.cueId, 1);
  }

  function flashSlotEnd(slotId: string) {
    const slot = resolveSlot(slotId);
    const runtime = runtimeBySlot.value.get(slotId);
    if (!slot || !runtime) return;

    const contentType = slotContentType(slot);
    runtime.isFlashing = false;
    runtimeBySlot.value.set(slotId, runtime);

    if (contentType === 'effect' && slot.effectId) {
      setEffectEnabled(slot.effectId, runtime.flashRestoreEffectEnabled ?? false);
      return;
    }

    if (contentType === 'preset' && slot.presetId) {
      stopPresetSlot(slotId);
      return;
    }

    if (contentType === 'audio' && slot.audioMappingId) {
      if (runtime.flashRestoreAudioActive) {
        runtime.activeAudioMappingId = slot.audioMappingId;
      } else {
        runtime.activeAudioMappingId = undefined;
      }
      runtime.flashRestoreAudioActive = undefined;
      runtimeBySlot.value.set(slotId, runtime);
      output.requestMerge();
      return;
    }

    if (!slot.cueId) return;

    const wasStartedByFlash = runtime.flashRestoreIntensity === undefined;
    if (!output.playbackStates.has(slot.cueId)) {
      return;
    }

    if (wasStartedByFlash) {
      stopCueSlot(slotId);
      return;
    }

    output.setCueIntensity(slot.cueId, runtime.flashRestoreIntensity ?? 1);
  }

  function triggerSlot(slotId: string) {
    const slot = resolveSlot(slotId);
    if (!slot || slotContentType(slot) === 'none') return;

    switch (slot.mode ?? 'go') {
      case 'toggle':
        toggleSlot(slotId);
        break;
      case 'latch':
        latchSlot(slotId);
        break;
      case 'flash':
        flashSlotStart(slotId);
        break;
      default:
        goSlot(slotId);
    }
  }

  function releaseFlash(slotId: string) {
    const slot = resolveSlot(slotId);
    if ((slot?.mode ?? 'go') !== 'flash') return;
    flashSlotEnd(slotId);
  }

  function stopAll() {
    output.stopAllCues();
    runtimeBySlot.value.clear();
  }

  function assignSlotContent(slotId: string, type: ExecutorSlotContentType, id?: string) {
    const wasAudioActive = isAudioSlotActive(slotId);
    showStore.updateDocument((doc) => {
      const rootExecutor = ensureRootExecutor(doc);
      const slot = rootExecutor.slots.find((candidate) => candidate.id === slotId);
      if (!slot) return;
      assignExecutorSlotContent(slot, type, id);
    });
    const runtime = runtimeBySlot.value.get(slotId);
    if (runtime) {
      runtime.activeAudioMappingId = undefined;
      runtimeBySlot.value.set(slotId, runtime);
    }
    if (wasAudioActive) output.requestMerge();
  }

  function assignSlot(slotId: string, cueId?: string) {
    assignSlotContent(slotId, cueId ? 'cue' : 'none', cueId);
  }

  function updateSlot(slotId: string, patch: Partial<ExecutorSlot>) {
    showStore.updateDocument((doc) => {
      const rootExecutor = ensureRootExecutor(doc);
      const slot = rootExecutor.slots.find((candidate) => candidate.id === slotId);
      if (!slot) return;
      Object.assign(slot, patch);
    });
  }

  function updateExecutor(patch: Partial<ShowExecutor>) {
    showStore.updateDocument((doc) => {
      const rootExecutor = ensureRootExecutor(doc);
      Object.assign(rootExecutor, patch);
    });
  }

  function setActivePage(page: number) {
    activePage.value = Math.max(1, Math.min(pageCount.value, Math.round(page)));
  }

  function nextPage() {
    setActivePage(activePage.value + 1);
  }

  function previousPage() {
    setActivePage(activePage.value - 1);
  }

  function slotsPerPage(rootExecutor: ShowExecutor): number {
    const counts = new Map<number, number>();
    for (const slot of rootExecutor.slots) {
      counts.set(slot.page, (counts.get(slot.page) ?? 0) + 1);
    }
    const onActive = counts.get(activePage.value);
    if (onActive && onActive > 0) return onActive;
    const first = counts.values().next().value;
    return Math.max(1, first ?? 8);
  }

  function addPage() {
    let createdPage = 1;
    showStore.updateDocument((doc) => {
      const rootExecutor = ensureRootExecutor(doc);
      const nextPageNumber = Math.max(1, rootExecutor.pages ?? 1) + 1;
      const count = slotsPerPage(rootExecutor);
      const stamp = Date.now().toString(36);
      for (let index = 0; index < count; index += 1) {
        rootExecutor.slots.push({
          id: `executor-slot-p${nextPageNumber}-${index + 1}-${stamp}`,
          name: `Slot ${index + 1}`,
          page: nextPageNumber,
          index,
          mode: 'go',
        });
      }
      rootExecutor.pages = nextPageNumber;
      rootExecutor.activePage = nextPageNumber;
      createdPage = nextPageNumber;
    });
    activePage.value = createdPage;
    selectedSlotId.value = null;
  }

  function removePage(page = activePage.value) {
    if (pageCount.value <= 1) return;

    const targetPage = Math.max(1, Math.min(pageCount.value, Math.round(page)));
    const slotsOnPage = slots.value.filter((slot) => slot.page === targetPage);
    for (const slot of slotsOnPage) {
      stopSlot(slot.id);
      runtimeBySlot.value.delete(slot.id);
    }

    showStore.updateDocument((doc) => {
      const rootExecutor = ensureRootExecutor(doc);
      rootExecutor.slots = rootExecutor.slots
        .filter((slot) => slot.page !== targetPage)
        .map((slot) =>
          slot.page > targetPage
            ? {
                ...slot,
                page: slot.page - 1,
              }
            : slot
        );
      rootExecutor.pages = Math.max(1, (rootExecutor.pages ?? 1) - 1);
      const nextActive = Math.min(activePage.value > targetPage ? activePage.value - 1 : activePage.value, rootExecutor.pages);
      rootExecutor.activePage = Math.max(1, nextActive);
      activePage.value = rootExecutor.activePage;
    });

    if (selectedSlotId.value && !slots.value.some((slot) => slot.id === selectedSlotId.value)) {
      selectedSlotId.value = null;
    }
  }

  function setSelectedSlot(slotId: string | null) {
    selectedSlotId.value = slotId;
  }

  function goActive() {
    const preferred = selectedSlotId.value ? resolveSlot(selectedSlotId.value) : undefined;
    if (preferred && preferred.page === activePage.value) {
      triggerSlot(preferred.id);
      return;
    }
    const first = visibleSlots.value[0];
    if (first) {
      triggerSlot(first.id);
      selectedSlotId.value = first.id;
    }
  }

  function goPreviousActive() {
    const visible = visibleSlots.value;
    if (!visible.length) return;

    const selectedIndex = selectedSlotId.value
      ? visible.findIndex((slot) => slot.id === selectedSlotId.value)
      : -1;

    const previousIndex = selectedIndex > 0 ? selectedIndex - 1 : visible.length - 1;
    const previous = visible[previousIndex];
    if (!previous) return;

    triggerSlot(previous.id);
    selectedSlotId.value = previous.id;
  }

  function assignSubmaster(slotId: string, submasterId?: string) {
    showStore.updateDocument((doc) => {
      const rootExecutor = ensureRootExecutor(doc);
      const slot = rootExecutor.slots.find((candidate) => candidate.id === slotId);
      if (!slot) return;
      slot.submasterId = submasterId;
    });
  }

  function setSlotLevel(slotId: string, level: number) {
    const clamped = clampUnit(level);
    showStore.updateDocument((doc) => {
      const rootExecutor = ensureRootExecutor(doc);
      const slot = rootExecutor.slots.find((candidate) => candidate.id === slotId);
      if (!slot) return;
      slot.level = clamped;
    });

    const slot = resolveSlot(slotId);
    const activeCueId = currentSlotCueId(slotId);
    if (slot?.cueId && activeCueId === slot.cueId) {
      output.setCueIntensity(
        slot.cueId,
        clampUnit(clamped * output.getCueLevel(slot.cueId))
      );
      return;
    }
    output.requestMerge();
  }

  function setSubmasterValue(submasterId: string, value: number) {
    showStore.updateDocument((doc) => {
      const submaster = doc.submasters?.find((candidate) => candidate.id === submasterId);
      if (!submaster) return;
      submaster.value = clampUnit(value);
    });
    output.requestMerge();
  }

  function describeAudioMapping(mappingId: string): string {
    const mapping = showStore.document.audioMappings?.find((entry) => entry.id === mappingId);
    if (!mapping) return 'Audio';
    return resolveAudioMappingLabel(mapping);
  }

  function getSlotContentLabel(slot: ExecutorSlot): string | null {
    const doc = showStore.document;
    if (slot.cueId) {
      return doc.cues.find((cue) => cue.id === slot.cueId)?.name ?? 'Cue';
    }
    if (slot.presetId) {
      return doc.presets.find((preset) => preset.id === slot.presetId)?.name ?? 'Preset';
    }
    if (slot.effectId) {
      return doc.effects.find((effect) => effect.id === slot.effectId)?.name ?? 'Effect';
    }
    if (slot.audioMappingId) {
      return describeAudioMapping(slot.audioMappingId);
    }
    return null;
  }

  function getSlotDisplayLabel(slot: ExecutorSlot): string {
    if (slot.name.trim()) return slot.name;
    return getSlotContentLabel(slot) ?? `P${slot.page}-${slot.index + 1}`;
  }

  function isSlotActive(slotId: string): boolean {
    const slot = resolveSlot(slotId);
    if (!slot) return false;

    switch (slotContentType(slot)) {
      case 'cue':
        return Boolean(currentSlotCueId(slotId));
      case 'preset':
        return isPresetSlotActive(slotId);
      case 'effect':
        return slot.effectId ? isEffectEnabled(slot.effectId) : false;
      case 'audio':
        return isAudioSlotActive(slotId);
      default:
        return false;
    }
  }

  function getActiveAudioContributions(): ActiveAudioContribution[] {
    const contributions: ActiveAudioContribution[] = [];
    for (const slot of slots.value) {
      if (!slot.audioMappingId || !isAudioSlotActive(slot.id)) continue;
      contributions.push({
        mappingId: slot.audioMappingId,
        level: clampUnit(slot.level ?? 1),
      });
    }
    return contributions;
  }

  return {
    activePage,
    selectedSlotId,
    executors,
    executor,
    slots,
    pageCount,
    visibleSlots,
    visibleRailSlots,
    submasters,
    assignSlot,
    assignSlotContent,
    slotContentType,
    getSlotContentLabel,
    getActiveAudioContributions,
    describeAudioMapping,
    updateExecutor,
    updateSlot,
    assignSubmaster,
    setSlotLevel,
    setSubmasterValue,
    setActivePage,
    nextPage,
    previousPage,
    addPage,
    removePage,
    setSelectedSlot,
    goSlot,
    goActive,
    goPreviousActive,
    stopSlot,
    stopAll,
    triggerSlot,
    releaseFlash,
    toggleSlot,
    latchSlot,
    flashSlotStart,
    flashSlotEnd,
    getSlotDisplayLabel,
    isSlotActive,
  };
});
