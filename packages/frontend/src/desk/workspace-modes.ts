/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { TooltipKey } from 'src/lib/info-text';

export type WorkspaceMode = 'live' | 'program' | 'timeline' | 'setup';

export type SetupSection = 'patch' | 'showfile' | 'video';

export type ProgramSection = 'executors' | 'presets' | 'effects' | 'cues' | 'audio' | 'touch';

export const WORKSPACE_MODE_META: Record<WorkspaceMode, { label: string; icon: string; infoKey: TooltipKey }> = {
  live: { label: 'Live', icon: 'play_circle', infoKey: 'desk.workspaceModes.live' },
  program: { label: 'Program', icon: 'edit_note', infoKey: 'desk.workspaceModes.program' },
  timeline: { label: 'Timeline', icon: 'timeline', infoKey: 'desk.workspaceModes.timeline' },
  setup: { label: 'Setup', icon: 'build', infoKey: 'desk.workspaceModes.setup' },
};

export const SETUP_SECTION_META: Record<SetupSection, { label: string; icon: string; infoKey: TooltipKey }> = {
  patch: { label: 'Patch', icon: 'settings_ethernet', infoKey: 'desk.setupSections.patch' },
  video: { label: 'Video', icon: 'videocam', infoKey: 'desk.setupSections.video' },
  showfile: { label: 'Show', icon: 'folder_open', infoKey: 'desk.setupSections.showfile' },
};

export const PROGRAM_SECTION_META: Record<ProgramSection, { label: string; icon: string; infoKey: TooltipKey }> = {
  executors: { label: 'Executors', icon: 'grid_view', infoKey: 'desk.programSections.executors' },
  presets: { label: 'Presets', icon: 'palette', infoKey: 'desk.programSections.presets' },
  effects: { label: 'Effects', icon: 'auto_awesome', infoKey: 'desk.programSections.effects' },
  cues: { label: 'Cues', icon: 'theater_comedy', infoKey: 'desk.programSections.cues' },
  audio: { label: 'Audio', icon: 'graphic_eq', infoKey: 'desk.programSections.audio' },
  touch: { label: 'Touch', icon: 'touch_app', infoKey: 'desk.programSections.touch' },
};

export const QUICK_ACCESS_WORKSPACE_MODES = ['live', 'timeline', 'program', 'setup'] as const satisfies readonly WorkspaceMode[];

export const DESK_WINDOW_META: Record<string, { label: string; icon: string }> = {
  'fixture-sheet': { label: 'Fixture Sheet', icon: 'view_module' },
  groups: { label: 'Groups', icon: 'group_work' },
  widgets: { label: 'Widgets', icon: 'widgets' },
  programmer: { label: 'Programmer', icon: 'memory' },
  'quick-programmer': { label: 'Quick Programmer', icon: 'dialpad' },
  plot: { label: 'Plot', icon: 'map' },
  presets: { label: 'Presets', icon: 'palette' },
  'attribute-control': { label: 'Attributes', icon: 'tune' },
  'playback-rail': { label: 'Playback', icon: 'view_stream' },
};
