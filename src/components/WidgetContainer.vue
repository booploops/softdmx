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
import type { ShowfileFixtureMapped } from 'src/types';
import WidgetRenderer from './Widgets/WidgetRenderer.vue';

const props = defineProps<{
  fixture: ShowfileFixtureMapped;
}>();

// Get widgets from the fixture definition
const widgets = computed(() => {
  return props.fixture.def.widgets || [];
});
</script>

<template>
  <div class="widget-container">
    <div class="fixture-header">
      <h6 class="fixture-name">{{ fixture.fixtureName }}</h6>
      <div class="fixture-type">{{ fixture.def.name }}</div>
    </div>

    <div v-if="widgets.length === 0" class="no-widgets">
      <q-card flat bordered class="info-card">
        <q-card-section class="text-center">
          <q-icon name="widgets" size="2rem" class="text-grey-6 q-mb-sm" />
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
  background: var(--q-dark);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  flex-shrink: 0;
  min-width: 320px;
}

.fixture-header {
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 12px;

  .fixture-name {
    margin: 0 0 4px 0;
    font-weight: 600;
    color: var(--q-primary);
  }

  .fixture-type {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.no-widgets {
  .info-card {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
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
