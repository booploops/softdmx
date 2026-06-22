/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type {
  DeskPane,
  DeskView,
  ShowDeskConfig,
  ShowTouchConfig,
  TouchControl,
  TouchPage,
} from '../types/desk.ts';
import type { ShowDocument } from 'src/show/document';

export const DESK_GRID_COLS = 12;

export const DEFAULT_DESK_VIEWS: DeskView[] = [
  {
    id: 'busking',
    name: 'Busking',
    panes: [
      {
        id: 'busking-fixture-sheet',
        windowType: 'fixture-sheet',
        rect: { x: 0, y: 0, w: 8, h: 7 },
      },
      {
        id: 'busking-groups',
        windowType: 'groups',
        rect: { x: 8, y: 0, w: 4, h: 7 },
      },
      {
        id: 'busking-programmer',
        windowType: 'programmer',
        rect: { x: 0, y: 7, w: 12, h: 5 },
      },
    ],
  },
  {
    id: 'focus',
    name: 'Focus',
    panes: [
      {
        id: 'focus-widgets',
        windowType: 'widgets',
        rect: { x: 0, y: 0, w: 8, h: 12 },
      },
      {
        id: 'focus-programmer',
        windowType: 'programmer',
        rect: { x: 8, y: 0, w: 4, h: 12 },
      },
    ],
  },
  {
    id: 'plot',
    name: 'Plot',
    panes: [
      {
        id: 'plot-view',
        windowType: 'plot',
        rect: { x: 0, y: 0, w: 8, h: 12 },
      },
      {
        id: 'plot-groups',
        windowType: 'groups',
        rect: { x: 8, y: 0, w: 4, h: 12 },
      },
    ],
  },
  {
    id: 'playback',
    name: 'Playback',
    panes: [
      {
        id: 'playback-presets',
        windowType: 'presets',
        rect: { x: 0, y: 0, w: 7, h: 12 },
      },
      {
        id: 'playback-fixture-sheet',
        windowType: 'fixture-sheet',
        rect: { x: 7, y: 0, w: 5, h: 12 },
      },
    ],
  },
];

export function createDefaultDeskConfig(): ShowDeskConfig {
  return {
    defaultViewId: 'busking',
    views: DEFAULT_DESK_VIEWS.map((view) => ({
      ...view,
      panes: view.panes.map((pane) => ({ ...pane, rect: { ...pane.rect } })),
    })),
  };
}

export function validateDeskPane(pane: DeskPane): boolean {
  const { x, y, w, h } = pane.rect;
  if (w <= 0 || h <= 0) return false;
  if (x < 0 || y < 0) return false;
  if (x + w > DESK_GRID_COLS) return false;
  return Boolean(pane.id && pane.windowType);
}

export function validateDeskView(view: DeskView): boolean {
  if (!view.id || !view.name) return false;
  if (!view.panes.length) return false;
  return view.panes.every(validateDeskPane);
}

export interface DeskRowBand {
  start: number;
  height: number;
}

export function buildDeskRowBands(panes: DeskPane[]): DeskRowBand[] {
  if (!panes.length) return [{ start: 0, height: 1 }];

  const bandStarts = [...new Set(panes.map((pane) => pane.rect.y))].sort((a, b) => a - b);
  const maxEnd = Math.max(...panes.map((pane) => pane.rect.y + pane.rect.h));

  return bandStarts.map((start, index) => ({
    start,
    height: (index + 1 < bandStarts.length ? bandStarts[index + 1]! : maxEnd) - start,
  }));
}

export function deskPaneBandSpan(pane: DeskPane, bands: DeskRowBand[], bandIndex: number): number {
  const paneEnd = pane.rect.y + pane.rect.h;
  let span = 0;
  for (let index = bandIndex; index < bands.length; index += 1) {
    const band = bands[index]!;
    span += 1;
    if (band.start + band.height >= paneEnd) break;
  }
  return Math.max(1, span);
}

export function deskPaneGridPlacement(pane: DeskPane, bands: DeskRowBand[]): { row: string; column: string } {
  const bandIndex = bands.findIndex((band) => band.start === pane.rect.y);
  const column = `${pane.rect.x + 1} / span ${pane.rect.w}`;
  if (bandIndex < 0) {
    return {
      column,
      row: `1 / span ${bands.length}`,
    };
  }
  return {
    column,
    row: `${bandIndex + 1} / span ${deskPaneBandSpan(pane, bands, bandIndex)}`,
  };
}

function defaultTouchControls(doc: ShowDocument): TouchControl[] {
  const controls: TouchControl[] = [
    {
      id: 'touch-gm',
      type: 'grand-master',
      rect: { x: 0, y: 0, w: 6, h: 1 },
      label: 'GM',
    },
    {
      id: 'touch-blackout',
      type: 'blackout',
      rect: { x: 6, y: 0, w: 3, h: 1 },
      label: 'Blackout',
    },
    {
      id: 'touch-audio',
      type: 'audio-meter',
      rect: { x: 9, y: 0, w: 3, h: 1 },
      label: 'Audio',
    },
  ];

  let row = 1;
  doc.presets.slice(0, 8).forEach((preset, index) => {
    const col = (index % 2) * 6;
    if (index > 0 && index % 2 === 0) row += 1;
    controls.push({
      id: `touch-preset-${preset.id}`,
      type: 'preset-button',
      presetId: preset.id,
      color: preset.color,
      label: preset.name,
      rect: { x: col, y: row, w: 6, h: 1 },
    });
  });

  const executor = doc.executors?.[0];
  const slots = executor?.slots.filter((slot) => slot.page === (executor.activePage ?? 1)) ?? [];
  row += 2;
  slots.slice(0, 4).forEach((slot, index) => {
    controls.push({
      id: `touch-slot-${slot.id}`,
      type: 'executor-button',
      slotId: slot.id,
      label: slot.name,
      rect: { x: index * 3, y: row, w: 3, h: 1 },
    });
  });

  return controls;
}

export function createDefaultTouchConfig(doc: ShowDocument): ShowTouchConfig {
  const page: TouchPage = {
    id: 'main',
    name: 'Main',
    cols: 12,
    rows: 12,
    controls: defaultTouchControls(doc),
  };
  return {
    defaultPageId: page.id,
    pages: [page],
  };
}
