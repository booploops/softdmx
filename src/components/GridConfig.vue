<script setup lang="ts">
import { useUIStore } from 'src/stores/ui';
import ChannelWidget from './ChannelWidget.vue';
import { useDMXStore } from 'src/stores/dmx';
import GroupWidget from './GroupWidget.vue';

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
</template>

<style scoped>
.horizontal-fixture-scroller {
    display: flex;
    overflow: scroll;
    flex-wrap: nowrap;

    padding: 8px;
    gap: 8px;
    position: relative;
    background-color: #333;
}
</style>
