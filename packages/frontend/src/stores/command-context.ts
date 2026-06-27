/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { computed } from 'vue';
import { defineStore } from 'pinia';
import { useUIStore } from './ui';
import { useSelectionStore } from './selection';
import { useTimelineEditorStore } from './timeline-editor';
import { useShowStore } from './show';
import { useScratchStore } from './scratch';

export type CommandContextSnapshot = {
  mode: 'live' | 'program' | 'timeline' | 'setup';
  operateLocked: boolean;
  selectedFixtures: string[];
  selectedGroups: string[];
  activeCueId: string | null;
  playheadMs: number;
  timelineMarkers: number;
  timelineSections: number;
  fixtureCount: number;
  scratchActive: boolean;
  showName: string;
};

export const useCommandContextStore = defineStore('command-context', () => {
  const ui = useUIStore();
  const selection = useSelectionStore();
  const timeline = useTimelineEditorStore();
  const show = useShowStore();
  const scratch = useScratchStore();

  const snapshot = computed<CommandContextSnapshot>(() => ({
    mode: ui.mode,
    operateLocked: ui.operateLocked,
    selectedFixtures: Array.from(selection.selectedFixtures),
    selectedGroups: Array.from(selection.selectedGroups),
    activeCueId: timeline.selectedCueId,
    playheadMs: timeline.playheadMs,
    timelineMarkers: timeline.markers.length,
    timelineSections: timeline.sections.length,
    fixtureCount: show.document.fixtures.length,
    scratchActive: scratch.isActive,
    showName: show.name,
  }));

  const prompt = computed(() => {
    const parts = [
      snapshot.value.mode.toUpperCase(),
      `FX:${snapshot.value.selectedFixtures.length}`,
      `GR:${snapshot.value.selectedGroups.length}`,
    ];
    if (snapshot.value.activeCueId) {
      parts.push(`CUE:${snapshot.value.activeCueId}`);
    }
    if (snapshot.value.operateLocked) {
      parts.push('LOCK');
    }
    return `[${parts.join(' | ')}] >`;
  });

  return {
    snapshot,
    prompt,
  };
});
