<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import ChannelAttributeControl from 'src/components/ChannelAttributeControl.vue';
import { useScratchStore } from 'src/stores/scratch';
import { useCueStore } from 'src/stores/cue';
import { useOutputEngineStore } from 'src/stores/output-playback';
import { useSelectionStore } from 'src/stores/selection';
import { useUIStore } from 'src/stores/ui';
import { useProgrammerStore, PROGRAMMER_FEATURE_GROUPS } from 'src/stores/programmer';
import { useProgrammerSessionStore } from 'src/stores/programmer-session';
import { useClientIdentityStore } from 'src/stores/client-identity';
import { usePresetPoolStore } from 'src/stores/preset-pool';
import { useShowStore } from 'src/stores/show';
import { useDMXStore } from 'src/stores/dmx';
import { useChannelControl } from 'src/composables/useChannelControl';
import { useActiveAttribute } from 'src/composables/useActiveAttribute';
import { resolveDefaultStoreProfile } from 'src/utils/programmer-store-profile';
import { applyWingOffset, inferAttributeFeature, wingScaleForIndex } from '@softdmx/engine';
import type { AlignMode, ScratchEntry, WingDirection } from '@softdmx/engine';
import {
  SdmxButton,
  SdmxIconButton,
  SdmxStatusChip,
  SdmxToggle,
} from 'src/components/ui';
import { useInfoText } from 'src/composables/useInfoText';

const scratch = useScratchStore();
const cueStore = useCueStore();
const engine = useOutputEngineStore();
const selection = useSelectionStore();
const ui = useUIStore();
const programmer = useProgrammerStore();
const programmerSession = useProgrammerSessionStore();
const clientIdentity = useClientIdentityStore();
const presetPool = usePresetPoolStore();
const showStore = useShowStore();
const dmx = useDMXStore();
const { clearScratch, setChannel } = useChannelControl();
const { activeAttributeName, isPinned, setActive, togglePin, isActive, isPathPinned } =
  useActiveAttribute();
const { info } = useInfoText();

const filterSelection = ref(false);
const showSavePreset = ref(false);
const showStoreOptions = ref(false);
const showDistribution = ref(false);
const presetName = ref('');
const storePressTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const storeLongPressTriggered = ref(false);

const alignModeOptions: Array<{ label: string; value: AlignMode }> = [
  { label: 'None', value: 'none' },
  { label: 'Pan', value: 'pan' },
  { label: 'Tilt', value: 'tilt' },
  { label: 'X', value: 'x' },
  { label: 'Y', value: 'y' },
];

const wingDirectionOptions: Array<{ label: string; value: WingDirection }> = [
  { label: 'Out', value: 'out' },
  { label: 'In', value: 'in' },
  { label: 'Alt', value: 'alternate' },
];

const storeModeOptions = [
  { label: 'Store', value: 'store' },
  { label: 'Update', value: 'update' },
  { label: 'Merge', value: 'merge' },
  { label: 'Remove', value: 'remove' },
] as const;

const poolOptions = computed(() =>
  presetPool.pools.map((pool) => ({ label: pool.name, value: pool.id }))
);

const defaultStoreProfile = computed(() => resolveDefaultStoreProfile(showStore.document));

const showDistributionSection = computed(() => showDistribution.value);







function toggleBlind() {
  scratch.toggleBlind();
  engine.requestMerge();
}

function applyWingsToSelection(attributeName: string, baseValue: number) {
  const show = showStore.document;
  const fixtureNames = new Set<string>();
  for (const name of selection.selectedFixtures) fixtureNames.add(name);
  for (const groupName of selection.selectedGroups) {
    const group = show.groups.find((entry) => entry.name === groupName);
    for (const name of group?.fixtures ?? []) fixtureNames.add(name);
  }
  const fixtures = Array.from(fixtureNames);
  if (fixtures.length === 0) return;

  const wings = Math.max(0, selection.wings);
  fixtures.forEach((fixtureName, index) => {
    const mapped = dmx.showfileFixturesMapped.find((fixture) => fixture.fixtureName === fixtureName);
    const channel = mapped?.def.channels.find((entry) =>
      entry.name.toLowerCase().includes(attributeName.toLowerCase())
    );
    if (!channel?.reference?.path) return;
    const scale = wingScaleForIndex(index, fixtures.length, wings, selection.wingDirection);
    setChannel(channel.reference.path, applyWingOffset(baseValue, scale), channel.type);
  });
}

