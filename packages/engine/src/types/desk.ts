/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export type DeskWindowType =
  | "fixture-sheet"
  | "groups"
  | "widgets"
  | "programmer"
  | "quick-programmer"
  | "plot"
  | "presets"
  | "attribute-control"
  | "playback-rail";

export interface DeskPaneRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DeskPane {
  id: string;
  windowType: DeskWindowType;
  rect: DeskPaneRect;
  options?: Record<string, unknown>;
}

export interface DeskView {
  id: string;
  name: string;
  panes: DeskPane[];
}

export interface ShowDeskConfig {
  defaultViewId: string;
  views: DeskView[];
}

export type TouchControlType =
  | "preset-button"
  | "executor-button"
  | "grand-master"
  | "blackout"
  | "cue-go"
  | "audio-meter";

export interface TouchControlRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TouchControl {
  id: string;
  type: TouchControlType;
  rect: TouchControlRect;
  presetId?: string;
  slotId?: string;
  cueId?: string;
  color?: string;
  label?: string;
}

export interface TouchPage {
  id: string;
  name: string;
  cols: number;
  rows: number;
  controls: TouchControl[];
}

export interface ShowTouchConfig {
  pages: TouchPage[];
  defaultPageId?: string;
}
