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
import { ref, computed } from 'vue';

const dmx = useDMXStore();
const {
  controlFixture,
  selectionLabel,
  hasSelection,
  selectedFixtureNames,
} = useSelectionControl();
const programmer = useProgrammerStore();

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
  <div class="controls-window">
    <header class="controls-header">
      <div class="controls-header__toolbar row items-center q-px-sm q-py-xs">
        <span class="sdmx-text-label">Controls</span>
        <q-space />
        <SdmxStatusChip
          v-if="hasSelection"
          :label="selectionLabel"
          variant="active"
        />
        <span v-else class="sdmx-text-caption text-grey-5">
          Select fixtures to adjust
        </span>
      </div>
    </header>

    <div class="controls-scroll">
      <div v-if="hasSelection" class="controls-body">
        <div
          v-if="!hasControls"
          class="controls-empty sdmx-text-caption"
        >
          No {{ programmer.activeFeatureGroup }} controls for this fixture. Try another feature tab.
        </div>

        <div v-else-if="controlFixture" class="controls-widgets">
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
      <div v-else class="tab-empty-state q-pa-lg text-center text-grey-5">
        <XIcon name="select" size="3rem" />
        <div class="q-mt-sm">No fixtures selected</div>
        <div class="text-caption">Select fixtures in the sheet to adjust their controls.</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.controls-window {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: var(--sdmx-color-bg-surface);
}

.controls-header {
  flex-shrink: 0;
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
}

.controls-header__toolbar {
  min-height: var(--sdmx-space-touch);
}

.controls-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

.controls-body {
  padding: var(--sdmx-space-sm) 0;
}

.controls-empty {
  padding: var(--sdmx-space-sm);
  text-align: center;
  color: var(--sdmx-color-text-muted);
}

.controls-widgets {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sdmx-space-sm);
  padding: 0 var(--sdmx-space-sm);
  align-content: flex-start;
}

.controls-widgets :deep(.widget-renderer) {
  margin-bottom: 0;
}

.controls-widgets :deep(.color-picker-widget),
.controls-widgets :deep(.dimmer-slider-widget),
.controls-widgets :deep(.light-mover-widget) {
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

.tab-empty-state {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 160px;
}
</style>
