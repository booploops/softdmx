<!--
  Copyright (C) 2025-Present booploops and contributors
  
  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { ShowfileFixtureMapped } from 'src/types';
import { useSelectionStore } from 'src/stores/selection';
import { useGroupColors } from 'src/composables/useGroupColors';
import { groupColorStyle } from 'src/utils/group-colors';
import ChannelAttributeControl from './ChannelAttributeControl.vue';

const props = defineProps<{
    definition: ShowfileFixtureMapped;
}>();

const selection = useSelectionStore();
const { fixtureGroup } = useGroupColors();

const isSelected = computed(() => selection.isFixtureSelected(props.definition.fixtureName));
const groupInfo = computed(() => fixtureGroup(props.definition.fixtureName));
const cardStyle = computed(() => groupColorStyle(groupInfo.value?.color));

function toggleSelection() {
  selection.toggleFixture(props.definition.fixtureName);
}
</script>

<template>
    <div
        class="fixture-channel-widget"
        :class="{ selected: isSelected, 'has-group': !!groupInfo }"
        :style="cardStyle"
    >
        <div class="widget-title" @click="toggleSelection">
            {{ definition.fixtureName }}
        </div>
        <div>
            <template v-for="channel in definition.def.channels" :key="channel.reference.path">
                <div class="channel-widget">
                    <div class="channel-name">
                        {{ channel.name }}
                    </div>
                    <ChannelAttributeControl
                        :channel="channel"
                        :path="channel.reference.path"
                    />
                </div>
            </template>
        </div>
    </div>
</template>

<style scoped>
.channel-widget {
    border: 1px solid var(--sdmx-color-border);
    border-radius: 4px;
    padding: 8px;
    margin-bottom: 12px;
}

.channel-name {
    font-weight: bold;
    margin-bottom: 4px;
}

.channel-reference {
    margin-bottom: 8px;
    text-align: center;
}

.fixture-channel-widget {
    user-select: none;
    border: 1px solid var(--sdmx-color-border-subtle);
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 12px;
    flex-shrink: 0;
    overflow: hidden;
    overflow-y: scroll;

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

    div {
        margin-bottom: 8px;
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
</style>
