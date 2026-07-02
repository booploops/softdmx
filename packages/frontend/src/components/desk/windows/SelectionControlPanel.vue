<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import WidgetRenderer from 'src/components/widgets/WidgetRenderer.vue';
import ChannelAttributeControl from 'src/components/ChannelAttributeControl.vue';
import { useSelectionControl } from 'src/composables/useSelectionControl';
import { useProgrammerStore } from 'src/stores/programmer';
import { resolveProgrammerControls } from '@softdmx/engine';
import { useDMXStore } from 'src/stores/dmx';
import { SdmxStatusChip } from 'src/components/ui';

const dmx = useDMXStore();
const {
  controlFixture,
  selectionLabel,
  hasSelection,
  selectedFixtureNames,
} = useSelectionControl();
const programmer = useProgrammerStore();

const expanded = ref(true);

const selectedFixtureDefs = computed(() =>
  selectedFixtureNames.value
    .map((name) => dmx.showfileFixturesMapped.find((fixture) => fixture.fixtureName === name)?.def)
    .filter((def): def is NonNullable<typeof def> => Boolean(def))
);

const programmerControls = computed(() => {
  if (selectedFixtureDefs.value.length === 0) return [];
  return resolveProgrammerControls(selectedFixtureDefs.value, {
    featureFilter: programmer.activeFeatureGroup === 'all' ? 'all' : programmer.activeFeatureGroup,
  });
});

const widgetControls = computed(() =>
  programmerControls.value.filter((control) => control.kind === 'widget' && control.widget)
);

const channelFallbacks = computed(() =>
  programmerControls.value.filter((control) => control.kind === 'channel')
);

const hasControls = computed(
  () => widgetControls.value.length > 0 || channelFallbacks.value.length > 0
);

function resolveControlPath(channelName: string): string {
  const fixture = controlFixture.value;
  if (!fixture) return '';
  const channel = fixture.def.channels.find((entry) => entry.name === channelName);
  return channel?.reference?.path ?? '';
}

function resolveControlChannel(channelName: string) {
  const fixture = controlFixture.value;
  if (!fixture) return null;
  return fixture.def.channels.find((entry) => entry.name === channelName) ?? null;
}
</script>

<template>
  <div class="selection-control-panel">
    <button
      type="button"
      class="selection-control-panel__header"
      :class="{ 'selection-control-panel__header--idle': !hasSelection }"
      @click="expanded = !expanded"
    >
      <XIcon name="select" size="xs" />
      <span class="sdmx-text-label">Controls</span>
      <SdmxStatusChip
        v-if="hasSelection"
        :label="selectionLabel"
        variant="active"
      />
      <span v-else class="sdmx-text-caption selection-control-panel__hint">
        Select fixtures to adjust
      </span>
      <q-space />
      <XIcon :name="expanded ? 'chevron-up' : 'chevron-down'" size="xs" />
    </button>

    <q-slide-transition>
      <div v-show="expanded && hasSelection" class="selection-control-panel__body">
        <div
          v-if="!hasControls"
          class="selection-control-panel__empty sdmx-text-caption"
        >
          No {{ programmer.activeFeatureGroup }} controls for this fixture. Try another feature tab.
        </div>

        <div v-else-if="controlFixture" class="selection-control-panel__widgets">
          <WidgetRenderer
            v-for="control in widgetControls"
            :key="`${controlFixture.fixtureName}-${control.id}`"
            :widget="control.widget!"
            :fixture="controlFixture"
          />

          <div
            v-for="control in channelFallbacks"
            :key="`${controlFixture.fixtureName}-${control.id}`"
            class="channel-fallback"
          >
            <div class="channel-fallback__header">
              <span class="sdmx-text-caption channel-fallback__label">{{ control.label }}</span>
              <q-chip
                v-if="control.partialCoverage"
                dense
                size="sm"
                color="warning"
                text-color="dark"
                class="channel-fallback__badge"
              >
                partial
              </q-chip>
            </div>
            <ChannelAttributeControl
              v-if="resolveControlChannel(control.channelNames[0] ?? '')"
              :channel="resolveControlChannel(control.channelNames[0] ?? '')!"
              :path="resolveControlPath(control.channelNames[0] ?? '')"
              :show-dmx-hint="true"
            />
          </div>
        </div>
      </div>
    </q-slide-transition>
  </div>
</template>

<style scoped>
.selection-control-panel {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.selection-control-panel__header {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-xs);
  width: 100%;
  min-height: var(--sdmx-space-touch);
  padding: var(--sdmx-space-xs) var(--sdmx-space-sm);
  border: none;
  border-top: 1px solid var(--sdmx-color-border-subtle);
  background: var(--sdmx-color-bg-surface);
  color: var(--sdmx-color-text);
  cursor: pointer;
  text-align: left;
}

.selection-control-panel__header--idle {
  opacity: 0.75;
}

.selection-control-panel__hint {
  color: var(--sdmx-color-text-muted);
}

.selection-control-panel__body {
  padding-bottom: var(--sdmx-space-sm);
}

.selection-control-panel__empty {
  padding: var(--sdmx-space-sm);
  text-align: center;
  color: var(--sdmx-color-text-muted);
}

.selection-control-panel__widgets {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sdmx-space-sm);
  padding: 0 var(--sdmx-space-sm);
  align-content: flex-start;
}

.selection-control-panel__widgets :deep(.widget-renderer) {
  margin-bottom: 0;
}

.selection-control-panel__widgets :deep(.color-picker-widget),
.selection-control-panel__widgets :deep(.dimmer-slider-widget),
.selection-control-panel__widgets :deep(.light-mover-widget) {
  min-width: 180px;
}

.channel-fallback {
  min-width: 180px;
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-sm);
  background: var(--sdmx-color-bg-elevated);
  padding: var(--sdmx-space-xs);
}

.channel-fallback__header {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-xs);
  margin-bottom: var(--sdmx-space-xs);
}

.channel-fallback__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.channel-fallback__badge {
  flex-shrink: 0;
}
</style>