function applyDefaultStoreProfile() {
  const profile = defaultStoreProfile.value;
  const mode = profile?.mode ?? programmer.storeMode;
  const poolId = profile?.poolId ?? programmer.selectedPoolId;
  const poolSlot = profile?.poolSlot ?? programmer.selectedPoolSlot;
  const attributeFilter = profile?.featureFilter ?? programmer.attributeFilter();
  const name = presetName.value.trim() || profile?.name || `Preset ${Date.now()}`;

  cueStore.recordScratchAsPreset(name, {
    mode,
    attributeFilter,
    poolId,
    poolSlot,
  });
  presetName.value = '';
  showSavePreset.value = false;
  engine.requestMerge();
}

function saveAsPreset() {
  applyDefaultStoreProfile();
}

function onStorePressStart() {
  storeLongPressTriggered.value = false;
  storePressTimer.value = setTimeout(() => {
    storeLongPressTriggered.value = true;
    showSavePreset.value = true;
  }, 500);
}

function onStorePressEnd() {
  if (storePressTimer.value) {
    clearTimeout(storePressTimer.value);
    storePressTimer.value = null;
  }
  if (!storeLongPressTriggered.value) {
    applyDefaultStoreProfile();
  }
}


function onActiveChipTap() {
  if (!programmer.activeAttributePath) return;
  togglePin();
}



function selectFeatureGroup(id: (typeof PROGRAMMER_FEATURE_GROUPS)[number]['id']) {
  programmer.setFeatureGroup(id);
}
</script>

