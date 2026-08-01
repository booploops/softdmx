<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { SdmxButton, SdmxSelect, SdmxStatusChip, SdmxValueField, SdmxToggle, SdmxEncoder } from 'src/components/ui';

const toggleOn = ref(true);
const encoderValue = ref(128);
const selectValue = ref('warm');
const selectOptions = [
  { label: 'Warm White', value: 'warm' },
  { label: 'Cool White', value: 'cool' },
  { label: 'Red', value: 'red' },
];
</script>

<template>
  <Story title="UI Primitives/Overview" group="primitives">
    <Variant title="Buttons">
      <div style="display: flex; gap: 8px; flex-wrap: wrap; padding: 16px; background: var(--sdmx-color-bg-page);">
        <SdmxButton label="Default" />
        <SdmxButton label="Primary" variant="primary" />
        <SdmxButton label="Danger" variant="danger" />
        <SdmxButton label="Active" active />
        <SdmxButton icon="play" variant="primary" round />
      </div>
    </Variant>
    <Variant title="Status Chips">
      <div style="display: flex; gap: 8px; flex-wrap: wrap; padding: 16px; background: var(--sdmx-color-bg-page);">
        <SdmxStatusChip label="Show Name" icon="description" />
        <SdmxStatusChip label="Link: 2" icon="link" variant="positive" />
        <SdmxStatusChip label="Armed" variant="armed" />
        <SdmxStatusChip label="Blackout" variant="negative" />
      </div>
    </Variant>
    <Variant title="Value Fields">
      <div style="display: flex; gap: 24px; padding: 16px; background: var(--sdmx-color-bg-page);">
        <SdmxValueField label="Dimmer" value="75" unit="%" size="lg" />
        <SdmxValueField label="Pan" value="128" size="md" />
        <SdmxValueField label="GM" value="100" unit="%" color="var(--sdmx-color-gm)" />
      </div>
    </Variant>
    <Variant title="Toggle & Encoder">
      <div style="display: flex; gap: 24px; padding: 16px; background: var(--sdmx-color-bg-page);">
        <SdmxToggle v-model="toggleOn" label="Blind Mode" />
        <SdmxEncoder v-model="encoderValue" label="Dimmer" unit="%" :changed="encoderValue !== 0" />
      </div>
    </Variant>
    <Variant title="Select">
      <div style="display: flex; flex-direction: column; gap: 12px; padding: 16px; max-width: 280px; background: var(--sdmx-color-bg-page);">
        <SdmxSelect v-model="selectValue" :options="selectOptions" label="Color mode" />
        <SdmxSelect v-model="selectValue" :options="selectOptions" size="sm" />
      </div>
    </Variant>
  </Story>
</template>
