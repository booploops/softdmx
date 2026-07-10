/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ShowBindings } from "../types/bindings";
import type { Cue } from "../types/cue";
import type { TimelineMarker, TimelineSection, TimelineTrack } from "../types/cue";
import type { ShowDeskConfig, ShowTouchConfig } from "../types/desk";
import type { ProgrammerConfig, ProgrammerSession } from "../types/programmer.ts";
import type { EffectDefinition } from "../types/effects";

export interface OutputDestination {
  id: string;
  name: string;
  type: "gridnode" | "artnet" | "sacn" | "dmx_usb";
  role?: "primary" | "standby";
  failoverGroup?: string;
  settings: {
    Host?: string;
    Port?: number;
    Universe?: number;
    Net?: number;
    Subnet?: number;
    PortPath?: string;
    UsbProtocol?: "enttec_pro" | "open_dmx";
  };
}

export interface ShowMeta {
  name: string;
  created: string;
  modified: string;
  sessionEpoch?: number;
  modifiedBy?: string;
  lock?: {
    holder: string;
    expires: string;
    scope: "show" | "patch" | "cues";
  };
}

export interface FixturePosition {
  x?: number;
  y?: number;
  z?: number;
  pan?: number;
  tilt?: number;
}

export interface ShowFixture {
  name: string;
  fixtureId: string;
  modeId?: string;
  outputDestinationId?: string;
  startingChannel?: number;
  position?: FixturePosition;
}

export interface ShowGroup {
  name: string;
  fixtures: string[];
  color?: string;
}

export interface PresetTarget {
  fixtures?: string[];
  group?: string;
  attrs: Record<string, number>;
}

export interface Preset {
  id: string;
  name: string;
  color?: string;
  targets: PresetTarget[];
  poolId?: string;
  slotIndex?: number;
}

export type PresetPoolKind = "all" | "position" | "color" | "beam" | "custom";

export interface PresetPool {
  id: string;
  name: string;
  kind: PresetPoolKind;
  slots: (string | null)[];
  pageSize?: number;
}

export interface ShowBackupConfig {
  enabled?: boolean;
  role?: "primary" | "standby";
  partnerHost?: string;
  takeoverMode?: "manual" | "auto";
  heartbeatMs?: number;
}

export interface ShowAudioConfig {
  enabled?: boolean;
  inputDeviceId?: string;
  bpm?: number;
  latencyMs?: number;
}

export type TimecodeSource = "osc" | "ltc" | "mtc";

export interface ShowTimecodeConfig {
  enabled?: boolean;
  fps?: number;
  source?: TimecodeSource;
  ltcInputDeviceId?: string;
  ltcChannel?: "left" | "right" | "mono";
  ltcGain?: number;
  latencyMs?: number;
  globalOffsetMs?: number;
}

export interface ShowLinkSyncConfig {
  outputLatencyMs?: number;
  phaseOffset?: number;
}

export interface ShowOscSyncConfig {
  mediaLatencyMs?: number;
  mediaOffsetMs?: number;
}

export interface ShowGeneralConfig {
  debugToolsEnabled?: boolean;
}

export interface ShowTimelineAudioAsset {
  id: string;
  name: string;
  fileName: string;
  durationMs: number;
  offsetMs?: number;
  volume?: number;
}

export type TimelineSyncMode = "free" | "timecode";

export interface TimelineSessionViewRow {
  id: string;
  name: string;
  color?: string;
}

export interface TimelineSessionViewColumn {
  id: string;
  name: string;
  trackId?: string;
}

export interface TimelineSessionViewSlot {
  rowId: string;
  columnId: string;
  cueId?: string;
  presetId?: string;
  label?: string;
  color?: string;
  mode?: "go" | "toggle";
}

export interface TimelineSessionView {
  rows: TimelineSessionViewRow[];
  columns: TimelineSessionViewColumn[];
  slots: TimelineSessionViewSlot[];
}

