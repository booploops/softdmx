<!--
  Copyright (C) 2025-Present booploops and contributors
  
  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useDMXStore } from 'src/stores/dmx';
import { useSelectionStore } from 'src/stores/selection';
import { useGroupColors } from 'src/composables/useGroupColors';
import { groupColorStyle } from 'src/utils/group-colors';
import ChannelAttributeControl from './ChannelAttributeControl.vue';

const dmx = useDMXStore();
const selection = useSelectionStore();
const { groupColor } = useGroupColors();
type LinkedGroup = { name: string; names: string[] };

const props = defineProps<{
    group: LinkedGroup;
}>();

const isSelected = computed(() => selection.isGroupSelected(props.group.name));
const color = computed(() => groupColor(props.group.name));
const cardStyle = computed(() => groupColorStyle(color.value));

const allChannels = computed(() => {
    return dmx.showfileFixturesMapped.filter(
        (fixture) => props.group.names.includes(fixture.fixtureName)
    );
});

const firstChannel = computed(() => {
    return allChannels.value.length > 0 ? allChannels.value[0] : null;
});

function groupPath(channelName: string): string {
  return `group://${encodeURIComponent(props.group.name)}/${encodeURIComponent(channelName)}`;
}

function toggleSelection() {
  selection.toggleGroup(props.group.name);
}
</script>

<template>
    <div
        class="fixture-channel-widget"
        :class="{ selected: isSelected, 'has-group': !!color }"
        :style="cardStyle"
    >
        <div class="widget-title" @click="toggleSelection">
            {{ group.name }}
        </div>
        <div v-if="firstChannel">
            <template v-for="channel in firstChannel.def.channels" :key="channel.name">
                <div class="channel-widget">
                    <div class="channel-name">
                        {{ channel.name }}
                    </div>
                    <ChannelAttributeControl
                        :channel="channel"
                        :path="groupPath(channel.name)"
                    />
                </div>
            </template>
        </div>
    </div>
</template>

<style scoped>
.fixture-channel-widget {
    user-select: none;
    border: 1px solid var(--sdmx-color-border-subtle);
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 12px;
    flex-shrink: 0;

    &.has-group {
        border-color: color-mix(in srgb, var(--fixture-group-color) 45%, var(--sdmx-color-border-subtle));
        box-shadow: inset 4px 0 0 var(--fixture-group-color);
    }

    &.selected {
        border-color: var(--sdmx-color-primary);
        box-shadow: 0 0 0 1px var(--sdmx-color-primary-ring);

        &.has-group {
            box-shadow:
                inset 4px 0 0 var(--fixture-group-color),
                0 0 0 1px var(--sdmx-color-primary-ring);
        }
    }
}
.widget-title {
    cursor: pointer;
    font-weight: 600;
    margin: -12px -12px 8px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--sdmx-color-border-subtle);
}
.has-group .widget-title {
    background: color-mix(in srgb, var(--fixture-group-color) 14%, transparent);
    border-bottom-color: color-mix(in srgb, var(--fixture-group-color) 30%, var(--sdmx-color-border-subtle));
}
.channel-widget {
    margin-bottom: 8px;
}
.channel-name {
    font-weight: bold;
    margin-bottom: 4px;
}
</style>
