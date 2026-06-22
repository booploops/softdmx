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
import { useShowStore } from './show';
import { useOutputEngineStore } from './output-playback';

interface SlotRuntimeState {
  activeCueId?: string;
  isFlashing?: boolean;
  flashRestoreIntensity?: number;
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

  function stopSlot(slotId: string) {
    const slot = resolveSlot(slotId);
    if (!slot) return;
    const activeCueId = currentSlotCueId(slotId);
    if (!activeCueId) return;

    const releaseMs = slot.releaseMs ?? executor.value?.defaultReleaseMs ?? 0;
    output.stopCue(activeCueId, releaseMs);
  }

  function goSlot(slotId: string) {
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

  function toggleSlot(slotId: string) {
    if (currentSlotCueId(slotId)) {
      stopSlot(slotId);
      return;
    }
    goSlot(slotId);
  }

  function latchSlot(slotId: string, latched?: boolean) {
    const shouldLatch = latched ?? !Boolean(currentSlotCueId(slotId));
    if (shouldLatch) {
      goSlot(slotId);
    } else {
      stopSlot(slotId);
    }
  }

  function flashSlotStart(slotId: string) {
    const slot = resolveSlot(slotId);
    if (!slot?.cueId) return;

    const runtime = runtimeBySlot.value.get(slotId) ?? {};
    runtime.isFlashing = true;
    if (output.playbackStates.has(slot.cueId)) {
      runtime.flashRestoreIntensity = output.playbackStates.get(slot.cueId)?.intensity ?? 1;
    } else {
      runtime.flashRestoreIntensity = undefined;
      goSlot(slotId);
    }
    runtime.activeCueId = slot.cueId;
    runtimeBySlot.value.set(slotId, runtime);
    output.setCueIntensity(slot.cueId, 1);
  }

  function flashSlotEnd(slotId: string) {
    const slot = resolveSlot(slotId);
    const runtime = runtimeBySlot.value.get(slotId);
    if (!slot?.cueId || !runtime) return;

    const wasStartedByFlash = runtime.flashRestoreIntensity === undefined;
    runtime.isFlashing = false;
    runtimeBySlot.value.set(slotId, runtime);

    if (!output.playbackStates.has(slot.cueId)) {
      return;
    }

    if (wasStartedByFlash) {
      stopSlot(slotId);
      return;
    }

    output.setCueIntensity(slot.cueId, runtime.flashRestoreIntensity ?? 1);
  }

  function triggerSlot(slotId: string) {
    const slot = resolveSlot(slotId);
    if (!slot) return;

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

  function assignSlot(slotId: string, cueId?: string) {
    showStore.updateDocument((doc) => {
      const rootExecutor = ensureRootExecutor(doc);
      const slot = rootExecutor.slots.find((candidate) => candidate.id === slotId);
      if (!slot) return;
      slot.cueId = cueId;
    });
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
    activePage.value = Math.max(1, Math.min(pageCount.value, page));
  }

  function nextPage() {
    setActivePage(activePage.value + 1);
  }

  function previousPage() {
    setActivePage(activePage.value - 1);
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

  function getSlotDisplayLabel(slot: ExecutorSlot): string {
    if (slot.name.trim()) return slot.name;
    return `P${slot.page}-${slot.index + 1}`;
  }

  function isSlotActive(slotId: string): boolean {
    const cueId = currentSlotCueId(slotId);
    return cueId ? output.playbackStates.has(cueId) : false;
  }

  return {
    activePage,
    selectedSlotId,
    executors,
    executor,
    slots,
    pageCount,
    visibleSlots,
    submasters,
    assignSlot,
    updateExecutor,
    updateSlot,
    assignSubmaster,
    setSlotLevel,
    setSubmasterValue,
    setActivePage,
    nextPage,
    previousPage,
    setSelectedSlot,
    goSlot,
    goActive,
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
