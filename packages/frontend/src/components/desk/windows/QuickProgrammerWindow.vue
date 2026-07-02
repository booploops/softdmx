<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { DeskPane, ProgrammerPaneOptions } from '@softdmx/engine';
import { useDMXStore } from 'src/stores/dmx';
import { useSelectionStore } from 'src/stores/selection';
import { useShowStore } from 'src/stores/show';
import { useProgrammerStore } from 'src/stores/programmer';
import { useChannelControl } from 'src/composables/useChannelControl';
import { useActiveAttribute } from 'src/composables/useActiveAttribute';
import { SdmxButton, SdmxStatusChip } from 'src/components/ui';
import { useInfoText } from 'src/composables/useInfoText';

type QuickTarget = 'dimmer' | 'pan' | 'tilt' | 'red' | 'green' | 'blue' | 'white';

const props = defineProps<{ pane?: DeskPane }>();

const dmx = useDMXStore();
const selection = useSelectionStore();
const showStore = useShowStore();
const programmer = useProgrammerStore();
const { setChannel } = useChannelControl();
const { activeAttributeName } = useActiveAttribute();
const { info } = useInfoText();

const QUICK_TARGET_CATALOG: Array<{ id: QuickTarget; label: string; aliases: string[] }> = [
  { id: 'dimmer', label: 'Dim', aliases: ['dimmer', 'dimmer coarse', 'intensity', 'master dimmer'] },
  { id: 'pan', label: 'Pan', aliases: ['pan', 'pan coarse'] },
  { id: 'tilt', label: 'Tilt', aliases: ['tilt', 'tilt coarse'] },
  { id: 'red', label: 'Red', aliases: ['red', 'red coarse'] },
  { id: 'green', label: 'Green', aliases: ['green', 'green coarse'] },
  { id: 'blue', label: 'Blue', aliases: ['blue', 'blue coarse'] },
  { id: 'white', label: 'White', aliases: ['white', 'amber', 'mint', 'lime'] },
];

const paneOptions = computed(
  () => (props.pane?.options ?? {}) as ProgrammerPaneOptions
);

const quickTargets = computed(() => {
  const configured = paneOptions.value.quickTargets;
  if (!configured?.length) return QUICK_TARGET_CATALOG;
  return QUICK_TARGET_CATALOG.filter((target) => configured.includes(target.id));
});

const applyOnDigit = computed(() => paneOptions.value.applyOnDigit ?? true);
const showTargetPicker = ref(false);

const currentValue = ref('0');
const quickTarget = ref<QuickTarget>('dimmer');

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

const activeTargetLabel = computed(() => {
  const target = quickTargets.value.find((entry) => entry.id === quickTarget.value);
  return target?.label ?? quickTarget.value;
});

function inferQuickTargetFromName(name: string | null): QuickTarget | null {
  if (!name) return null;
  const lower = name.toLowerCase();
  const match = QUICK_TARGET_CATALOG.find((target) =>
    target.aliases.some((alias) => lower.includes(alias))
  );
  return match?.id ?? null;
}

const followsActiveAttribute = computed(() => {
  if (!activeAttributeName.value) return false;
  const inferred = inferQuickTargetFromName(activeAttributeName.value);
  return inferred === quickTarget.value;
});

watch(
  [activeAttributeName, quickTargets],
  ([name]) => {
    const inferred = inferQuickTargetFromName(name);
    if (inferred && quickTargets.value.some((target) => target.id === inferred)) {
      quickTarget.value = inferred;
    } else if (!quickTargets.value.some((target) => target.id === quickTarget.value)) {
      quickTarget.value = quickTargets.value[0]?.id ?? 'dimmer';
    }
  },
  { immediate: true }
);

watch(
  () => paneOptions.value.defaultFeatureGroup,
  (group) => {
    if (group && group !== programmer.activeFeatureGroup) {
      programmer.setFeatureGroup(group as typeof programmer.activeFeatureGroup);
    }
  },
  { immediate: true }
);

