/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import * as YAML from "yaml";
import type { ShowDocument } from "./document.ts";
import { createEmptyShow } from "./document.ts";
import { migrateShowDocument } from "./migrate.ts";
import { defaultGroupColorForIndex, normalizeGroupColor } from "../utils/group-colors.ts";
import { createDefaultDeskConfig, createDefaultTouchConfig } from "../utils/desk-defaults.ts";
import {
  createDefaultVideoConfig,
  normalizeSampleRegion,
  normalizeVideoFps,
  normalizeVideoInputKind,
  resolvePixelMapVideoGain,
  resolvePixelMapVideoSmoothingMs,
  resolveVideoPixelMapIds,
} from "../utils/video-defaults.ts";
import { CURRENT_SHOW_VERSION, isSupportedShowVersion } from "./version.ts";
import { ensureDefaultPresetPool } from "../utils/preset-pool.ts";
import {
  normalizeLatencyMs,
  normalizePhaseOffsetBeats,
  normalizeSignedOffsetMs,
} from "../utils/sync-compensation.ts";

export function validateShowDocument(data: unknown): ShowDocument {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid show document: not an object");
  }

  const doc = migrateShowDocument(data as Partial<ShowDocument>);

  if (!isSupportedShowVersion(doc.version)) {
    throw new Error(`Unsupported show version: ${doc.version}`);
  }

  if (!doc.meta?.name) {
    throw new Error("Invalid show document: missing meta.name");
  }

  if (!Array.isArray(doc.fixtures)) {
    throw new Error("Invalid show document: fixtures must be an array");
  }

  const normalizedVersion = CURRENT_SHOW_VERSION;

  const partialDoc = doc as ShowDocument;
  const desk = doc.desk ?? createDefaultDeskConfig();
  const touch =
    doc.touch ?? createDefaultTouchConfig({ ...partialDoc, version: normalizedVersion, desk });

  return {
    version: normalizedVersion,
    meta: {
      name: doc.meta.name,
      created: doc.meta.created ?? new Date().toISOString(),
      modified: doc.meta.modified ?? new Date().toISOString(),
      sessionEpoch:
        typeof doc.meta.sessionEpoch === "number" && Number.isFinite(doc.meta.sessionEpoch)
          ? Math.max(0, Math.floor(doc.meta.sessionEpoch))
          : 0,
      modifiedBy: doc.meta.modifiedBy,
      lock: doc.meta.lock,
    },
    plugins: doc.plugins ?? ["builtin"],
    destinations: ((doc.destinations ?? []).length > 0
      ? doc.destinations!
      : createEmptyShow().destinations
    ).map((dest) => ({
      ...dest,
      role: dest.role === "standby" ? "standby" : "primary",
      failoverGroup: dest.failoverGroup,
    })),
    fixtures: doc.fixtures.map((fixture) => ({
      ...fixture,
      position: fixture.position,
    })),
    groups: (doc.groups ?? []).map((group, index) => ({
      name: group.name,
      fixtures: group.fixtures ?? (group as { names?: string[] }).names ?? [],
      color: normalizeGroupColor(group.color) ?? defaultGroupColorForIndex(index),
    })),
    presets: doc.presets ?? [],
    presetPools: ensureDefaultPresetPool({
      ...(partialDoc as ShowDocument),
      presets: doc.presets ?? [],
      presetPools: doc.presetPools,
    }),
    effects: doc.effects ?? [],
    cues: (doc.cues ?? []).map(normalizeCue),
    bindings: {
      midi: doc.bindings?.midi ?? [],
      osc: doc.bindings?.osc ?? [],
    },
    audio: doc.audio
      ? {
          ...doc.audio,
          latencyMs:
            typeof doc.audio.latencyMs === "number" && Number.isFinite(doc.audio.latencyMs)
              ? normalizeLatencyMs(doc.audio.latencyMs)
              : 0,
        }
      : doc.audio,
    timecode: {
      enabled: doc.timecode?.enabled === true,
      fps:
        typeof doc.timecode?.fps === "number" && Number.isFinite(doc.timecode.fps)
          ? Math.max(1, doc.timecode.fps)
          : 30,
      source:
        doc.timecode?.source === "ltc" ||
        doc.timecode?.source === "mtc" ||
        doc.timecode?.source === "osc"
          ? doc.timecode.source
          : "osc",
      ltcInputDeviceId: doc.timecode?.ltcInputDeviceId,
      ltcChannel:
        doc.timecode?.ltcChannel === "left" || doc.timecode?.ltcChannel === "right"
          ? doc.timecode.ltcChannel
          : "mono",
      ltcGain:
        typeof doc.timecode?.ltcGain === "number" && Number.isFinite(doc.timecode.ltcGain)
          ? Math.max(0, doc.timecode.ltcGain)
          : 1,
      latencyMs:
        typeof doc.timecode?.latencyMs === "number" && Number.isFinite(doc.timecode.latencyMs)
          ? normalizeLatencyMs(doc.timecode.latencyMs)
          : 0,
      globalOffsetMs:
        typeof doc.timecode?.globalOffsetMs === "number" &&
        Number.isFinite(doc.timecode.globalOffsetMs)
          ? normalizeSignedOffsetMs(doc.timecode.globalOffsetMs)
          : 0,
    },
    link: {
      outputLatencyMs:
        typeof doc.link?.outputLatencyMs === "number" && Number.isFinite(doc.link.outputLatencyMs)
          ? normalizeLatencyMs(doc.link.outputLatencyMs)
          : 0,
      phaseOffset:
        typeof doc.link?.phaseOffset === "number" && Number.isFinite(doc.link.phaseOffset)
          ? normalizePhaseOffsetBeats(doc.link.phaseOffset)
          : 0,
    },
    oscSync: {
      mediaLatencyMs:
        typeof doc.oscSync?.mediaLatencyMs === "number" &&
        Number.isFinite(doc.oscSync.mediaLatencyMs)
          ? normalizeLatencyMs(doc.oscSync.mediaLatencyMs)
          : 0,
      mediaOffsetMs:
        typeof doc.oscSync?.mediaOffsetMs === "number" && Number.isFinite(doc.oscSync.mediaOffsetMs)
          ? normalizeSignedOffsetMs(doc.oscSync.mediaOffsetMs)
          : 0,
    },
    timeline: {
      durationMs:
        typeof doc.timeline?.durationMs === "number" && Number.isFinite(doc.timeline.durationMs)
          ? Math.max(1000, doc.timeline.durationMs)
          : 300_000,
      fps:
        typeof doc.timeline?.fps === "number" && Number.isFinite(doc.timeline.fps)
          ? Math.max(1, doc.timeline.fps)
          : (doc.timecode?.fps ?? 30),
      syncMode: doc.timeline?.syncMode === "timecode" ? "timecode" : "free",
      primaryAudioAssetId: doc.timeline?.primaryAudioAssetId ?? null,
      audioAssets: (doc.timeline?.audioAssets ?? []).map((asset, index) => ({
        id: asset.id ?? `timeline-audio-${index + 1}`,
        name: asset.name ?? asset.fileName ?? `Audio ${index + 1}`,
        fileName: asset.fileName ?? `audio-${index + 1}`,
        durationMs: Math.max(0, Math.floor(asset.durationMs)),
        offsetMs:
          typeof asset.offsetMs === "number" && Number.isFinite(asset.offsetMs)
            ? Math.max(0, asset.offsetMs)
            : 0,
        volume:
          typeof asset.volume === "number" && Number.isFinite(asset.volume)
            ? Math.max(0, Math.min(1, asset.volume))
            : 1,
      })),
    },
    audioMappings: doc.audioMappings ?? [],
    executors: doc.executors ?? [],
    submasters: doc.submasters ?? [],
    playback: {
      busMaster: doc.playback?.busMaster ?? 1,
      cueLevels: doc.playback?.cueLevels ?? {},
    },
    pixelMaps: (doc.pixelMaps ?? []).map((pixelMap, index) => ({
      id: pixelMap.id ?? `pixel-map-${index + 1}`,
      name: pixelMap.name ?? `Pixel Map ${index + 1}`,
      width: Math.max(1, Math.floor(pixelMap.width)),
      height: Math.max(1, Math.floor(pixelMap.height)),
      channelOrder: pixelMap.channelOrder ?? "rgb",
      sampleRegion: normalizeSampleRegion(pixelMap.sampleRegion),
      videoGain: resolvePixelMapVideoGain(pixelMap),
      videoSmoothingMs: resolvePixelMapVideoSmoothingMs(pixelMap),
      fixtureChannels: (pixelMap.fixtureChannels ?? []).map((cell) => ({
        fixtureName: cell.fixtureName,
        x: Math.max(0, Math.floor(cell.x)),
        y: Math.max(0, Math.floor(cell.y)),
        startChannel: Math.max(1, Math.floor(cell.startChannel)),
      })),
    })),
    video: {
      ...createDefaultVideoConfig(),
      ...doc.video,
      enabled: doc.video?.enabled === true,
      pixelMapIds: resolveVideoPixelMapIds(doc.video),
      inputKind: normalizeVideoInputKind(doc.video?.inputKind),
      deviceId: doc.video?.deviceId ?? null,
      senderName: doc.video?.senderName ?? null,
      gain:
        typeof doc.video?.gain === "number" && Number.isFinite(doc.video.gain)
          ? Math.max(0, Math.min(2, doc.video.gain))
          : 1,
      smoothingMs:
        typeof doc.video?.smoothingMs === "number" && Number.isFinite(doc.video.smoothingMs)
          ? Math.max(0, doc.video.smoothingMs)
          : 80,
      blackLevel:
        typeof doc.video?.blackLevel === "number" && Number.isFinite(doc.video.blackLevel)
          ? Math.max(0, Math.min(255, Math.round(doc.video.blackLevel)))
          : 0,
      followDimmer: doc.video?.followDimmer === true,
      fps: normalizeVideoFps(doc.video?.fps),
    },
    backup: {
      enabled: doc.backup?.enabled === true,
      role: doc.backup?.role === "standby" ? "standby" : "primary",
      partnerHost: doc.backup?.partnerHost,
      takeoverMode: doc.backup?.takeoverMode === "auto" ? "auto" : "manual",
      heartbeatMs:
        typeof doc.backup?.heartbeatMs === "number" && Number.isFinite(doc.backup.heartbeatMs)
          ? Math.max(250, doc.backup.heartbeatMs)
          : 500,
    },
    desk,
    touch,
  };
}

