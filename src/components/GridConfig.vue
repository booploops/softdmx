<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useUIStore } from 'src/stores/ui';
import ChannelWidget from './ChannelWidget.vue';
import { useDMXStore } from 'src/stores/dmx';
import GroupWidget from './GroupWidget.vue';
import WidgetContainer from './WidgetContainer.vue';
import GroupWidgetContainer from './GroupWidgetContainer.vue';
import CueShowPanel from './CueShowPanel.vue';

const dmx = useDMXStore();
const ui = useUIStore();

const groups = computed(() => dmx.showfile?.linkedGroups || []);

// For widgets view, we want to show groups when available and user prefers groups
const showGroupWidgets = computed(() => {
  return ui.currentTab === 'widgets' &&
         groups.value.length > 0 &&
         ui.widgetsViewMode === 'groups';
});

// Get individual fixtures that are NOT part of any group
const ungroupedFixtures = computed(() => {
  if (!dmx.showfile) return [];

  const groupedFixtureNames = new Set(
    groups.value.flatMap(group => group.names)
  );

  return dmx.showfileFixturesMapped.filter(
    fixture => !groupedFixtureNames.has(fixture.fixtureName)
  );
});
</script>

<template>
    <div
        class="horizontal-fixture-scroller"
        v-show="ui.currentTab == 'channels'"
    >
        <template v-if="dmx.showfile">
            <ChannelWidget
                :definition="channel"
                v-for="(channel, index) in dmx.showfileFixturesMapped"
                :key="index"
            />
        </template>
    </div>
    <div
        class="horizontal-fixture-scroller"
        v-show="ui.currentTab == 'groups'"
    >
        <template v-if="dmx.showfile">
            <GroupWidget
                :group="group"
                v-for="(group, index) in groups"
                :key="index"
            />
        </template>
    </div>
    <div
        class="horizontal-fixture-scroller widgets-view"
        v-show="ui.currentTab == 'widgets'"
    >
        <template v-if="dmx.showfile">
            <!-- Show group widgets when groups are available -->
            <template v-if="showGroupWidgets">
                <!-- Group Widgets -->
                <GroupWidgetContainer
                    :group="group"
                    v-for="(group, index) in groups"
                    :key="`group-${index}`"
                />

                <!-- Individual fixtures not in any group -->
                <WidgetContainer
                    :fixture="fixture"
                    v-for="(fixture, index) in ungroupedFixtures"
                    :key="`individual-${index}`"
                />
            </template>

            <!-- Show all individual fixtures when no groups exist -->
            <template v-else>
                <WidgetContainer
                    :fixture="fixture"
                    v-for="(fixture, index) in dmx.showfileFixturesMapped"
                    :key="`fixture-${index}`"
                />
            </template>
        </template>
    </div>
    <div
        class="show-mode-container"
        v-show="ui.currentTab == 'show'"
    >
        <CueShowPanel />
    </div>
</template>

<style scoped>
.horizontal-fixture-scroller {
    display: flex;
    overflow: scroll;
    flex-wrap: nowrap;

    padding: 8px;
    gap: 8px;
    position: relative;

    &.widgets-view {
        /* Allow widgets to wrap to new rows if needed */
        flex-wrap: wrap;

        /* Adjust gap for widget containers */
        gap: 16px;
    }
}

.show-mode-container {
    height: 100%;
    overflow: hidden;
}
</style>
