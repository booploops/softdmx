/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { AttributeFeature } from "./attributes.ts";
import type { ConflictResolutionMode } from "./multi-user.ts";

export type ProgrammerEventKind =
  | "channel"
  | "channels"
  | "clear"
  | "store"
  | "marker"
  | "blind";

export type ScratchWriteSource =
  | "programmer"
  | "quick-programmer"
  | "attribute-control"
  | "api"
  | "cli"
  | "osc"
  | (string & {});

export interface ScratchWriteMeta {
  source: ScratchWriteSource;
  feature?: AttributeFeature;
  clientId?: string;
  operatorLabel?: string;
  color?: string;
  seq?: number;
}

export interface ProgrammerSessionEvent {
  tSec: number;
  kind: ProgrammerEventKind;
  path?: string;
  value?: number;
  channels?: Array<{ path: string; value: number; attributeType?: string }>;
  clientId?: string;
  meta?: ScratchWriteMeta;
  label?: string;
  presetId?: string;
  blind?: boolean;
}

export interface ProgrammerSession {
  id: string;
  name: string;
  anchorSec: number;
  startedAt: string;
  endedAt?: string;
  clock: "session" | "set-playhead" | "timecode" | "audio";
  events: ProgrammerSessionEvent[];
}

export interface StoreProfile {
  id: string;
  name: string;
  mode: "store" | "update" | "merge" | "remove";
  featureFilter?: AttributeFeature[];
  poolId?: string;
  poolSlot?: number;
  autoIncrementSlot?: boolean;
  activeOnly?: boolean;
}

export interface CustomFeatureGroup {
  id: string;
  label: string;
  features?: AttributeFeature[];
  channelNameIncludes?: string[];
}

export interface ProgrammerOperator {
  id: string;
  label: string;
  color?: string;
  priority?: number;
}

export interface ProgrammerMacroDefinition {
  id: string;
  name: string;
  template: string;
  params: string[];
}

export interface ProgrammerConfig {
  storeProfiles?: StoreProfile[];
  customFeatureGroups?: CustomFeatureGroup[];
  operators?: ProgrammerOperator[];
  conflictMode?: ConflictResolutionMode;
  macros?: ProgrammerMacroDefinition[];
  defaultStoreProfileId?: string;
}

export type ProgrammerLayoutMode = "scratch-first" | "controls-first" | "split";

export interface ProgrammerPaneOptions {
  defaultFeatureGroup?: string;
  layout?: ProgrammerLayoutMode;
  storeProfileId?: string;
  storeMode?: StoreProfile["mode"];
  quickTargets?: string[];
  showOnlyTouched?: boolean;
  autoActivateOnTouch?: boolean;
  autoArmSession?: boolean;
  recordGranularity?: "delta" | "keyframe" | "semantic";
  keyframeIdleMs?: number;
  applyOnDigit?: boolean;
}

export interface SessionRecordingPolicy {
  captureLastMs?: number;
  keyframeIdleMs?: number;
  semanticOnly?: boolean;
  chunkDurationSec?: number;
  coalesceMs?: number;
}