function normalizeCue(cue: ShowDocument["cues"][number]): ShowDocument["cues"][number] {
  return {
    ...cue,
    timecodeIn: typeof cue.timecodeIn === "number" ? Math.max(0, cue.timecodeIn) : undefined,
    timecodeOut: typeof cue.timecodeOut === "number" ? Math.max(0, cue.timecodeOut) : undefined,
    view: cue.view ?? (cue.stack?.length ? "stack" : "timeline"),
    tracking: cue.tracking ?? false,
    block: cue.block ?? true,
    mib: cue.mib ?? false,
    layers: cue.layers ?? [],
    stack: cue.stack ?? [],
    parts: cue.parts ?? [],
    created:
      typeof cue.created === "string"
        ? cue.created
        : new Date(cue.created as unknown as string).toISOString(),
    modified:
      typeof cue.modified === "string"
        ? cue.modified
        : new Date(cue.modified as unknown as string).toISOString(),
  };
}

export function parseShowDocument(yamlOrJson: string): ShowDocument {
  const parsed = YAML.parse(yamlOrJson);
  return validateShowDocument(parsed);
}

export function serializeShowDocument(doc: ShowDocument): string {
  const exportDoc: ShowDocument = {
    ...doc,
    meta: { ...doc.meta, modified: new Date().toISOString() },
  };
  return YAML.stringify(exportDoc);
}

export function downloadShowDocument(doc: ShowDocument, filename?: string): boolean {
  try {
    const yamlContent = serializeShowDocument(doc);
    const blob = new Blob([yamlContent], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename ?? `${doc.meta.name.replace(/\s+/g, "_")}.yml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error("Failed to download show document:", error);
    return false;
  }
}

export async function loadShowDocumentFromFile(file: File): Promise<ShowDocument> {
  const content = await file.text();
  if (!content.trim()) {
    throw new Error("File is empty");
  }
  return parseShowDocument(content);
}
