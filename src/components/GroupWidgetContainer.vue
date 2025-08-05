<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<!--
  Purpose: Container component for displaying widgets for a linked group of fixtures
-->
<script setup lang="ts">
import type { ShowfileFixtureMapped, ShowfileLinkedGroup } from 'src/types';
import { useDMXStore } from 'src/stores/dmx';
import WidgetRenderer from './Widgets/WidgetRenderer.vue';

const dmx = useDMXStore();
const props = defineProps<{
  group: ShowfileLinkedGroup;
}>();

// Get all fixtures in this group
const allFixtures = computed(() => {
  return dmx.showfileFixturesMapped.filter(
    (fixture) => props.group.names.includes(fixture.fixtureName)
  );
});

// Use the first fixture as the control fixture
const firstFixture = computed(() => {
  return allFixtures.value.length > 0 ? allFixtures.value[0] : null;
});

// Create a control fixture that's a copy of the first fixture
const controlFixture = ref<ShowfileFixtureMapped | null>(null);

// Initialize the control fixture
watch(firstFixture, (newFixture) => {
  if (!newFixture) return;
  // Deep clone the first fixture to use as control
  controlFixture.value = JSON.parse(JSON.stringify(newFixture));
  // Update the fixture name to indicate it's a group control
  if (controlFixture.value) {
    controlFixture.value.fixtureName = `${props.group.name} (Group Control)`;
  }
}, {
  immediate: true,
});

// Watch for changes in the control fixture and propagate to all fixtures in the group
watch(controlFixture, (newControlFixture) => {
  if (!newControlFixture) return;

  // Update all fixtures in the group with the control fixture's values
  allFixtures.value.forEach((fixture) => {
    fixture.def.channels.forEach((channel, index) => {
      if (newControlFixture.def.channels[index] && channel.reference) {
        channel.reference.value = newControlFixture.def.channels[index].reference.value;
      }
    });
  });
}, {
  immediate: true,
  deep: true
});

// Get widgets from the first fixture definition (all fixtures in group should be same type)
const widgets = computed(() => {
  return firstFixture.value?.def.widgets || [];
});
</script>

<template>
  <div class="group-widget-container">
    <div class="group-header">
      <h6 class="group-name">{{ group.name }}</h6>
      <div class="group-info">
        <span class="fixture-count">{{ allFixtures.length }} fixtures</span>
        <span class="fixture-type" v-if="firstFixture">{{ firstFixture.def.name }}</span>
      </div>
    </div>

    <div v-if="widgets.length === 0" class="no-widgets">
      <q-card flat bordered class="info-card">
        <q-card-section class="text-center">
          <q-icon name="widgets" size="2rem" class="text-grey-6 q-mb-sm" />
          <div class="text-body2 text-grey-6">
            No widgets configured for this fixture type
          </div>
        </q-card-section>
      </q-card>
    </div>

    <div v-else-if="controlFixture" class="widgets-grid">
      <WidgetRenderer
        v-for="widget in widgets"
        :key="`${group.name}-${widget.name}`"
        :widget="widget"
        :fixture="controlFixture"
      />
    </div>

    <div v-else class="loading-state">
      <q-card flat bordered class="info-card">
        <q-card-section class="text-center">
          <q-spinner size="2rem" class="text-primary q-mb-sm" />
          <div class="text-body2">
            Loading group controls...
          </div>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<style scoped lang="scss">
.group-widget-container {
  background: var(--q-dark);
  border: 2px solid var(--q-primary);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  flex-shrink: 0;
  min-width: 320px;

  // Visual distinction for group containers
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.group-header {
  margin-bottom: 16px;
  border-bottom: 2px solid var(--q-primary);
  padding-bottom: 12px;

  .group-name {
    margin: 0 0 4px 0;
    font-weight: 700;
    color: var(--q-primary);
    font-size: 1.1rem;

    // Add group indicator icon
    &::before {
      content: "👥 ";
      margin-right: 8px;
    }
  }

  .group-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;

    .fixture-count {
      font-size: 12px;
      color: var(--q-accent);
      font-weight: 600;
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 8px;
      border-radius: 12px;
    }

    .fixture-type {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }
}

.no-widgets, .loading-state {
  .info-card {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }
}

.widgets-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
