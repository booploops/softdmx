<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { DeskPane } from '@softdmx/engine';
import FixtureSheetWindow from './windows/FixtureSheetWindow.vue';
import GroupWindow from './windows/GroupWindow.vue';
import WidgetWindow from './windows/WidgetWindow.vue';
import ProgrammerWindow from './windows/ProgrammerWindow.vue';
import PlotWindow from './windows/PlotWindow.vue';
import PresetGridWindow from './windows/PresetGridWindow.vue';
import AttributeControlWindow from './windows/AttributeControlWindow.vue';

const props = defineProps<{ pane: DeskPane }>();
</script>

<template>
  <div class="desk-window-host">
    <FixtureSheetWindow v-if="props.pane.windowType === 'fixture-sheet'" />
    <GroupWindow v-else-if="props.pane.windowType === 'groups'" />
    <WidgetWindow v-else-if="props.pane.windowType === 'widgets'" />
    <ProgrammerWindow v-else-if="props.pane.windowType === 'programmer'" />
    <PlotWindow v-else-if="props.pane.windowType === 'plot'" />
    <PresetGridWindow v-else-if="props.pane.windowType === 'presets'" />
    <AttributeControlWindow v-else-if="props.pane.windowType === 'attribute-control'" />
    <div v-else class="q-pa-md sdmx-text-muted">Unknown window: {{ props.pane.windowType }}</div>
  </div>
</template>
