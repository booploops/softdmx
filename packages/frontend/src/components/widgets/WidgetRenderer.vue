<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<!--
  Purpose: Dynamic widget renderer that can display different widget types
-->
<script setup lang="ts">
import { computed, type Component } from 'vue';
import type { WidgetConfiguration, ShowfileFixtureMapped, FixtureChannelDefinition } from '@softdmx/engine';
import ColorPicker from './ColorPicker.vue';
import LightMover from './LightMover.vue';
import DimmerSlider from './DimmerSlider.vue';
import Strobe from './Strobe.vue';
import IndexedSelect from './IndexedSelect.vue';
import ChannelAttributeControl from '../ChannelAttributeControl.vue';
import type { ColorPickerModel } from './color-picker.types';
import type { LightMoverModel } from './light-mover.types';
import type { DimmerSliderModel } from './dimmer-slider.types';
import type { StrobeModel } from './strobe.types';
import type { IndexedSelectModel } from './indexed-select.types';

const props = defineProps<{
  widget: WidgetConfiguration;
  fixture: ShowfileFixtureMapped;
}>();

type WidgetRegistryEntry = {
  component: Component;
  resolveModel: () => unknown | null;
};

function findChannel(channelName?: string): FixtureChannelDefinition | undefined {
  if (!channelName) return undefined;
  return props.fixture.def.channels.find((ch) => ch.name === channelName);
}

const lightMoverModel = computed((): LightMoverModel | null => {
  if (props.widget.type !== 'lightMover') return null;

  const panChannel = findChannel(props.widget.channels.panChannel);
  const panFineChannel = findChannel(props.widget.channels.panFineChannel);
  const tiltChannel = findChannel(props.widget.channels.tiltChannel);
  const tiltFineChannel = findChannel(props.widget.channels.tiltFineChannel);

  if (!panChannel || !tiltChannel) {
    console.warn('Missing required channels for lightMover widget:', props.widget);
    return null;
  }

  return { panChannel, panFineChannel, tiltChannel, tiltFineChannel };
});

const colorPickerModel = computed((): ColorPickerModel | null => {
  if (props.widget.type !== 'colorPicker') return null;

  const redChannel = findChannel(props.widget.channels.redChannel);
  const greenChannel = findChannel(props.widget.channels.greenChannel);
  const blueChannel = findChannel(props.widget.channels.blueChannel);

  if (!redChannel || !greenChannel || !blueChannel) {
    console.warn('Missing required channels for colorPicker widget:', props.widget);
    return null;
  }

  return { redChannel, greenChannel, blueChannel };
});

const dimmerSliderModel = computed((): DimmerSliderModel | null => {
  if (props.widget.type !== 'dimmerSlider') return null;

  const dimmerChannel = findChannel(props.widget.channels.dimmerChannel);
  if (!dimmerChannel) {
    console.warn('Missing required channels for dimmerSlider widget:', props.widget);
    return null;
  }

  return { dimmerChannel };
});

const strobeModel = computed((): StrobeModel | null => {
  if (props.widget.type !== 'strobe') return null;

  const strobeChannel = findChannel(props.widget.channels.strobeChannel);
  if (!strobeChannel) {
    console.warn('Missing required channels for strobe widget:', props.widget);
    return null;
  }

  return { strobeChannel };
});

const indexedSelectModel = computed((): IndexedSelectModel | null => {
  if (props.widget.type !== 'indexedSelect') return null;

  const channel = findChannel(props.widget.channels.channel);
  if (!channel) {
    console.warn('Missing required channel for indexedSelect widget:', props.widget);
    return null;
  }

  return { channel };
});

const fallbackChannel = computed(() => {
  const channelName =
    props.widget.channels.channel
    ?? props.widget.channels.dimmerChannel
    ?? Object.values(props.widget.channels)[0];
  return findChannel(channelName);
});

const fallbackPath = computed(() => fallbackChannel.value?.reference?.path ?? '');

const widgetRegistry = computed<Record<string, WidgetRegistryEntry>>(() => ({
  lightMover: { component: LightMover, resolveModel: () => lightMoverModel.value },
  colorPicker: { component: ColorPicker, resolveModel: () => colorPickerModel.value },
  dimmerSlider: { component: DimmerSlider, resolveModel: () => dimmerSliderModel.value },
  strobe: { component: Strobe, resolveModel: () => strobeModel.value },
  indexedSelect: { component: IndexedSelect, resolveModel: () => indexedSelectModel.value },
}));

const registryEntry = computed(() => widgetRegistry.value[props.widget.type]);
const resolvedModel = computed(() => registryEntry.value?.resolveModel() ?? null);
const useFallback = computed(() => !registryEntry.value || resolvedModel.value === null);
</script>

<template>
  <div class="widget-renderer">
    <component
      :is="registryEntry!.component"
      v-if="!useFallback && registryEntry"
      v-model="resolvedModel"
      :key="`${fixture.fixtureName}-${widget.name}`"
    />

    <ChannelAttributeControl
      v-else-if="fallbackChannel && fallbackPath"
      :channel="fallbackChannel"
      :path="fallbackPath"
      :key="`${fixture.fixtureName}-${widget.name}-fallback`"
    />

    <div v-else class="widget-error">
      <q-card flat bordered class="error-card">
        <q-card-section>
          <div class="text-h6 text-negative">
            <XIcon name="alert-circle" class="q-mr-sm" />
            Widget Error
          </div>
          <div class="text-body2">
            Unknown widget type "{{ widget.type }}" or missing required channels.
          </div>
          <div class="text-caption q-mt-sm">
            Widget: {{ widget.name }}
          </div>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<style scoped lang="scss">
.widget-renderer {
  margin-bottom: 12px;
}

.widget-error {
  .error-card {
    background: var(--sdmx-color-negative-soft);
    border-color: var(--sdmx-color-negative-border);
  }
}
</style>
