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
    owner: "output-team",
    kind: "migration",
    group: "output",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  useBackgroundOutputWorker: {
    description: "Route output processing through Electron background worker thread.",
    owner: "output-team",
    kind: "killSwitch",
    group: "output",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableGridnodeBridge: {
    description: "Enable gridnode bridge forwarding path.",
    owner: "output-team",
    kind: "killSwitch",
    group: "output",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableLtcInput: {
    description: "Enable LTC input/decode pipeline.",
    owner: "timing-team",
    kind: "killSwitch",
    group: "timing",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableMtcInput: {
    description: "Enable MTC input/decode pipeline.",
    owner: "timing-team",
    kind: "killSwitch",
    group: "timing",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableOscTimecode: {
    description: "Enable OSC timecode source and sync path.",
    owner: "timing-team",
    kind: "killSwitch",
    group: "timing",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableTimecodeSetPlayback: {
    description: "Enable timecode-set playback mode for cue evaluation.",
    owner: "timing-team",
    kind: "experiment",
    group: "timing",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableSocketCommandExecutionOnly: {
    description: "Restrict remote command execution to socket transport.",
    owner: "remote-team",
    kind: "migration",
    group: "remote",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableRemoteAuthStrictMode: {
    description: "Enforce strict authentication checks for remote commands.",
    owner: "security-team",
    kind: "killSwitch",
    group: "remote",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableWorkerVideoSampling: {
    description: "Run video sampling pipeline in worker context.",
    owner: "video-team",
    kind: "migration",
    group: "video",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableWasmPixelSampler: {
    description: "Use WASM pixel sampler for map extraction.",
    owner: "video-team",
    kind: "experiment",
    group: "video",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableNativeVideoInput: {
    description: "Enable native Syphon/Spout video source ingest.",
    owner: "video-team",
    kind: "killSwitch",
    group: "video",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableAudioMappings: {
    description: "Enable audio-reactive mapping layer.",
    owner: "audio-team",
    kind: "killSwitch",
    group: "audio",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableBeatPulseDetection: {
    description: "Enable beat pulse trigger detection in audio analysis.",
    owner: "audio-team",
    kind: "experiment",
    group: "audio",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enable3DVisualizer: {
    description: "Enable 3D visualizer rendering path.",
    owner: "ui-team",
    kind: "experiment",
    group: "ui",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableAdvancedThemeGallery: {
    description: "Enable advanced theme gallery surfaces and workflows.",
    owner: "ui-team",
    kind: "experiment",
    group: "ui",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableTouchLayoutDragResizeV2: {
    description: "Enable V2 touch layout drag/resize interactions.",
    owner: "ui-team",
    kind: "migration",
    group: "ui",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableAutoTakeover: {
    description: "Allow automatic takeover in backup/failover mode.",
    owner: "backup-team",
    kind: "killSwitch",
    group: "backup",
    defaultValueByProfile: { dev: true, staging: false, prod: false },
  },
  enableBackupHeartbeatEnforcement: {
    description: "Enforce heartbeat policy checks for backup peer liveness.",
    owner: "backup-team",
    kind: "killSwitch",
    group: "backup",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableWorkerGdtfParse: {
    description: "Parse GDTF archives in worker context.",
    owner: "import-team",
    kind: "migration",
    group: "importExport",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableWorkerShowParse: {
    description: "Parse and validate showfiles in worker context.",
    owner: "import-team",
    kind: "migration",
    group: "importExport",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  enableStrictShowValidation: {
    description: "Enable strict validation checks when loading showfiles.",
    owner: "import-team",
    kind: "experiment",
    group: "importExport",
    defaultValueByProfile: { dev: true, staging: true, prod: false },
  },
  mergeWorkerEnabled: {
    description: "Run output merge pipeline in frontend worker.",
    owner: "runtime-team",
    kind: "migration",
    group: "output",
    defaultValueByProfile: { dev: false, staging: false, prod: false },
  },
  mergeWasmEnabled: {
    description: "Use WASM kernels in merge worker when available.",
    owner: "runtime-team",
    kind: "experiment",
    group: "output",
    defaultValueByProfile: { dev: false, staging: false, prod: false },
  },
  showParseWorkerEnabled: {
    description: "Use worker-based show parse path in frontend store.",
    owner: "runtime-team",
    kind: "migration",
    group: "importExport",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  audioAnalysisWorkerEnabled: {
    description: "Use worker-based audio analysis step in audio store.",
    owner: "runtime-team",
    kind: "migration",
    group: "audio",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  ltcDecodeWorkerEnabled: {
    description: "Use worker-based LTC decode path.",
    owner: "runtime-team",
    kind: "migration",
    group: "timing",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  timelineAudioWorkerEnabled: {
    description: "Use worker-based waveform peak extraction.",
    owner: "runtime-team",
    kind: "migration",
    group: "audio",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  commandLineV2Enabled: {
    description: "Enable Command Line v2 parser/executor and contextual UX.",
    owner: "ui-team",
    kind: "migration",
    group: "ui",
    defaultValueByProfile: { dev: true, staging: false, prod: false },
  },
  commandIntentEnabled: {
    description: "Enable intent-command translation to canonical command syntax.",
    owner: "ui-team",
    kind: "experiment",
    group: "ui",
    defaultValueByProfile: { dev: true, staging: false, prod: false },
  },
  commandSandboxRequiredForRisky: {
    description: "Require preview/sandbox confirmation for risky command plans.",
    owner: "security-team",
    kind: "killSwitch",
    group: "ui",
    defaultValueByProfile: { dev: true, staging: true, prod: true },
  },
  commandSuggestionsEnabled: {
    description: "Enable show-aware command suggestions in command line UI.",
    owner: "ui-team",
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
