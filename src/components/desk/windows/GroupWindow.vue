<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useDMXStore } from 'src/stores/dmx';
import { useSelectionStore } from 'src/stores/selection';
import { useProgrammerStore } from 'src/stores/programmer';
import { useGroupColors } from 'src/composables/useGroupColors';
import { groupColorStyle } from 'src/utils/group-colors';
import { useChannelControl } from 'src/composables/useChannelControl';

const dmx = useDMXStore();
const selection = useSelectionStore();
const programmer = useProgrammerStore();
const { groupColor } = useGroupColors();
const { setChannel, setGroupChannels, getDisplayValue } = useChannelControl();

const groups = computed(() => dmx.showfile?.groups || []);

function groupChannelPath(groupName: string, channelName: string): string {
  return `group://${encodeURIComponent(groupName)}/${encodeURIComponent(channelName)}`;
}

function findGroupChannel(groupName: string, matcher: (name: string, type: string) => boolean) {
  const group = groups.value.find((entry) => entry.name === groupName);
  const fixtureName = group?.fixtures[0];
  if (!fixtureName) return undefined;
  const fixture = dmx.showfileFixturesMapped.find((entry) => entry.fixtureName === fixtureName);
  return fixture?.def.channels.find((channel) => matcher(channel.name, channel.type));
}

function groupDimmerPath(groupName: string): string | undefined {
  const channel = findGroupChannel(groupName, (name, type) =>
    type === 'intensity' || name.toLowerCase().includes('dimmer')
  );
  return channel ? groupChannelPath(groupName, channel.name) : undefined;
}

function groupColorChannels(groupName: string) {
  const find = (names: string[]) => {
    for (const candidate of names) {
      const channel = findGroupChannel(groupName, (name) => name === candidate);
      if (channel) return channel.name;
    }
    return undefined;
  };
  return {
    red: find(['Red', 'ColorAdd_R']),
    green: find(['Green', 'ColorAdd_G']),
    blue: find(['Blue', 'ColorAdd_B']),
  };
}

function groupPositionChannels(groupName: string) {
  return {
    pan: findGroupChannel(groupName, (name) => name.toLowerCase().includes('pan'))?.name,
    tilt: findGroupChannel(groupName, (name) => name.toLowerCase().includes('tilt'))?.name,
  };
}

function groupDimmerLevel(groupName: string): number {
  const channel = findGroupChannel(groupName, (name, type) =>
    type === 'intensity' || name.toLowerCase().includes('dimmer')
  );
  return channel ? groupLevel(groupName, channel.name) : 0;
}

function setGroupDimmer(groupName: string, value: number) {
  const path = groupDimmerPath(groupName);
  if (path) setChannel(path, value, 'intensity');
}

function groupLevel(groupName: string, channelName?: string): number {
  if (!channelName) return 0;
  return getDisplayValue(groupChannelPath(groupName, channelName));
}

function setGroupLevel(groupName: string, channelName: string | undefined, value: number) {
  if (!channelName) return;
  setChannel(groupChannelPath(groupName, channelName), value);
}

function setGroupRgb(groupName: string, channel: 'red' | 'green' | 'blue', value: number) {
  const channels = groupColorChannels(groupName);
  const channelName = channels[channel];
  if (!channelName) return;
  setGroupChannels(groupName, { [channelName]: value });
}

function showDimmerControl(groupName: string) {
  const feature = programmer.activeFeatureGroup;
  return feature === 'all' || feature === 'dimmer';
}

function showColorControls(groupName: string) {
  const feature = programmer.activeFeatureGroup;
  if (feature !== 'all' && feature !== 'color') return false;
  const channels = groupColorChannels(groupName);
  return !!(channels.red && channels.green && channels.blue);
}

function showPositionControls(groupName: string) {
  const feature = programmer.activeFeatureGroup;
  if (feature !== 'all' && feature !== 'position') return false;
  const channels = groupPositionChannels(groupName);
  return !!(channels.pan && channels.tilt);
}
</script>

<template>
  <div class="group-window">
    <div v-if="groups.length" class="group-fader-grid">
      <div
        v-for="group in groups"
        :key="group.name"
        class="group-fader-strip"
        :class="{ selected: selection.isGroupSelected(group.name) }"
        :style="groupColorStyle(groupColor(group.name))"
        @click="selection.toggleGroup(group.name)"
      >
        <div class="text-caption text-weight-bold text-center">{{ group.name }}</div>

        <template v-if="showDimmerControl(group.name)">
          <q-slider
            :model-value="groupDimmerLevel(group.name)"
            :min="0"
            :max="255"
            :step="1"
            vertical
            reverse
            dense
            color="primary"
            class="vertical-fader"
            @update:model-value="(v) => setGroupDimmer(group.name, Number(v ?? 0))"
            @click.stop
          />
        </template>

        <div v-if="showColorControls(group.name)" class="group-mini-controls" @click.stop>
          <q-slider
            :model-value="groupLevel(group.name, groupColorChannels(group.name).red)"
            :min="0"
            :max="255"
            dense
            color="red"
            label
            label-text-color="red-3"
            @update:model-value="(v) => setGroupRgb(group.name, 'red', Number(v ?? 0))"
          />
          <q-slider
            :model-value="groupLevel(group.name, groupColorChannels(group.name).green)"
            :min="0"
            :max="255"
            dense
            color="green"
            @update:model-value="(v) => setGroupRgb(group.name, 'green', Number(v ?? 0))"
          />
          <q-slider
            :model-value="groupLevel(group.name, groupColorChannels(group.name).blue)"
            :min="0"
            :max="255"
            dense
            color="blue"
            @update:model-value="(v) => setGroupRgb(group.name, 'blue', Number(v ?? 0))"
          />
        </div>

        <div v-if="showPositionControls(group.name)" class="group-mini-controls" @click.stop>
          <q-slider
            :model-value="groupLevel(group.name, groupPositionChannels(group.name).pan)"
            :min="0"
            :max="255"
            dense
            label="Pan"
            @update:model-value="(v) => setGroupLevel(group.name, groupPositionChannels(group.name).pan, Number(v ?? 0))"
          />
          <q-slider
            :model-value="groupLevel(group.name, groupPositionChannels(group.name).tilt)"
            :min="0"
            :max="255"
            dense
            label="Tilt"
            @update:model-value="(v) => setGroupLevel(group.name, groupPositionChannels(group.name).tilt, Number(v ?? 0))"
          />
        </div>

        <div class="text-caption">{{ groupDimmerLevel(group.name) }}</div>
      </div>
    </div>
    <div v-else class="q-pa-lg text-center text-grey-5">
      <q-icon name="group_off" size="2rem" />
      <div class="q-mt-sm">No groups defined</div>
    </div>
  </div>
</template>

<style scoped>
.group-window {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.group-mini-controls {
  width: 100%;
  padding: 0 4px;
}
</style>
