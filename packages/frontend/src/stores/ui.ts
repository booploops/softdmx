/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import type { ProgramSection, SetupSection, WorkspaceMode } from 'src/desk/workspace-modes';

export type AppDialog = 'cueEditor';

const OPERATE_LOCKED_KEY = 'softdmx-operate-locked';

function readOperateLocked(): boolean {
  if (typeof localStorage === 'undefined') return true;
  const stored = localStorage.getItem(OPERATE_LOCKED_KEY);
  if (stored === null) return true;
  return stored === 'true';
}

export const useUIStore = defineStore('ui', () => {
  const mode = ref<WorkspaceMode>('live');
  const setupSection = ref<SetupSection>('patch');
  const programSection = ref<ProgramSection>('executors');
  const widgetsViewMode = ref<'groups' | 'individual'>('groups');
  const leftDrawerOpen = ref(false);
  const operateLocked = ref(readOperateLocked());
  const programmerCollapsed = ref(false);
  const cueBarCollapsed = ref(false);
  const dialogs = ref<Record<AppDialog, boolean>>({
    cueEditor: false,
  });

  const isLive = computed(() => mode.value === 'live');
  const isProgram = computed(() => mode.value === 'program');
  const isTimeline = computed(() => mode.value === 'timeline');
  const isSetup = computed(() => mode.value === 'setup');

  function setMode(nextMode: WorkspaceMode) {
    mode.value = nextMode;
  }

  function setSetupSection(section: SetupSection) {
    setupSection.value = section;
    mode.value = 'setup';
  }

  function setProgramSection(section: ProgramSection) {
    programSection.value = section;
    mode.value = 'program';
  }

  function toggleOperateLock(force?: boolean) {
    operateLocked.value = force ?? !operateLocked.value;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(OPERATE_LOCKED_KEY, operateLocked.value ? 'true' : 'false');
    }
  }

  function toggleLeftDrawer(force?: boolean) {
    leftDrawerOpen.value = force ?? !leftDrawerOpen.value;
  }

  function openDialog(name: AppDialog) {
    dialogs.value[name] = true;
    leftDrawerOpen.value = false;
  }

  function closeDialog(name: AppDialog) {
    dialogs.value[name] = false;
  }

  function setWidgetsViewMode(next: 'groups' | 'individual') {
    widgetsViewMode.value = next;
  }

  return {
    mode,
    setupSection,
    programSection,
    widgetsViewMode,
    leftDrawerOpen,
    operateLocked,
    programmerCollapsed,
    cueBarCollapsed,
    dialogs,
    isLive,
    isProgram,
    isTimeline,
    isSetup,
    setMode,
    setSetupSection,
    setProgramSection,
    toggleOperateLock,
    toggleLeftDrawer,
    openDialog,
    closeDialog,
    setWidgetsViewMode,
  };
});
