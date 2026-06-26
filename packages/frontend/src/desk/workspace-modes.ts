/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export type WorkspaceMode = 'live' | 'program' | 'timeline' | 'setup';

export type SetupSection = 'patch' | 'showfile' | 'video';

export type ProgramSection = 'executors' | 'presets' | 'effects' | 'cues' | 'audio' | 'touch';

export const WORKSPACE_MODE_META: Record<WorkspaceMode, { label: string; icon: string }> = {
  live: { label: 'Live', icon: 'play_circle' },
  program: { label: 'Program', icon: 'edit_note' },
  timeline: { label: 'Timeline', icon: 'timeline' },
  setup: { label: 'Setup', icon: 'build' },
};

export const SETUP_SECTION_META: Record<SetupSection, { label: string; icon: string }> = {
  patch: { label: 'Patch', icon: 'settings_ethernet' },
  video: { label: 'Video', icon: 'videocam' },
  showfile: { label: 'Show', icon: 'folder_open' },
};

export const PROGRAM_SECTION_META: Record<ProgramSection, { label: string; icon: string }> = {
  executors: { label: 'Executors', icon: 'grid_view' },
  presets: { label: 'Presets', icon: 'palette' },
  effects: { label: 'Effects', icon: 'auto_awesome' },
  cues: { label: 'Cues', icon: 'theater_comedy' },
  audio: { label: 'Audio', icon: 'graphic_eq' },
  touch: { label: 'Touch', icon: 'touch_app' },
};

export const QUICK_ACCESS_WORKSPACE_MODES = ['live', 'timeline', 'program', 'setup'] as const satisfies readonly WorkspaceMode[];

export const DESK_WINDOW_META: Record<string, { label: string; icon: string }> = {
  'fixture-sheet': { label: 'Fixture Sheet', icon: 'view_module' },
  groups: { label: 'Groups', icon: 'group_work' },
  widgets: { label: 'Widgets', icon: 'widgets' },
  programmer: { label: 'Programmer', icon: 'memory' },
  plot: { label: 'Plot', icon: 'map' },
  presets: { label: 'Presets', icon: 'palette' },
  'attribute-control': { label: 'Attributes', icon: 'tune' },
};