<template>
  <div class="programmer-window">
    <div v-if="ui.programmerCollapsed" class="programmer-collapsed row items-center q-px-sm q-py-xs">
      <XIcon v-if="scratch.isActive" name="circle-filled" color="white" size="xs" class="pulse" />
      <span class="sdmx-text-caption">{{ scratch.activeCount }} in scratch</span>
      <SdmxStatusChip
        :label="scratch.blindMode ? 'Blind' : 'Live'"
        :variant="scratch.blindMode ? 'warning' : 'positive'"
      />
      <q-space />
      <SdmxButton
        label="Expand"
        variant="ghost"
        size="sm"
        :info="info('desk.programmer.expand')"
        @click="ui.programmerCollapsed = false"
      />
    </div>

    <template v-else>
      <header class="programmer-header">
        <div class="programmer-header__toolbar">
          <SdmxStatusChip
            :label="scratch.blindMode ? 'Blind' : 'Live'"
            :variant="scratch.blindMode ? 'warning' : 'positive'"
          />
          <SdmxStatusChip
            v-if="programmerSession.armed"
            :label="programmerSession.clockLabel"
            variant="armed"
            icon="circle-filled"
            :info="info('desk.programmer.sessionClock')"
          />
          <SdmxStatusChip
            v-if="scratch.activeCount > 0"
            :label="`${scratch.activeCount} scratch`"
            variant="active"
          />
          <button
            v-if="activeAttributeName"
            type="button"
            class="programmer-active-chip-btn"
            :data-sdmx-info="info('desk.programmer.activeAttribute')"
            @click="onActiveChipTap"
          >
            <SdmxStatusChip
              :label="activeAttributeName"
              :variant="isPinned ? 'armed' : 'active'"
              icon="pin"
            />
          </button>

          <SdmxIconButton
            :icon="programmerSession.armed ? 'player-stop-filled' : 'player-record-filled'"
            :color="programmerSession.armed ? 'warning' : undefined"
            info-key="desk.programmer.armRecord"
            @click="programmerSession.armed ? programmerSession.disarm() : programmerSession.arm()"
          />
          <SdmxIconButton
            icon="flag"
            info-key="desk.programmer.dropMarker"
            :disable="!programmerSession.armed"
            @click="programmerSession.dropMarker()"
          />
          <SdmxIconButton
            icon="eye-off"
            info-key="desk.programmer.blind"
            :color="scratch.blindMode ? 'warning' : undefined"
            @click="toggleBlind"
          />
          <SdmxIconButton
            icon="arrow-back-up"
            info-key="desk.programmer.undo"
            :disable="!scratch.canUndo"
            @click="scratch.undo()"
          />
          <SdmxIconButton
            icon="arrow-forward-up"
            info-key="desk.programmer.redo"
            :disable="!scratch.canRedo"
            @click="scratch.redo()"
          />
          <SdmxIconButton
            icon="circle-dot"
            info-key="desk.programmer.record"
            @click="cueStore.recordFrame()"
          />
          <SdmxButton
            label="Store"
            variant="primary"
            size="sm"
            class="programmer-store-btn"
            :info="info('desk.programmer.store')"
            @mousedown="onStorePressStart"
            @mouseup="onStorePressEnd"
            @mouseleave="onStorePressEnd"
            @touchstart.prevent="onStorePressStart"
            @touchend.prevent="onStorePressEnd"
            @touchcancel.prevent="onStorePressEnd"
          />
          <SdmxIconButton
            icon="trash-x"
            info-key="desk.programmer.clear"
            @click="clearScratch"
          />
          <SdmxIconButton
            icon="chevron-down"
            info-key="desk.programmer.collapse"
            @click="ui.programmerCollapsed = true"
          />
        </div>
      </header>

      <div class="programmer-feature-strip">
        <button
          v-for="group in PROGRAMMER_FEATURE_GROUPS"
          :key="group.id"
          type="button"
          class="programmer-feature-chip"
          :class="{ 'programmer-feature-chip--active': programmer.activeFeatureGroup === group.id }"
          :data-sdmx-info="info('desk.programmer.featureGroup')"
          @click="selectFeatureGroup(group.id)"
        >
          {{ group.label }}
        </button>
      </div>

      <div class="programmer-filter-strip">
        <SdmxToggle
          v-model="filterSelection"
          label="Sel"
          :info="info('desk.programmer.filterSelection')"
        />
        <SdmxToggle
          v-model="programmer.scratchedOnly"
          label="Touched"
          :info="info('desk.programmer.scratchedOnly')"
        />
        <SdmxToggle
          v-model="programmer.activeOnly"
          label="Active"
          :info="info('desk.programmer.activeOnly')"
        />
        <div class="programmer-filter-strip__scope">
          <button
            type="button"
            class="programmer-scope-chip"
            :class="{ 'programmer-scope-chip--active': programmer.operatorScope === 'all' }"
            @click="programmer.operatorScope = 'all'"
          >
            All
          </button>
          <button
            type="button"
            class="programmer-scope-chip"
            :class="{ 'programmer-scope-chip--active': programmer.operatorScope === 'mine' }"
            @click="programmer.operatorScope = 'mine'"
          >
            Mine
          </button>
        </div>
        <q-space />
        <SdmxButton
          :label="showStoreOptions ? 'Store ▴' : 'Store ▾'"
          variant="ghost"
          size="sm"
          @click="showStoreOptions = !showStoreOptions"
        />
        <SdmxButton
          v-if="programmer.activeFeatureGroup === 'position' || selection.hasSelection"
          :label="showDistribution ? 'Wings ▴' : 'Wings ▾'"
          variant="ghost"
          size="sm"
          @click="showDistribution = !showDistribution"
        />
      </div>

      <q-slide-transition>
        <div v-show="showStoreOptions" class="programmer-drawer">
          <q-btn-toggle
            v-info="'desk.programmer.storeMode'"
            v-model="programmer.storeMode"
            dense
            no-caps
            toggle-color="secondary"
            :options="storeModeOptions.map((option) => ({ label: option.label, value: option.value }))"
          />
          <q-select
            v-info="'desk.programmer.pool'"
            v-model="programmer.selectedPoolId"
            dense
            outlined
            emit-value
            map-options
            :options="poolOptions"
            label="Preset pool"
            class="programmer-drawer__field"
          />
          <q-input
            v-info="'desk.programmer.slot'"
            v-model.number="programmer.selectedPoolSlot"
            dense
            outlined
            type="number"
            min="0"
            label="Preset slot"
            class="programmer-drawer__field programmer-drawer__field--slot"
          />
        </div>
      </q-slide-transition>

      <q-slide-transition>
        <div v-show="showDistributionSection" class="programmer-drawer programmer-drawer--distribution">
          <q-select
            v-info="'desk.programmer.align'"
            v-model="selection.alignMode"
            dense
            outlined
            emit-value
            map-options
            :options="alignModeOptions"
            label="Align"
            class="programmer-drawer__field"
          />
          <q-input
            v-info="'desk.programmer.wings'"
            v-model.number="selection.wings"
            dense
            outlined
            type="number"
            min="0"
            label="Wings"
            class="programmer-drawer__field programmer-drawer__field--slot"
          />
          <q-select
            v-info="'desk.programmer.wingDirection'"
            v-model="selection.wingDirection"
            dense
            outlined
            emit-value
            map-options
            :options="wingDirectionOptions"
            label="Dir"
            class="programmer-drawer__field"
          />
          <SdmxButton
            label="@128"
            variant="ghost"
            size="sm"
            :info="info('desk.programmer.applyWings')"
            @click="applyWingsToSelection('Pan', 128)"
          />
        </div>
      </q-slide-transition>
    </template>
  </div>

  <q-dialog v-model="showSavePreset">
    <q-card style="min-width: 320px">
      <q-card-section class="text-h6">Programmer Store</q-card-section>
      <q-card-section class="q-gutter-sm">
        <q-input v-model="presetName" label="Preset name" autofocus @keyup.enter="saveAsPreset" />
        <div class="text-caption text-grey-5">
          Mode: {{ defaultStoreProfile?.mode ?? programmer.storeMode }} · Group:
          {{ programmer.activeFeatureGroup }} · Preset slot
          {{ defaultStoreProfile?.poolSlot ?? programmer.selectedPoolSlot }}
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Cancel" v-close-popup />
        <q-btn flat label="Apply" color="primary" @click="saveAsPreset" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped lang="scss">