function setQuickValue(next: number, apply = false) {
  currentValue.value = `${Math.max(0, Math.min(255, Math.round(next)))}`;
  if (apply) {
    applyValue();
  }
}

function appendDigit(digit: string) {
  const compact = currentValue.value === '0' ? '' : currentValue.value;
  const next = `${compact}${digit}`.slice(0, 3);
  setQuickValue(Number.parseInt(next || '0', 10));
  if (applyOnDigit.value) {
    applyValue();
  }
}

function removeDigit() {
  const next = currentValue.value.slice(0, -1);
  setQuickValue(Number.parseInt(next || '0', 10));
  if (applyOnDigit.value) {
    applyValue();
  }
}

function applyValue() {
  if (!canApply.value) return;
  const target = quickTargets.value.find((entry) => entry.id === quickTarget.value);
  if (!target) return;

  for (const fixtureName of selectedFixtureNames.value) {
    const mapped = dmx.showfileFixturesMapped.find((fixture) => fixture.fixtureName === fixtureName);
    if (!mapped) continue;

    const channel = mapped.def.channels.find((entry) => {
      const name = entry.name.toLowerCase();
      return target.aliases.some((alias) => name.includes(alias));
    });
    if (!channel?.reference?.path) continue;

    setChannel(channel.reference.path, valueAsNumber.value, channel.type);
  }
}

function selectTarget(id: QuickTarget) {
  quickTarget.value = id;
  if (applyOnDigit.value && canApply.value) {
    applyValue();
  }
}
</script>

<template>
  <div class="quick-programmer-window">
    <div class="quick-programmer-hero">
      <div class="quick-programmer-hero__value">{{ valueAsNumber }}</div>
      <div class="quick-programmer-hero__meta">
        <span class="quick-programmer-hero__percent">{{ Math.round((valueAsNumber / 255) * 100) }}%</span>
        <SdmxStatusChip
          v-if="activeAttributeName"
          :label="activeAttributeName"
          variant="active"
        />
        <SdmxStatusChip
          v-else
          :label="activeTargetLabel"
          variant="active"
        />
      </div>
    </div>

    <div class="quick-programmer-presets">
      <button
        type="button"
        class="quick-programmer-preset"
        :data-sdmx-info="info('desk.quickProgrammer.valueOut')"
        @click="setQuickValue(0, true)"
      >
        Out
      </button>
      <button
        type="button"
        class="quick-programmer-preset"
        :data-sdmx-info="info('desk.quickProgrammer.valueHalf')"
        @click="setQuickValue(128, true)"
      >
        Half
      </button>
      <button
        type="button"
        class="quick-programmer-preset"
        :data-sdmx-info="info('desk.quickProgrammer.valueFull')"
        @click="setQuickValue(255, true)"
      >
        Full
      </button>
      <button
        type="button"
        class="quick-programmer-preset quick-programmer-preset--muted"
        :data-sdmx-info="info('desk.quickProgrammer.clear')"
        @click="setQuickValue(0, true)"
      >
        Clear
      </button>
    </div>

    <div class="quick-programmer-target-bar">
      <button
        type="button"
        class="quick-programmer-target-toggle"
        :data-sdmx-info="info('desk.quickProgrammer.target')"
        @click="showTargetPicker = !showTargetPicker"
      >
        <span class="sdmx-text-caption">Target</span>
        <span class="sdmx-text-label">{{ activeTargetLabel }}</span>
        <XIcon :name="showTargetPicker ? 'chevron-up' : 'chevron-down'" size="xs" />
      </button>
      <q-slide-transition>
        <div v-show="showTargetPicker || !followsActiveAttribute" class="quick-programmer-targets">
          <button
            v-for="target in quickTargets"
            :key="target.id"
            type="button"
            class="quick-programmer-target-chip"
            :class="{ 'quick-programmer-target-chip--active': quickTarget === target.id }"
            @click="selectTarget(target.id)"
          >
            {{ target.label }}
          </button>
        </div>
      </q-slide-transition>
    </div>

    <div class="quick-programmer-keypad">
      <SdmxButton
        v-for="digit in ['7', '8', '9', '4', '5', '6', '1', '2', '3']"
        :key="digit"
        :label="digit"
        variant="default"
        size="lg"
        class="quick-programmer-key"
        @click="appendDigit(digit)"
      />
      <SdmxButton
        icon="backspace"
        variant="ghost"
        size="lg"
        class="quick-programmer-key"
        @click="removeDigit"
      />
      <SdmxButton
        label="0"
        variant="default"
        size="lg"
        class="quick-programmer-key"
        @click="appendDigit('0')"
      />
      <SdmxButton
        label="Apply"
        variant="primary"
        size="lg"
        class="quick-programmer-key quick-programmer-key--apply"
        :disabled="!canApply"
        :info="info('desk.quickProgrammer.enter')"
        @click="applyValue"
      />
    </div>

    <p v-if="!canApply" class="quick-programmer-footnote sdmx-text-caption">
      Select fixtures to apply values
    </p>
  </div>
