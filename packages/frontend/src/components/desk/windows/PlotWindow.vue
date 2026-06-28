<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { resolveFixturePosition } from '@softdmx/engine';
import VisualizerPanel from 'src/components/VisualizerPanel.vue';
import VisualizerPanel3D from 'src/components/VisualizerPanel3D.vue';
import { useShowStore } from 'src/stores/show';
import { useSelectionStore } from 'src/stores/selection';
import { usePlotSettingsStore } from 'src/stores/plot-settings';
import { SdmxButton } from 'src/components/ui';
import { useInfoText } from 'src/composables/useInfoText';
import { createMenu } from 'src/lib/menus';

const showStore = useShowStore();
const selection = useSelectionStore();
const plotSettings = usePlotSettingsStore();
const { info } = useInfoText();
const viewMode = ref<'2d' | '3d'>('2d');
const SNAP_STEPS = [0.25, 0.5, 1, 2] as const;

const fixtures = computed(() =>
  showStore.document.fixtures.map((f) => ({
    name: f.name,
    position: f.position,
  }))
);

const selectedFixtures = computed(() => Array.from(selection.selectedFixtures));

function snapValue(value: number): number {
  if (!plotSettings.snapEnabled) return value;
  const step = Math.max(0.05, plotSettings.snapStep);
  return Math.round(value / step) * step;
}

function onFixtureSelect(name: string) {
  selection.toggleFixture(name);
}

function onFixtureMove(name: string, position: { x: number; y?: number; z: number }) {
  const snappedX = snapValue(position.x);
  const snappedZ = snapValue(position.z);

  showStore.updateDocument((doc) => {
    const fixture = doc.fixtures.find((entry) => entry.name === name);
    if (!fixture) return;
    fixture.position = {
      ...(fixture.position ?? {}),
      x: snappedX,
      y: position.y ?? fixture.position?.y ?? 0,
      z: snappedZ,
    };
  });
}

function cycleSnapStep() {
  const currentIndex = SNAP_STEPS.findIndex((value) => value === plotSettings.snapStep);
  const nextIndex = (currentIndex + 1) % SNAP_STEPS.length;
  plotSettings.snapStep = SNAP_STEPS[nextIndex] ?? 1;
}

function cycleAutoAlignMode() {
  plotSettings.autoAlignMode = plotSettings.autoAlignMode === 'row' ? 'column' : 'row';
}

function autoAlignFixtures() {
  const fixtureList = showStore.document.fixtures;
  if (!fixtureList.length) return;

  const selectedSet = new Set(selectedFixtures.value);
  const targetNames =
    selectedSet.size > 0
      ? fixtureList.filter((fixture) => selectedSet.has(fixture.name)).map((fixture) => fixture.name)
      : fixtureList.map((fixture) => fixture.name);
  if (!targetNames.length) return;
  const targetNameSet = new Set(targetNames);

  const positions = fixtureList
    .map((fixture, index) => ({
      name: fixture.name,
      position: resolveFixturePosition(fixture.position, index, fixtureList.length),
    }))
    .filter((entry) => targetNameSet.has(entry.name))
    .sort((a, b) =>
      plotSettings.autoAlignMode === 'row'
        ? a.position.x - b.position.x || a.position.z - b.position.z
        : a.position.z - b.position.z || a.position.x - b.position.x
    );

  const count = positions.length;
  if (!count) return;

  const averageX = positions.reduce((sum, entry) => sum + entry.position.x, 0) / count;
  const averageZ = positions.reduce((sum, entry) => sum + entry.position.z, 0) / count;
  const spacing = plotSettings.snapEnabled ? Math.max(plotSettings.snapStep, 0.25) : 1;
  const positionByName = new Map(
    positions.map((entry, index) => {
      if (plotSettings.autoAlignMode === 'row') {
        const startX = averageX - ((count - 1) * spacing) / 2;
        return [entry.name, { x: snapValue(startX + index * spacing), z: snapValue(averageZ) }];
      }
      const startZ = averageZ - ((count - 1) * spacing) / 2;
      return [entry.name, { x: snapValue(averageX), z: snapValue(startZ + index * spacing) }];
    })
  );

  showStore.updateDocument((doc) => {
    doc.fixtures.forEach((fixture) => {
      const next = positionByName.get(fixture.name);
      if (!next) return;
      fixture.position = {
        ...(fixture.position ?? {}),
        x: next.x,
        y: fixture.position?.y ?? 0,
        z: next.z,
      };
    });
  });
}

