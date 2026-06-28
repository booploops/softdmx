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
import { SIDEBAR_SHORTCUTS, type SidebarShortcutId } from 'src/lib/sidebar-shortcuts';

export type AppDialog = 'cueEditor';
export type SidebarShortcutOpenMode = 'current-workspace' | 'new-workspace';
export type SidebarShortcutNewWorkspacePolicy = 'always-new' | 'reuse-existing';

const OPERATE_LOCKED_KEY = 'softdmx-operate-locked';
const SIDEBAR_SHORTCUTS_KEY = 'softdmx-sidebar-shortcuts';
const SIDEBAR_SHORTCUT_OPEN_MODE_KEY = 'softdmx-sidebar-shortcut-open-mode';
const SIDEBAR_SHORTCUT_NEW_WORKSPACE_POLICY_KEY = 'softdmx-sidebar-shortcut-new-workspace-policy';

function readOperateLocked(): boolean {
  if (typeof localStorage === 'undefined') return true;
  const stored = localStorage.getItem(OPERATE_LOCKED_KEY);
  if (stored === null) return true;
  return stored === 'true';
}

function readSidebarShortcutIds(): SidebarShortcutId[] {
  if (typeof localStorage === 'undefined') return [];
  const stored = localStorage.getItem(SIDEBAR_SHORTCUTS_KEY);
  if (!stored) return [];

  const validIds = new Set<string>(SIDEBAR_SHORTCUTS.map((shortcut) => shortcut.id));

  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is SidebarShortcutId => typeof value === 'string' && validIds.has(value));
  } catch {
    return [];
  }
}

function readSidebarShortcutOpenMode(): SidebarShortcutOpenMode {
  if (typeof localStorage === 'undefined') return 'new-workspace';
  const stored = localStorage.getItem(SIDEBAR_SHORTCUT_OPEN_MODE_KEY);
  return stored === 'current-workspace' || stored === 'new-workspace'
    ? stored
    : 'new-workspace';
}

function readSidebarShortcutNewWorkspacePolicy(): SidebarShortcutNewWorkspacePolicy {
  if (typeof localStorage === 'undefined') return 'always-new';
  const stored = localStorage.getItem(SIDEBAR_SHORTCUT_NEW_WORKSPACE_POLICY_KEY);
  return stored === 'always-new' || stored === 'reuse-existing'
    ? stored
    : 'always-new';
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
  const infoMode = ref(false);
  const commandLineOpen = ref(false);
  const attributePanelOpen = ref(false);
  const sidebarShortcutIds = ref<SidebarShortcutId[]>(readSidebarShortcutIds());
  const sidebarShortcutOpenMode = ref<SidebarShortcutOpenMode>(readSidebarShortcutOpenMode());
  const sidebarShortcutNewWorkspacePolicy = ref<SidebarShortcutNewWorkspacePolicy>(readSidebarShortcutNewWorkspacePolicy());
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

  function toggleInfoMode(force?: boolean) {
    infoMode.value = force ?? !infoMode.value;
  }

  function toggleCommandLine(force?: boolean) {
    commandLineOpen.value = force ?? !commandLineOpen.value;
  }

  function toggleAttributePanel(force?: boolean) {
    attributePanelOpen.value = force ?? !attributePanelOpen.value;
  }

  function setSidebarShortcutIds(ids: SidebarShortcutId[]) {
    const validIds = new Set<SidebarShortcutId>(SIDEBAR_SHORTCUTS.map((shortcut) => shortcut.id));
    const deduped = Array.from(new Set(ids.filter((id): id is SidebarShortcutId => validIds.has(id))));
    sidebarShortcutIds.value = deduped;

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SIDEBAR_SHORTCUTS_KEY, JSON.stringify(deduped));
    }
  }

  function toggleSidebarShortcut(id: SidebarShortcutId, force?: boolean) {
    const has = sidebarShortcutIds.value.includes(id);
    const next = force ?? !has;
    if (next === has) return;

    if (next) {
      setSidebarShortcutIds([...sidebarShortcutIds.value, id]);
    } else {
      setSidebarShortcutIds(sidebarShortcutIds.value.filter((value) => value !== id));
    }
  }

  function setSidebarShortcutOpenMode(mode: SidebarShortcutOpenMode) {
    sidebarShortcutOpenMode.value = mode;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SIDEBAR_SHORTCUT_OPEN_MODE_KEY, mode);
    }
  }

  function setSidebarShortcutNewWorkspacePolicy(policy: SidebarShortcutNewWorkspacePolicy) {
    sidebarShortcutNewWorkspacePolicy.value = policy;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SIDEBAR_SHORTCUT_NEW_WORKSPACE_POLICY_KEY, policy);
    }
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
    infoMode,
    commandLineOpen,
    attributePanelOpen,
    sidebarShortcutIds,
    sidebarShortcutOpenMode,
    sidebarShortcutNewWorkspacePolicy,
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
    toggleInfoMode,
    toggleCommandLine,
    toggleAttributePanel,
    setSidebarShortcutIds,
    toggleSidebarShortcut,
    setSidebarShortcutOpenMode,
    setSidebarShortcutNewWorkspacePolicy,
  };
});
