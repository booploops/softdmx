/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export type FeatureFlagProfile = "dev" | "staging" | "prod";
export type FeatureFlagKind = "killSwitch" | "experiment" | "migration";
export type FeatureFlagGroup =
  | "output"
  | "timing"
  | "remote"
  | "video"
  | "audio"
  | "ui"
  | "backup"
  | "importExport";

export interface FeatureFlagDefinition {
  description: string;
  owner: string;
  kind: FeatureFlagKind;
  group: FeatureFlagGroup;
  expiresOn?: string;
  defaultValueByProfile: Record<FeatureFlagProfile, boolean>;
}

export const FEATURE_FLAG_DEFINITIONS = {
  useWasmPacketPacking: {
    description: "Use WASM packet packing for Art-Net/sACN output drivers.",
    owner: "softdmx",
    kind: "migration",
    group: "output",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  useBackgroundOutputWorker: {
    description: "Route output processing through Electron background worker thread.",
    owner: "softdmx",
    kind: "killSwitch",
    group: "output",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableGridnodeBridge: {
    description: "Enable gridnode bridge forwarding path.",
    owner: "softdmx",
    kind: "killSwitch",
    group: "output",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableLtcInput: {
    description: "Enable LTC input/decode pipeline.",
    owner: "softdmx",
    kind: "killSwitch",
    group: "timing",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableMtcInput: {
    description: "Enable MTC input/decode pipeline.",
    owner: "softdmx",
    kind: "killSwitch",
    group: "timing",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableOscTimecode: {
    description: "Enable OSC timecode source and sync path.",
    owner: "softdmx",
    kind: "killSwitch",
    group: "timing",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableTimecodeSetPlayback: {
    description: "Enable timecode-set playback mode for cue evaluation.",
    owner: "softdmx",
    kind: "experiment",
    group: "timing",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableSocketCommandExecutionOnly: {
    description: "Restrict remote command execution to socket transport.",
    owner: "softdmx",
    kind: "migration",
    group: "remote",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableRemoteAuthStrictMode: {
    description: "Enforce strict authentication checks for remote commands.",
    owner: "softdmx",
    kind: "killSwitch",
    group: "remote",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableWorkerVideoSampling: {
    description: "Run video sampling pipeline in worker context.",
    owner: "softdmx",
    kind: "migration",
    group: "video",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableWasmPixelSampler: {
    description: "Use WASM pixel sampler for map extraction.",
    owner: "softdmx",
    kind: "experiment",
    group: "video",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableNativeVideoInput: {
    description: "Enable native Syphon/Spout video source ingest.",
    owner: "softdmx",
    kind: "killSwitch",
    group: "video",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableAudioMappings: {
    description: "Enable audio-reactive mapping layer.",
    owner: "softdmx",
    kind: "killSwitch",
    group: "audio",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableBeatPulseDetection: {
    description: "Enable beat pulse trigger detection in audio analysis.",
    owner: "softdmx",
    kind: "experiment",
    group: "audio",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enable3DVisualizer: {
    description: "Enable 3D visualizer rendering path.",
    owner: "softdmx",
    kind: "experiment",
    group: "ui",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableAdvancedThemeGallery: {
    description: "Enable advanced theme gallery surfaces and workflows.",
    owner: "softdmx",
    kind: "experiment",
    group: "ui",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableTouchLayoutDragResizeV2: {
    description: "Enable V2 touch layout drag/resize interactions.",
    owner: "softdmx",
    kind: "migration",
    group: "ui",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableWorkerGdtfParse: {
    description: "Parse GDTF archives in worker context.",
    owner: "softdmx",
    kind: "migration",
    group: "importExport",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableWorkerShowParse: {
    description: "Parse and validate showfiles in worker context.",
    owner: "softdmx",
    kind: "migration",
    group: "importExport",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableStrictShowValidation: {
    description: "Enable strict validation checks when loading showfiles.",
    owner: "softdmx",
    kind: "experiment",
    group: "importExport",
    defaultValueByProfile: { dev: true, staging: true, prod: false },
  },
  mergeWorkerEnabled: {
    description: "Run output merge pipeline in frontend worker.",
    owner: "softdmx",
    kind: "migration",
    group: "output",
    defaultValueByProfile: { dev: false, staging: false, prod: false },
  },
  mergeWasmEnabled: {
    description: "Use WASM kernels in merge worker when available.",
    owner: "softdmx",
    kind: "experiment",
    group: "output",
    defaultValueByProfile: { dev: false, staging: false, prod: false },
  },
  showParseWorkerEnabled: {
    description: "Use worker-based show parse path in frontend store.",
    owner: "softdmx",
    kind: "migration",
    group: "importExport",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  audioAnalysisWorkerEnabled: {
    description: "Use worker-based audio analysis step in audio store.",
    owner: "softdmx",
    kind: "migration",
    group: "audio",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  ltcDecodeWorkerEnabled: {
    description: "Use worker-based LTC decode path.",
    owner: "softdmx",
    kind: "migration",
    group: "timing",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  timelineAudioWorkerEnabled: {
    description: "Use worker-based waveform peak extraction.",
    owner: "softdmx",
    kind: "migration",
    group: "audio",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  commandLineV2Enabled: {
    description: "Enable Command Line v2 parser/executor and contextual UX.",
    owner: "softdmx",
    kind: "migration",
    group: "ui",
    defaultValueByProfile: { dev: true, staging: false, prod: false },
  },
  commandIntentEnabled: {
    description: "Enable intent-command translation to canonical command syntax.",
    owner: "softdmx",
    kind: "experiment",
    group: "ui",
    defaultValueByProfile: { dev: true, staging: false, prod: false },
  },
  commandSandboxRequiredForRisky: {
    description: "Require preview/sandbox confirmation for risky command plans.",
    owner: "softdmx",
    kind: "killSwitch",
    group: "ui",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  commandSuggestionsEnabled: {
    description: "Enable show-aware command suggestions in command line UI.",
    owner: "softdmx",
    kind: "experiment",
    group: "ui",
    defaultValueByProfile: { dev: true, staging: false, prod: false },
  },
} as const satisfies Record<string, FeatureFlagDefinition>;

export type FeatureFlagKey = keyof typeof FEATURE_FLAG_DEFINITIONS;
export type FeatureFlagSnapshot = Record<FeatureFlagKey, boolean>;

export function resolveFeatureFlagProfile(mode?: string): FeatureFlagProfile {
  const source = (mode ?? "").toLowerCase();
  if (source.includes("stag")) return "staging";
  if (source.includes("prod")) return "prod";
  return "dev";
}

export function getFeatureFlagDefaults(profile: FeatureFlagProfile): FeatureFlagSnapshot {
  const entries = Object.entries(FEATURE_FLAG_DEFINITIONS).map(([key, definition]) => [
    key,
    definition.defaultValueByProfile[profile],
  ]);
  return Object.fromEntries(entries) as FeatureFlagSnapshot;
}

export function getFeatureFlagMetadata(): Readonly<
  Record<FeatureFlagKey, FeatureFlagDefinition>
> {
  return FEATURE_FLAG_DEFINITIONS;
}