.programmer-window {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: var(--sdmx-color-bg-surface);
}

.programmer-collapsed {
  flex-shrink: 0;
}

.programmer-header {
  flex-shrink: 0;
  padding: var(--sdmx-space-xs) var(--sdmx-space-sm);
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
}

.programmer-header__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px var(--sdmx-space-xs);
}

.programmer-store-btn {
  min-height: var(--sdmx-space-touch);
}

.programmer-feature-strip {
  flex-shrink: 0;
  display: flex;
  gap: var(--sdmx-space-xs);
  padding: var(--sdmx-space-xs) var(--sdmx-space-sm);
  overflow-x: auto;
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.programmer-feature-chip {
  flex-shrink: 0;
  min-height: var(--sdmx-space-touch);
  padding: 0 var(--sdmx-space-md);
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-full);
  background: var(--sdmx-color-bg-elevated);
  color: var(--sdmx-color-text-muted);
  font-size: var(--sdmx-font-size-caption);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;

  &--active {
    background: var(--sdmx-color-primary);
    border-color: var(--sdmx-color-primary);
    color: var(--sdmx-color-on-primary, #fff);
  }
}

.programmer-filter-strip {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sdmx-space-sm);
  padding: var(--sdmx-space-xs) var(--sdmx-space-sm);
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
}

.programmer-filter-strip__scope {
  display: inline-flex;
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-sm);
  overflow: hidden;
}

.programmer-scope-chip {
  min-height: 32px;
  padding: 0 var(--sdmx-space-sm);
  border: none;
  background: transparent;
  color: var(--sdmx-color-text-muted);
  font-size: var(--sdmx-font-size-caption);
  font-weight: 600;
  cursor: pointer;

  &--active {
    background: var(--sdmx-color-bg-elevated);
    color: var(--sdmx-color-text);
  }

  & + & {
    border-left: 1px solid var(--sdmx-color-border-subtle);
  }
}

.programmer-drawer {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sdmx-space-sm);
  padding: var(--sdmx-space-sm);
  background: var(--sdmx-color-bg-elevated);
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
}

.programmer-drawer__field {
  min-width: 110px;
  flex: 1 1 110px;
}

.programmer-drawer__field--slot {
  max-width: 90px;
  flex: 0 1 90px;
}

.programmer-active-chip-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.programmer-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.programmer-scratch-section {
  flex-shrink: 0;
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
}

.programmer-scratch-header {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-sm);
  padding: var(--sdmx-space-sm);
  position: sticky;
  top: 0;
  background: var(--sdmx-color-bg-surface);
  z-index: 1;
}

.programmer-conflicts {
  padding: 0 var(--sdmx-space-sm) var(--sdmx-space-sm);
}

.programmer-scratch-list {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-xs);
  padding: 0 var(--sdmx-space-sm) var(--sdmx-space-sm);
}

.programmer-scratch-row {
  display: grid;
  grid-template-columns: auto 1fr minmax(120px, 2fr);
  align-items: center;
  gap: var(--sdmx-space-sm);
  padding: var(--sdmx-space-xs) var(--sdmx-space-sm);
  min-height: var(--sdmx-space-touch);
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-sm);
  background: var(--sdmx-color-bg-elevated);
  cursor: pointer;
}

.programmer-scratch-row--active {
  border-color: var(--sdmx-color-active);
  box-shadow: inset 3px 0 0 var(--sdmx-color-active);
}

.programmer-scratch-row--pinned {
  border-color: var(--sdmx-color-armed);
  box-shadow: inset 3px 0 0 var(--sdmx-color-armed);
}

.programmer-scratch-row--conflict {
  background: color-mix(in srgb, var(--sdmx-color-warning), transparent 88%);
}

.programmer-scratch-row--untouched {
  opacity: 0.85;
  border-style: dashed;
}

.programmer-operator-chip {
  width: 10px;
  height: 10px;
  border-radius: var(--sdmx-radius-full);
  border: 1px solid color-mix(in srgb, var(--sdmx-color-text) 20%, transparent);
}

.programmer-scratch-row__name {
  font-weight: 600;
  font-size: var(--sdmx-font-size-body);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.programmer-scratch-row__control {
  min-width: 0;
}

.pulse {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}
</style>
