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
import { computed } from 'vue';
import type { WidgetConfiguration, ShowfileFixtureMapped } from 'src/types';
import ColorPicker from './ColorPicker.vue';
import LightMover from './LightMover.vue';
import DimmerSlider from './DimmerSlider.vue';
import type { ColorPickerModel } from './ColorPicker';
import type { LightMoverModel } from './LightMover';
import type { DimmerSliderModel } from './DimmerSlider';

const props = defineProps<{
  widget: WidgetConfiguration;
  fixture: ShowfileFixtureMapped;
}>();

// Create models for different widget types by mapping channels
const lightMoverModel = computed((): LightMoverModel | null => {
  if (props.widget.type !== 'lightMover') return null;

  const findChannel = (channelName?: string) => {
    if (!channelName) return undefined;
    return props.fixture.def.channels.find(ch => ch.name === channelName);
  };

  const panChannel = findChannel(props.widget.channels.panChannel);
  const panFineChannel = findChannel(props.widget.channels.panFineChannel);
  const tiltChannel = findChannel(props.widget.channels.tiltChannel);
  const tiltFineChannel = findChannel(props.widget.channels.tiltFineChannel);

  if (!panChannel || !panFineChannel || !tiltChannel || !tiltFineChannel) {
    console.warn('Missing required channels for lightMover widget:', props.widget);
    return null;
  }

  // The channels from ShowfileFixtureMapped already have references
  return {
    panChannel: panChannel as any,
    panFineChannel: panFineChannel as any,
    tiltChannel: tiltChannel as any,
    tiltFineChannel: tiltFineChannel as any
  };
});

const colorPickerModel = computed((): ColorPickerModel | null => {
  if (props.widget.type !== 'colorPicker') return null;

  const findChannel = (channelName?: string) => {
    if (!channelName) return undefined;
    return props.fixture.def.channels.find(ch => ch.name === channelName);
  };

  const redChannel = findChannel(props.widget.channels.redChannel);
  const greenChannel = findChannel(props.widget.channels.greenChannel);
  const blueChannel = findChannel(props.widget.channels.blueChannel);

  if (!redChannel || !greenChannel || !blueChannel) {
    console.warn('Missing required channels for colorPicker widget:', props.widget);
    return null;
  }

  // The channels from ShowfileFixtureMapped already have references
  return {
    redChannel: redChannel as any,
    greenChannel: greenChannel as any,
    blueChannel: blueChannel as any
  };
});

const dimmerSliderModel = computed((): DimmerSliderModel | null => {
  if (props.widget.type !== 'dimmerSlider') return null;

  const findChannel = (channelName?: string) => {
    if (!channelName) return undefined;
    return props.fixture.def.channels.find(ch => ch.name === channelName);
  };

  const dimmerChannel = findChannel(props.widget.channels.dimmerChannel);

  if (!dimmerChannel) {
    console.warn('Missing required channels for dimmerSlider widget:', props.widget);
    return null;
  }

  // The channels from ShowfileFixtureMapped already have references
  return {
    dimmerChannel: dimmerChannel as any
  };
});
</script>

<template>
  <div class="widget-renderer">
    <!-- Light Mover Widget -->
    <LightMover
      v-if="widget.type === 'lightMover' && lightMoverModel"
      v-model="lightMoverModel"
      :key="`${fixture.fixtureName}-${widget.name}`"
    />

    <!-- Color Picker Widget -->
    <ColorPicker
      v-if="widget.type === 'colorPicker' && colorPickerModel"
      v-model="colorPickerModel"
      :key="`${fixture.fixtureName}-${widget.name}`"
    />

    <!-- Dimmer Slider Widget -->
    <DimmerSlider
      v-if="widget.type === 'dimmerSlider' && dimmerSliderModel"
      v-model="dimmerSliderModel"
      :key="`${fixture.fixtureName}-${widget.name}`"
    />

    <!-- Fallback for unknown widget types -->
    <div v-if="!lightMoverModel && !colorPickerModel && !dimmerSliderModel" class="widget-error">
      <q-card flat bordered class="error-card">
        <q-card-section>
          <div class="text-h6 text-negative">
            <q-icon name="error" class="q-mr-sm" />
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
    background: rgba(244, 67, 54, 0.1);
    border-color: rgba(244, 67, 54, 0.3);
  }
}
</style>
