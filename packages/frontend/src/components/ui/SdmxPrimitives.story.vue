<script setup lang="ts">
import { SdmxButton, SdmxStatusChip, SdmxValueField, SdmxToggle, SdmxEncoder } from 'src/components/ui';

const toggleOn = ref(true);
const encoderValue = ref(128);
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
  </Story>
</template>
