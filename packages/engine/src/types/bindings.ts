/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export type BindingTargetType =
  | "fixture_channel"
  | "group_master"
  | "cue_trigger"
  | "cue_stack_go"
  | "preset"
  | "blackout"
  | "grandmaster";

export interface BindingTarget {
  type: BindingTargetType;
  fixtureName?: string;
  channelIndex?: number;
  groupName?: string;
  cueId?: string;
  presetId?: string;
}

export interface MidiMapping {
  id: string;
  deviceName?: string;
  channel: number;
  controlType: "cc" | "note";
  controlNumber: number;
  target: BindingTarget;
}

export interface OscMapping {
  id: string;
  addressPattern: string;
  target: BindingTarget;
}

export interface ShowBindings {
  midi: MidiMapping[];
  osc: OscMapping[];
}