export interface ShowTimelineConfig {
  durationMs?: number;
  fps?: number;
  syncMode?: TimelineSyncMode;
  snapEnabled?: boolean;
  snapMode?: "seconds" | "frames" | "beats";
  snapStep?: number;
  snapToMarkers?: boolean;
  snapToAudioTransients?: boolean;
  showConflictDiagnostics?: boolean;
  showMarkers?: boolean;
  showSections?: boolean;
  primaryAudioAssetId?: string | null;
  audioAssets?: ShowTimelineAudioAsset[];
  tracks?: TimelineTrack[];
  markers?: TimelineMarker[];
  sections?: TimelineSection[];
  programmerSessions?: ProgrammerSession[];
  sessionView?: TimelineSessionView;
}

export interface ShowAudioMapping {
  id: string;
  source: "rms" | "peak" | "beat" | "band";
  bandIndex?: 0 | 1 | 2 | 3;
  targetType: "fixture" | "group" | "effect" | "executor" | "submaster";
  targetId: string;
  attribute?: string;
  gain?: number;
  offset?: number;
  enabled?: boolean;
  invert?: boolean;
  min?: number;
  max?: number;
  attackMs?: number;
  releaseMs?: number;
}

export interface ShowPlaybackConfig {
  busMaster?: number;
  cueLevels?: Record<string, number>;
}

export interface ShowExecutor {
  id: string;
  name: string;
  pages: number;
  activePage?: number;
  defaultReleaseMs?: number;
  slots: ExecutorSlot[];
}

export interface ExecutorSlot {
  id: string;
  name: string;
  page: number;
  index: number;
  cueId?: string;
  mode?: "go" | "toggle" | "flash" | "latch" | (string & {});
  fadeMs?: number;
  releaseMs?: number;
  level?: number;
  submasterId?: string;
}

export interface ShowSubmaster {
  id: string;
  name: string;
  value: number;
  mode?: "cue-intensity" | "group-intensity" | (string & {});
  targets?: string[];
  min?: number;
  max?: number;
}

export type PixelChannelOrder = "rgb" | "rbg" | "grb" | "gbr" | "brg" | "bgr";

export interface VideoSampleRegion {
  /** Normalized 0..1 top-left X in source frame */
  x: number;
  /** Normalized 0..1 top-left Y in source frame */
  y: number;
  /** Normalized 0..1 width of crop */
  width: number;
  /** Normalized 0..1 height of crop */
  height: number;
}

export interface PixelMapFixtureChannel {
  fixtureName: string;
  x: number;
  y: number;
  startChannel: number;
}

export interface PixelMapDefinition {
  id: string;
  name: string;
  width: number;
  height: number;
  channelOrder: PixelChannelOrder;
  fixtureChannels: PixelMapFixtureChannel[];
  /** Crop on incoming video before sampling this map's grid */
  sampleRegion?: VideoSampleRegion;
  /** Per-map video sampling gain (0..2, default 1) */
  videoGain?: number;
  /** Per-map EMA smoothing for sampled values (ms, default 80) */
  videoSmoothingMs?: number;
}

export type VideoInputKind = "none" | "webcam" | "syphon" | "spout";

export type VideoSampleFps = 15 | 24 | 30 | 44 | 60;

export interface ShowVideoConfig {
  enabled?: boolean;
  /** @deprecated Use pixelMapIds */
  pixelMapId?: string | null;
  /** Pixel maps sampled from the shared video source (each uses its own sampleRegion) */
  pixelMapIds?: string[];
  inputKind?: VideoInputKind;
  deviceId?: string | null;
  senderName?: string | null;
  /** @deprecated Use per-map videoGain on PixelMapDefinition */
  gain?: number;
  /** @deprecated Use per-map videoSmoothingMs on PixelMapDefinition */
  smoothingMs?: number;
  blackLevel?: number;
  followDimmer?: boolean;
  fps?: VideoSampleFps;
}

export type ShowDocumentVersion = "1.0" | "1.1" | "1.2" | "1.3" | "1.4" | "1.5" | "1.6";