function showSettingsMenu(event: MouseEvent) {
  const menu = createMenu([
    { label: '2D Plot', type: 'normal', enabled: false },
    {
      label: 'Show grid',
      type: 'checkbox',
      checked: plotSettings.showGrid2d,
      click: () => { plotSettings.showGrid2d = !plotSettings.showGrid2d; }
    },
    {
      label: 'Show fixture labels',
      type: 'checkbox',
      checked: plotSettings.showLabels2d,
      click: () => { plotSettings.showLabels2d = !plotSettings.showLabels2d; }
    },
    {
      label: 'Show stage center marker',
      type: 'checkbox',
      checked: plotSettings.showCenter2d,
      click: () => { plotSettings.showCenter2d = !plotSettings.showCenter2d; }
    },
    { type: 'separator' },
    { label: '3D Plot', type: 'normal', enabled: false },
    {
      label: 'Show grid helper',
      type: 'checkbox',
      checked: plotSettings.showGrid3d,
      click: () => { plotSettings.showGrid3d = !plotSettings.showGrid3d; }
    },
    {
      label: 'Show stage floor',
      type: 'checkbox',
      checked: plotSettings.showStagePlane3d,
      click: () => { plotSettings.showStagePlane3d = !plotSettings.showStagePlane3d; }
    },
    {
      label: 'Enable orbit/pan/zoom',
      type: 'checkbox',
      checked: plotSettings.enableOrbit3d,
      click: () => { plotSettings.enableOrbit3d = !plotSettings.enableOrbit3d; }
    },
    { type: 'separator' },
    { label: 'Interaction', type: 'normal', enabled: false },
    {
      label: 'Enable fixture drag',
      type: 'checkbox',
      checked: plotSettings.enableDrag,
      click: () => { plotSettings.enableDrag = !plotSettings.enableDrag; }
    }
  ]);
  menu.show(event.clientX, event.clientY);
}
</script>

<template>
  <div class="plot-window">
    <div class="plot-window__toolbar">
      <SdmxButton
        label="2D"
        size="sm"
        :variant="viewMode === '2d' ? 'primary' : 'ghost'"
        :info="info('desk.plot.view2d')"
        @click="viewMode = '2d'"
      />
      <SdmxButton
        label="3D"
        size="sm"
        :variant="viewMode === '3d' ? 'primary' : 'ghost'"
        :info="info('desk.plot.view3d')"
        @click="viewMode = '3d'"
      />
      <SdmxButton
        :label="plotSettings.snapEnabled ? `Snap ${plotSettings.snapStep}m` : 'Snap Off'"
        size="sm"
        :variant="plotSettings.snapEnabled ? 'primary' : 'ghost'"
        :info="info('desk.plot.snap')"
        @click="plotSettings.snapEnabled = !plotSettings.snapEnabled"
      />
      <SdmxButton
        label="Snap Step"
        size="sm"
        variant="ghost"
        :info="info('desk.plot.snapStep')"
        @click="cycleSnapStep"
      />
      <SdmxButton
        label="Auto Align"
        size="sm"
        variant="ghost"
        :info="info('desk.plot.autoAlign', { mode: plotSettings.autoAlignMode })"
        @click="autoAlignFixtures"
      />
      <SdmxButton
        :label="plotSettings.autoAlignMode === 'row' ? 'Mode: Row' : 'Mode: Column'"
        size="sm"
        variant="ghost"
        :info="info('desk.plot.alignDirection')"
        @click="cycleAutoAlignMode"
      />
      <SdmxButton
        label="Settings"
        size="sm"
        variant="ghost"
        icon="tune"
        :info="info('desk.plot.settings')"
        @click="showSettingsMenu"
      />
    </div>
    <VisualizerPanel3D
      v-if="viewMode === '3d'"
      :fixtures="fixtures"
      :selected-fixtures="selectedFixtures"
      :snap-enabled="plotSettings.snapEnabled"
      :snap-step="plotSettings.snapStep"
      :show-grid="plotSettings.showGrid3d"
      :show-stage-plane="plotSettings.showStagePlane3d"
      :enable-orbit="plotSettings.enableOrbit3d"
      :allow-drag="plotSettings.enableDrag"
      @select-fixture="onFixtureSelect"
      @move-fixture="onFixtureMove"
    />
    <VisualizerPanel
      v-else
      compact
      :fixtures="fixtures"
      :selected-fixtures="selectedFixtures"
      :snap-enabled="plotSettings.snapEnabled"
      :snap-step="plotSettings.snapStep"
      :show-grid="plotSettings.showGrid2d"
      :show-labels="plotSettings.showLabels2d"
      :show-stage-center="plotSettings.showCenter2d"
      :allow-drag="plotSettings.enableDrag"
      @select-fixture="onFixtureSelect"
      @move-fixture="onFixtureMove"
    />
  </div>
</template>

<style scoped>
.plot-window {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.plot-window__toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--sdmx-space-xs);
  padding: var(--sdmx-space-xs) var(--sdmx-space-sm);
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
  flex-shrink: 0;
}

.plot-settings-menu {
  min-width: 220px;
  padding: var(--sdmx-space-sm);
}

.plot-settings-menu__title {
  font-size: var(--sdmx-font-size-label);
  color: var(--sdmx-color-text-faint);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}
</style>
