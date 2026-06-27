/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ref, watch } from 'vue';
import { defineStore } from 'pinia';

type PlotAlignMode = 'row' | 'column';

type PlotSettingsState = {
  showGrid2d: boolean;
  showLabels2d: boolean;
  showCenter2d: boolean;
  showGrid3d: boolean;
  showStagePlane3d: boolean;
  enableOrbit3d: boolean;
  enableDrag: boolean;
  snapEnabled: boolean;
  snapStep: number;
  autoAlignMode: PlotAlignMode;
};

const STORAGE_KEY = 'softdmx-plot-settings';

const DEFAULT_SETTINGS: PlotSettingsState = {
  showGrid2d: true,
  showLabels2d: true,
  showCenter2d: true,
  showGrid3d: true,
  showStagePlane3d: true,
  enableOrbit3d: true,
  enableDrag: true,
  snapEnabled: true,
  snapStep: 1,
  autoAlignMode: 'row',
};

function readPersisted(): PlotSettingsState {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<PlotSettingsState>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      snapStep:
        typeof parsed.snapStep === 'number' && Number.isFinite(parsed.snapStep)
          ? parsed.snapStep
          : DEFAULT_SETTINGS.snapStep,
      autoAlignMode: parsed.autoAlignMode === 'column' ? 'column' : 'row',
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function persist(settings: PlotSettingsState): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export const usePlotSettingsStore = defineStore('plot-settings', () => {
  const initial = readPersisted();
  const showGrid2d = ref(initial.showGrid2d);
  const showLabels2d = ref(initial.showLabels2d);
  const showCenter2d = ref(initial.showCenter2d);
  const showGrid3d = ref(initial.showGrid3d);
  const showStagePlane3d = ref(initial.showStagePlane3d);
  const enableOrbit3d = ref(initial.enableOrbit3d);
  const enableDrag = ref(initial.enableDrag);
  const snapEnabled = ref(initial.snapEnabled);
  const snapStep = ref(initial.snapStep);
  const autoAlignMode = ref<PlotAlignMode>(initial.autoAlignMode);

  watch(
    [
      showGrid2d,
      showLabels2d,
      showCenter2d,
      showGrid3d,
      showStagePlane3d,
      enableOrbit3d,
      enableDrag,
      snapEnabled,
      snapStep,
      autoAlignMode,
    ],
    () => {
      persist({
        showGrid2d: showGrid2d.value,
        showLabels2d: showLabels2d.value,
        showCenter2d: showCenter2d.value,
        showGrid3d: showGrid3d.value,
        showStagePlane3d: showStagePlane3d.value,
        enableOrbit3d: enableOrbit3d.value,
        enableDrag: enableDrag.value,
        snapEnabled: snapEnabled.value,
        snapStep: snapStep.value,
        autoAlignMode: autoAlignMode.value,
      });
    },
    { deep: false }
  );

  return {
    showGrid2d,
    showLabels2d,
    showCenter2d,
    showGrid3d,
    showStagePlane3d,
    enableOrbit3d,
    enableDrag,
    snapEnabled,
    snapStep,
    autoAlignMode,
  };
});