</template>

<style scoped>
.quick-programmer-window {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  background: var(--sdmx-color-bg-surface);
}

.quick-programmer-hero {
  flex-shrink: 0;
  padding: var(--sdmx-space-md) var(--sdmx-space-sm) var(--sdmx-space-sm);
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
}

.quick-programmer-hero__value {
  font-size: clamp(2.5rem, 8vw, 3.5rem);
  line-height: 1;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.quick-programmer-hero__meta {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-sm);
  margin-top: var(--sdmx-space-xs);
}

.quick-programmer-hero__percent {
  font-size: var(--sdmx-font-size-body);
  color: var(--sdmx-color-text-muted);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.quick-programmer-presets {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--sdmx-space-xs);
  padding: var(--sdmx-space-sm);
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
}

.quick-programmer-preset {
  min-height: var(--sdmx-space-touch);
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-sm);
  background: var(--sdmx-color-bg-elevated);
  color: var(--sdmx-color-text);
  font-size: var(--sdmx-font-size-caption);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    border-color: var(--sdmx-color-primary);
  }

  &--muted {
    color: var(--sdmx-color-text-muted);
  }
}

.quick-programmer-target-bar {
  flex-shrink: 0;
  padding: var(--sdmx-space-xs) var(--sdmx-space-sm);
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
}

.quick-programmer-target-toggle {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-sm);
  width: 100%;
  min-height: 32px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--sdmx-color-text);
  cursor: pointer;
  text-align: left;
}

.quick-programmer-targets {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sdmx-space-xs);
  padding-top: var(--sdmx-space-xs);
}

.quick-programmer-target-chip {
  min-height: 32px;
  padding: 0 var(--sdmx-space-sm);
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-full);
  background: var(--sdmx-color-bg-elevated);
  color: var(--sdmx-color-text-muted);
  font-size: var(--sdmx-font-size-caption);
  font-weight: 600;
  cursor: pointer;

  &--active {
    background: var(--sdmx-color-primary);
    border-color: var(--sdmx-color-primary);
    color: var(--sdmx-color-on-primary, #fff);
  }
}

.quick-programmer-keypad {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--sdmx-space-xs);
  padding: var(--sdmx-space-sm);
  align-content: start;
}

.quick-programmer-key {
  width: 100%;
  min-height: calc(var(--sdmx-space-touch) + 8px);
}

.quick-programmer-key--apply {
  grid-column: span 1;
}

.quick-programmer-footnote {
  flex-shrink: 0;
  margin: 0;
  padding: 0 var(--sdmx-space-sm) var(--sdmx-space-sm);
  text-align: center;
  color: var(--sdmx-color-text-muted);
}
</style>