export interface ShowDocument {
  version: ShowDocumentVersion;
  meta: ShowMeta;
  plugins?: string[];
  destinations: OutputDestination[];
  fixtures: ShowFixture[];
  groups: ShowGroup[];
  presets: Preset[];
  presetPools?: PresetPool[];
  effects: EffectDefinition[];
  cues: Cue[];
  bindings: ShowBindings;
  audio?: ShowAudioConfig;
  timecode?: ShowTimecodeConfig;
  link?: ShowLinkSyncConfig;
  oscSync?: ShowOscSyncConfig;
  general?: ShowGeneralConfig;
  timeline?: ShowTimelineConfig;
  audioMappings?: ShowAudioMapping[];
  executors?: ShowExecutor[];
  submasters?: ShowSubmaster[];
  playback?: ShowPlaybackConfig;
  pixelMaps?: PixelMapDefinition[];
  video?: ShowVideoConfig;
  backup?: ShowBackupConfig;
  desk?: ShowDeskConfig;
  touch?: ShowTouchConfig;
  programmer?: ProgrammerConfig;
}

export function createEmptyShow(name = "Untitled Show"): ShowDocument {
  const now = new Date().toISOString();
  const doc: ShowDocument = {
    version: "1.6",
    meta: { name, created: now, modified: now },
    plugins: ["builtin"],
    destinations: [
      {
        id: "default-gridnode",
        name: "Default GridNode Overlay",
        type: "gridnode",
        settings: {},
      },
    ],
    fixtures: [],
    groups: [],
    presets: [],
    presetPools: [
      {
        id: "default-pool",
        name: "All",
        kind: "all",
        slots: [],
        pageSize: 25,
      },
    ],
    effects: [],
    cues: [],
    bindings: { midi: [], osc: [] },
    timecode: {
      enabled: false,
      fps: 30,
      source: "osc",
      ltcChannel: "mono",
      ltcGain: 1,
      latencyMs: 0,
      globalOffsetMs: 0,
    },
    link: {
      outputLatencyMs: 0,
      phaseOffset: 0,
    },
    oscSync: {
      mediaLatencyMs: 0,
      mediaOffsetMs: 0,
    },
    general: {
      debugToolsEnabled: true,
    },
    timeline: {
      durationMs: 300_000,
      fps: 30,
      syncMode: "free",
      snapEnabled: true,
      snapMode: "seconds",
      snapStep: 1,
      snapToMarkers: false,
      snapToAudioTransients: false,
      showConflictDiagnostics: true,
      showMarkers: true,
      showSections: true,
      primaryAudioAssetId: null,
      audioAssets: [],
      tracks: [],
      markers: [],
      sections: [],
      programmerSessions: [],
      sessionView: {
        rows: [{ id: "scene-1", name: "Scene 1" }],
        columns: [
          { id: "col-main", name: "Main", trackId: "timeline-main-track" },
          { id: "col-presets", name: "Presets" },
        ],
        slots: [],
      },
    },
    audioMappings: [],
    executors: [
      {
        id: "main-executor",
        name: "Main",
        pages: 1,
        activePage: 1,
        defaultReleaseMs: 400,
        slots: Array.from({ length: 8 }, (_, index) => ({
          id: `main-executor-slot-${index + 1}`,
          name: `Slot ${index + 1}`,
          page: 1,
          index,
          mode: "go",
        })),
      },
    ],
    submasters: [],
    playback: {
      busMaster: 1,
      cueLevels: {},
    },
    pixelMaps: [],
    video: {
      enabled: false,
      pixelMapIds: [],
      inputKind: "none",
      deviceId: null,
      senderName: null,
      gain: 1,
      smoothingMs: 80,
      blackLevel: 0,
      followDimmer: false,
      fps: 30,
    },
    backup: {
      enabled: false,
      role: "primary",
      takeoverMode: "manual",
      heartbeatMs: 500,
    },
  };
  return doc;
}
