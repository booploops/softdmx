<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import WidgetRenderer from 'src/components/Widgets/WidgetRenderer.vue';
import { useSelectionControl } from 'src/composables/useSelectionControl';
import { useProgrammerStore } from 'src/stores/programmer';

const { controlFixture, controlWidgets, selectionLabel, hasSelection } = useSelectionControl();
const programmer = useProgrammerStore();
</script>

<template>
  <div class="selection-control-panel">
    <div class="row items-center q-px-sm q-py-xs q-gutter-xs panel-header">
      <q-icon name="highlight_alt" size="xs" />
      <span class="text-caption text-weight-bold">Selection controls</span>
      <q-chip v-if="hasSelection" dense size="sm" color="primary" text-color="white">
        {{ selectionLabel }}
      </q-chip>
      <q-space />
      <span v-if="hasSelection" class="text-caption text-grey-5">
        {{ programmer.activeFeatureGroup === 'all' ? 'All attributes' : programmer.activeFeatureGroup }}
      </span>
    </div>

    <div v-if="!hasSelection" class="panel-empty q-pa-md text-center text-grey-5 text-caption">
      Select fixtures on the sheet or groups on the right to control dimmer, color, position, and more.
    </div>

    <div v-else-if="controlWidgets.length === 0" class="panel-empty q-pa-md text-center text-grey-5 text-caption">
      No {{ programmer.activeFeatureGroup }} controls for this fixture type. Try another feature tab above.
    </div>

    <div v-else-if="controlFixture" class="panel-widgets q-px-sm q-pb-sm">
      <WidgetRenderer
        v-for="widget in controlWidgets"
        :key="`${controlFixture.fixtureName}-${widget.name}`"
        :widget="widget"
        :fixture="controlFixture"
      />
    </div>
  </div>
</template>

<style scoped>
.selection-control-panel {
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
  flex-shrink: 0;
  max-height: 42%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.panel-header {
  flex-shrink: 0;
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
}

.panel-empty {
  flex-shrink: 0;
}

.panel-widgets {
  overflow: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-content: flex-start;
  min-height: 0;
}

.panel-widgets :deep(.widget-renderer) {
  margin-bottom: 0;
}

.panel-widgets :deep(.color-picker-widget),
.panel-widgets :deep(.dimmer-slider-widget),
.panel-widgets :deep(.light-mover-widget) {
  min-width: 180px;
}
</style>
