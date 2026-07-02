<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<!--
  Purpose: Container component for displaying all widgets for a fixture
-->
<script setup lang="ts">
import type { ShowfileFixtureMapped } from '@softdmx/engine';
import WidgetRenderer from './widgets/WidgetRenderer.vue';
import { useSelectionStore } from 'src/stores/selection';

const props = defineProps<{
  fixture: ShowfileFixtureMapped;
}>();
const selection = useSelectionStore();

// Get widgets from the fixture definition
const widgets = computed(() => {
  return props.fixture.def.widgets || [];
});

const isSelected = computed(() => selection.isFixtureSelected(props.fixture.fixtureName));

function toggleFixtureSelection() {
  selection.toggleFixture(props.fixture.fixtureName);
}
</script>

<template>
  <div class="widget-container" :class="{ selected: isSelected }">
    <div class="fixture-header" @click="toggleFixtureSelection">
      <h6 class="fixture-name">{{ fixture.fixtureName }}</h6>
      <div class="fixture-type">{{ fixture.def.name }}</div>
    </div>

    <div v-if="widgets.length === 0" class="no-widgets">
      <q-card flat bordered class="info-card">
        <q-card-section class="text-center">
          <XIcon name="layout-grid" size="2rem" class="text-grey-6 q-mb-sm" />
          <div class="text-body2 text-grey-6">
            No widgets configured for this fixture
          </div>
        </q-card-section>
      </q-card>
    </div>

    <div v-else class="widgets-grid">
      <WidgetRenderer
        v-for="widget in widgets"
        :key="`${fixture.fixtureName}-${widget.name}`"
        :widget="widget"
        :fixture="fixture"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.widget-container {
  background: var(--sdmx-color-bg-surface);
  border: 1px solid var(--sdmx-color-border);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  flex-shrink: 0;
  min-width: 320px;

  &.selected {
    border-color: var(--sdmx-color-primary);
    box-shadow: 0 0 0 1px var(--sdmx-color-primary-ring);
  }
}

.fixture-header {
  margin-bottom: 16px;
  border-bottom: 1px solid var(--sdmx-color-border);
  padding-bottom: 12px;
  cursor: pointer;

  .fixture-name {
    margin: 0 0 4px 0;
    font-weight: 600;
    color: var(--sdmx-color-primary);
  }

  .fixture-type {
    font-size: 12px;
    color: var(--sdmx-color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.no-widgets {
  .info-card {
    background: var(--sdmx-color-border-faint);
    border-color: var(--sdmx-color-border);
  }
}

.widgets-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;

  // If we want a grid layout for multiple widgets per fixture
  // display: grid;
  // grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  // gap: 16px;
}
</style>
