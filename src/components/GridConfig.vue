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

const dmx = useDMXStore();
const ui = useUIStore();

const groups = computed(() => dmx.showfile?.linkedGroups || []);
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
            <WidgetContainer
                :fixture="fixture"
                v-for="(fixture, index) in dmx.showfileFixturesMapped"
                :key="index"
            />
        </template>
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
</style>
