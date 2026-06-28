<script setup lang="ts">
import XCard from 'src/components/controls/XCard.vue';
import XInput from 'src/components/controls/XInput.vue';
import XSelect from 'src/components/controls/XSelect.vue';
import XSwitch from 'src/components/controls/XSwitch.vue';
import { usePlotSettingsStore } from 'src/stores/plot-settings';

const plotSettings = usePlotSettingsStore();

const plotAlignModeOptions = [
  { label: 'By rows', value: 'row' },
  { label: 'By columns', value: 'column' },
];

function asNumber(value: string | number, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
</script>

<template>
  <XCard title="Plot And Visualizer">
    <div class="q-gutter-y-md">
      <div class="settings-subtitle">2D Plot</div>
      <div class="row q-col-gutter-sm">
        <div class="col-12 col-md-4"><XSwitch v-model="plotSettings.showGrid2d" label="Show grid" /></div>
        <div class="col-12 col-md-4"><XSwitch v-model="plotSettings.showLabels2d" label="Show labels" /></div>
        <div class="col-12 col-md-4"><XSwitch v-model="plotSettings.showCenter2d" label="Show center marker" /></div>
      </div>

      <div class="settings-subtitle">3D Plot</div>
      <div class="row q-col-gutter-sm">
        <div class="col-12 col-md-4"><XSwitch v-model="plotSettings.showGrid3d" label="Show grid" /></div>
        <div class="col-12 col-md-4"><XSwitch v-model="plotSettings.showStagePlane3d" label="Show stage plane" /></div>
        <div class="col-12 col-md-4"><XSwitch v-model="plotSettings.enableOrbit3d" label="Enable orbit controls" /></div>
      </div>

      <div class="settings-subtitle">Editing</div>
      <div class="row q-col-gutter-sm">
        <div class="col-12 col-md-4"><XSwitch v-model="plotSettings.enableDrag" label="Enable fixture drag" /></div>
        <div class="col-12 col-md-4"><XSwitch v-model="plotSettings.snapEnabled" label="Enable snap" /></div>
        <div class="col-12 col-md-4"><XInput :model-value="plotSettings.snapStep" type="number" label="Snap step" @update:model-value="(value) => (plotSettings.snapStep = Math.max(0.1, asNumber(value, 1)))" /></div>
      </div>

      <XSelect v-model="plotSettings.autoAlignMode" :options="plotAlignModeOptions" label="Auto-align mode" />
    </div>
  </XCard>
</template>

<style scoped lang="scss">
.settings-subtitle {
  font-size: 12px;
  color: var(--sdmx-color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 700;
}
</style>
