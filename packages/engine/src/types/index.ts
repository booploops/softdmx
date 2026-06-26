/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type {
  OutputDestination,
  ShowMeta,
  FixturePosition,
  ShowFixture,
  ShowGroup,
  PresetTarget,
  Preset,
  ShowAudioConfig,
  ShowTimecodeConfig,
  TimecodeSource,
  ShowLinkSyncConfig,
  ShowOscSyncConfig,
  ShowTimelineAudioAsset,
  ShowTimelineConfig,
  TimelineSyncMode,
  ShowAudioMapping,
  ShowExecutor,
  ExecutorSlot,
  ShowSubmaster,
  PixelChannelOrder,
  PixelMapFixtureChannel,
  PixelMapDefinition,
  VideoInputKind,
  VideoSampleRegion,
  ShowVideoConfig,
  ShowDocumentVersion,
  ShowDocument,
} from "../show/document.ts";

export type {
  OutputDestination,
  ShowMeta,
  FixturePosition,
  ShowFixture,
  ShowGroup,
  PresetTarget,
  Preset,
  ShowAudioConfig,
  ShowTimecodeConfig,
  TimecodeSource,
  ShowLinkSyncConfig,
  ShowOscSyncConfig,
  ShowTimelineAudioAsset,
  ShowTimelineConfig,
  TimelineSyncMode,
  ShowAudioMapping,
  ShowExecutor,
  ExecutorSlot,
  ShowSubmaster,
  PixelChannelOrder,
  PixelMapFixtureChannel,
  PixelMapDefinition,
  VideoInputKind,
  VideoSampleRegion,
  ShowVideoConfig,
  ShowDocumentVersion,
  ShowDocument,
};

/** @deprecated Use ShowDocument */
export type ShowDocumentV1 = ShowDocument;
/** @deprecated Use ShowFixture */
export type ShowfileFixture = ShowFixture;
/** @deprecated Use ShowGroup */
export type ShowfileGroup = ShowGroup;

export type {
  DeskWindowType,
  DeskPane,
  DeskView,
  ShowDeskConfig,
  TouchControlType,
  TouchControl,
  TouchPage,
  ShowTouchConfig,
} from "./desk";
export { createEmptyShow } from "../show/document.ts";

export type {
  EasingType,
  RecordedFrame,
  CueLayer,
  StackStep,
  Cue,
  CuePlaybackState,
  CuePart,
} from "./cue";

export type {
  EffectTarget,
  EffectDefinition,
  SineEffect,
  SawEffect,
  StepEffect,
  ChaseEffect,
  PhaserEffect,
  RandomHoldEffect,
} from "./effects";

export type {
  BindingTargetType,
  BindingTarget,
  MidiMapping,
  OscMapping,
  ShowBindings,
} from "./bindings";

export type {
  ActiveChannel,
  FixtureChannelDefinition,
  FixtureSource,
  WidgetConfiguration,
  FixtureDefinition,
  FixtureChannelWithReference,
  MappedShowFixture,
} from "./fixture";

export type {
  AttributeFeature,
  AttributeMerge,
  AttributeId,
  AttributeDefinition,
  FixtureModeDefinition,
} from "./attributes";

export type { UniverseHealthStatus } from "./output-health";

/** @deprecated Use MappedShowFixture */
export type ShowfileFixtureMapped = import("./fixture").MappedShowFixture;
