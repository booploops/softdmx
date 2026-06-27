<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { inferAttributeFeature } from '@softdmx/engine';
import { useDMXStore } from 'src/stores/dmx';
import { useSelectionStore } from 'src/stores/selection';
import { useShowStore } from 'src/stores/show';
import { useOutputEngineStore } from 'src/stores/output-playback';
import { useScratchStore } from 'src/stores/scratch';

type QuickTarget = 'dimmer' | 'pan' | 'tilt' | 'red' | 'green' | 'blue' | 'white';

const dmx = useDMXStore();
const selection = useSelectionStore();
const showStore = useShowStore();
const scratch = useScratchStore();
const engine = useOutputEngineStore();

const currentValue = ref('0');
const quickTarget = ref<QuickTarget>('dimmer');

const QUICK_TARGETS: Array<{ id: QuickTarget; label: string; aliases: string[] }> = [
  { id: 'dimmer', label: 'Dim', aliases: ['dimmer', 'dimmer coarse', 'intensity', 'master dimmer'] },
  { id: 'pan', label: 'Pan', aliases: ['pan', 'pan coarse'] },
  { id: 'tilt', label: 'Tilt', aliases: ['tilt', 'tilt coarse'] },
  { id: 'red', label: 'Red', aliases: ['red', 'red coarse'] },
  { id: 'green', label: 'Green', aliases: ['green', 'green coarse'] },
  { id: 'blue', label: 'Blue', aliases: ['blue', 'blue coarse'] },
  { id: 'white', label: 'White', aliases: ['white', 'amber', 'mint', 'lime'] },
];

const selectedFixtureNames = computed(() => {
  const names = new Set<string>();
  for (const name of selection.selectedFixtures) {
    names.add(name);
  }
  for (const groupName of selection.selectedGroups) {
    const group = showStore.document.groups.find((entry) => entry.name === groupName);
    for (const fixtureName of group?.fixtures ?? []) {
      names.add(fixtureName);
    }
  }
  return Array.from(names);
});

const valueAsNumber = computed(() => {
  const parsed = Number.parseInt(currentValue.value || '0', 10);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.min(255, parsed));
});

const canApply = computed(() => selectedFixtureNames.value.length > 0);

function setQuickValue(next: number) {
  currentValue.value = `${Math.max(0, Math.min(255, Math.round(next)))}`;
}

function appendDigit(digit: string) {
  const compact = currentValue.value === '0' ? '' : currentValue.value;
  const next = `${compact}${digit}`.slice(0, 3);
  setQuickValue(Number.parseInt(next || '0', 10));
}

function removeDigit() {
  const next = currentValue.value.slice(0, -1);
  setQuickValue(Number.parseInt(next || '0', 10));
}

function applyValue() {
  if (!canApply.value) return;
  const target = QUICK_TARGETS.find((entry) => entry.id === quickTarget.value);
  if (!target) return;

  const updates: Array<{
    path: string;
    value: number;
    attributeType: string;
    attributeName: string;
    attributeId: string;
    feature: ReturnType<typeof inferAttributeFeature>;
  }> = [];

  for (const fixtureName of selectedFixtureNames.value) {
    const mapped = dmx.showfileFixturesMapped.find((fixture) => fixture.fixtureName === fixtureName);
    if (!mapped) continue;

    const channel = mapped.def.channels.find((entry) => {
      const name = entry.name.toLowerCase();
      return target.aliases.some((alias) => name.includes(alias));
    });
    if (!channel?.reference?.path) continue;

    updates.push({
      path: channel.reference.path,
      value: valueAsNumber.value,
      attributeType: channel.type,
      attributeName: channel.name,
      attributeId: channel.attributeId ?? channel.name,
      feature: inferAttributeFeature(channel.type, channel.name),
    });
  }

  if (!updates.length) return;

  const deduped = new Map(updates.map((entry) => [entry.path, entry]));
  scratch.setChannels(Array.from(deduped.values()));
  engine.requestMerge();
}
</script>

<template>
  <div class="quick-programmer-window">
    <div class="quick-programmer-targets q-px-sm q-pt-xs">
      <q-btn-toggle
        v-info="'desk.quickProgrammer.target'"
        v-model="quickTarget"
        dense
        no-caps
        toggle-color="primary"
        spread
        :options="QUICK_TARGETS.map((target) => ({ label: target.label, value: target.id }))"
      />
    </div>

    <div class="quick-programmer-display q-pa-sm">
      <div class="quick-programmer-value">{{ valueAsNumber }}</div>
      <div class="quick-programmer-percent">{{ Math.round((valueAsNumber / 255) * 100) }}%</div>
    </div>

    <div class="quick-programmer-actions q-px-sm q-gutter-xs q-pb-sm">
      <q-btn v-info="'desk.quickProgrammer.valueOut'" dense flat label="Out" @click="setQuickValue(0)" />
      <q-btn v-info="'desk.quickProgrammer.valueHalf'" dense flat label="Half" @click="setQuickValue(128)" />
      <q-btn v-info="'desk.quickProgrammer.valueFull'" dense flat label="Full" @click="setQuickValue(255)" />
      <q-btn v-info="'desk.quickProgrammer.clear'" dense flat label="Clear" @click="setQuickValue(0)" />
    </div>

    <div class="quick-programmer-keypad q-px-sm q-pb-sm">
      <q-btn
        v-for="digit in ['7', '8', '9', '4', '5', '6', '1', '2', '3']"
        :key="digit"
        dense
        class="quick-programmer-key"
        :label="digit"
        @click="appendDigit(digit)"
      />
      <q-btn dense class="quick-programmer-key quick-programmer-key--back" icon="backspace" @click="removeDigit" />
      <q-btn dense class="quick-programmer-key" label="0" @click="appendDigit('0')" />
      <q-btn
        v-info="'desk.quickProgrammer.enter'"
        dense
        class="quick-programmer-key quick-programmer-key--enter"
        color="primary"
        label="Enter"
        :disable="!canApply"
        @click="applyValue"
      />
    </div>
  </div>
</template>

<style scoped>
.quick-programmer-window {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.quick-programmer-display {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  border-top: 1px solid var(--sdmx-color-border-subtle);
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
}

.quick-programmer-value {
  font-size: 32px;
  line-height: 1;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.quick-programmer-percent {
  font-size: 16px;
  color: var(--sdmx-color-text-muted);
  font-variant-numeric: tabular-nums;
}

.quick-programmer-actions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.quick-programmer-keypad {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--sdmx-space-xs);
  margin-top: auto;
}

.quick-programmer-key {
  min-height: var(--sdmx-space-touch);
  font-weight: 700;
}

.quick-programmer-key--back {
  min-height: var(--sdmx-space-touch);
}

.quick-programmer-key--enter {
  min-height: var(--sdmx-space-touch);
}
</style>
