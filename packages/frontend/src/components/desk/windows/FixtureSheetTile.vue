<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { ShowfileFixtureMapped } from '@softdmx/engine';
import { useDMXStore } from 'src/stores/dmx';
import { useSelectionStore } from 'src/stores/selection';
import { useGroupColors } from 'src/composables/useGroupColors';
import { groupColorStyle } from '@softdmx/engine';
import { useChannelControl } from 'src/composables/useChannelControl';

const props = defineProps<{
  fixture: ShowfileFixtureMapped;
  intensity: number;
}>();

const selection = useSelectionStore();
const { fixtureGroup } = useGroupColors();
const { setChannel } = useChannelControl();

const isSelected = computed(() => selection.isFixtureSelected(props.fixture.fixtureName));
const groupInfo = computed(() => fixtureGroup(props.fixture.fixtureName));
const cardStyle = computed(() => groupColorStyle(groupInfo.value?.color));

const dimmerPath = computed(() => {
  const ch = props.fixture.def.channels.find(
    (c) => c.type === 'intensity' || c.name.toLowerCase().includes('dimmer')
  );
  return ch?.reference.path;
});

const outputStyle = computed(() => ({
  opacity: Math.max(0.08, props.intensity / 255),
  background: groupInfo.value?.color ?? '#fff',
}));

function toggleSelection() {
  selection.toggleFixture(props.fixture.fixtureName);
}

function onOutputPointerDown(event: PointerEvent) {
  if (!dimmerPath.value) return;
  event.preventDefault();
  const el = event.currentTarget as HTMLElement;
  const update = (clientY: number) => {
    const rect = el.getBoundingClientRect();
    const ratio = 1 - (clientY - rect.top) / rect.height;
    const value = Math.round(Math.max(0, Math.min(1, ratio)) * 255);
    setChannel(dimmerPath.value!, value);
  };
  update(event.clientY);
  const onMove = (e: PointerEvent) => update(e.clientY);
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}
</script>

<template>
  <div
    class="fixture-sheet-tile"
    :class="{ selected: isSelected, 'has-group': !!groupInfo }"
    :style="cardStyle"
    @click="toggleSelection"
  >
    <div class="row items-center no-wrap">
      <div class="text-caption text-weight-bold ellipsis">{{ fixture.fixtureName }}</div>
      <q-icon v-if="isSelected" name="check_circle" size="xs" color="primary" class="q-ml-xs" />
    </div>
    <div class="fixture-sheet-output" :style="outputStyle" @pointerdown.stop="onOutputPointerDown" />
    <div class="fixture-sheet-value">{{ intensity }}</div>
  </div>
</template>
