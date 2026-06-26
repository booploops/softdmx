<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { ShowfileFixtureMapped } from '@softdmx/engine';
import { useSelectionStore } from 'src/stores/selection';
import { useGroupColors } from 'src/composables/useGroupColors';
import { groupColorStyle } from '@softdmx/engine';
import { useChannelControl } from 'src/composables/useChannelControl';
import { SdmxValueField } from 'src/components/ui';

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
  background: groupInfo.value?.color ?? 'var(--sdmx-color-text)',
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
    class="fixture-sheet-tile sdmx-focus-ring"
    :class="{
      selected: isSelected,
      'has-group': !!groupInfo,
      'sdmx-widget--active': intensity > 0,
    }"
    :style="cardStyle"
    :data-sdmx-info="`Fixture ${fixture.fixtureName}`"
    tabindex="0"
    @click="toggleSelection"
    @keydown.enter="toggleSelection"
    @keydown.space.prevent="toggleSelection"
  >
    <div class="fixture-sheet-tile__header">
      <span class="sdmx-text-label ellipsis">{{ fixture.fixtureName }}</span>
      <q-icon v-if="isSelected" name="check_circle" size="xs" color="primary" />
    </div>
    <div class="fixture-sheet-output" :style="outputStyle" @pointerdown.stop="onOutputPointerDown" />
    <SdmxValueField :value="intensity" size="sm" />
  </div>
</template>

<style scoped>
.fixture-sheet-tile__header {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-xs);
  min-width: 0;
}

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
