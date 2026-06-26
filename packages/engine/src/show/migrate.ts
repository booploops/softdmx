/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ShowDocument } from "./document.ts";
import { createDefaultDeskConfig, createDefaultTouchConfig } from "../utils/desk-defaults.ts";
import { createDefaultVideoConfig } from "../utils/video-defaults.ts";
import { ensureDefaultPresetPool } from "../utils/preset-pool.ts";

type LegacyGroup = {
  name: string;
  fixtures?: string[];
  names?: string[];
  color?: string;
};

type LegacyShowDocument = Partial<ShowDocument> & {
  linkedGroups?: LegacyGroup[];
  groups?: LegacyGroup[];
};

function normalizeLegacyGroups(doc: LegacyShowDocument): Partial<ShowDocument> {
  const hasGroups = Array.isArray(doc.groups) && doc.groups.length > 0;
  const hasLinkedGroups = Array.isArray(doc.linkedGroups) && doc.linkedGroups.length > 0;
  const sourceGroups = hasGroups
    ? doc.groups
    : hasLinkedGroups
      ? doc.linkedGroups
      : (doc.groups ?? doc.linkedGroups);

  if (!sourceGroups) {
    return doc;
  }

  return {
    ...doc,
    groups: sourceGroups.map((group) => ({
      name: group.name,
      fixtures: group.fixtures ?? group.names ?? [],
      color: group.color,
    })),
  };
}

function migrateV1_0ToV1_1(doc: Partial<ShowDocument>): Partial<ShowDocument> {
  return {
    ...doc,
    version: "1.1",
    audio: doc.audio,
    timecode: {
      enabled: doc.timecode?.enabled === true,
      fps: doc.timecode?.fps ?? 30,
      source: doc.timecode?.source ?? "osc",
      ltcInputDeviceId: doc.timecode?.ltcInputDeviceId,
      ltcChannel: doc.timecode?.ltcChannel ?? "mono",
      ltcGain: doc.timecode?.ltcGain ?? 1,
      latencyMs: doc.timecode?.latencyMs ?? 0,
      globalOffsetMs: doc.timecode?.globalOffsetMs ?? 0,
    },
    link: {
      outputLatencyMs: doc.link?.outputLatencyMs ?? 0,
      phaseOffset: doc.link?.phaseOffset ?? 0,
    },
    oscSync: {
      mediaLatencyMs: doc.oscSync?.mediaLatencyMs ?? 0,
      mediaOffsetMs: doc.oscSync?.mediaOffsetMs ?? 0,
    },
    audioMappings: doc.audioMappings ?? [],
    executors: doc.executors ?? [],
    submasters: doc.submasters ?? [],
    playback: {
      busMaster: doc.playback?.busMaster ?? 1,
      cueLevels: doc.playback?.cueLevels ?? {},
    },
    pixelMaps: doc.pixelMaps ?? [],
    fixtures: doc.fixtures?.map((fixture) => ({
      ...fixture,
      position: fixture.position,
    })),
  };
}

function migrateV1_1ToV1_2(doc: Partial<ShowDocument>): Partial<ShowDocument> {
  const base = { ...doc, version: "1.2" as const };
  const asShow = base as ShowDocument;
  return {
    ...base,
    desk: doc.desk ?? createDefaultDeskConfig(),
    touch: doc.touch ?? createDefaultTouchConfig(asShow),
  };
}

function migrateV1_2ToV1_3(doc: Partial<ShowDocument>): Partial<ShowDocument> {
  return {
    ...doc,
    version: "1.3",
    video: doc.video ?? createDefaultVideoConfig(),
    pixelMaps: (doc.pixelMaps ?? []).map((map) => ({
      ...map,
      sampleRegion: map.sampleRegion,
    })),
  };
}

function migrateV1_3ToV1_4(doc: Partial<ShowDocument>): Partial<ShowDocument> {
  const video = doc.video ?? createDefaultVideoConfig();
  const pixelMapIds =
    Array.isArray(video.pixelMapIds) && video.pixelMapIds.length > 0
      ? video.pixelMapIds
      : typeof video.pixelMapId === "string" && video.pixelMapId.length > 0
        ? [video.pixelMapId]
        : [];

  return {
    ...doc,
    version: "1.4",
    video: {
      ...video,
      pixelMapIds,
    },
  };
}

function migrateV1_4ToV1_5(doc: Partial<ShowDocument>): Partial<ShowDocument> {
  const asShow = doc as ShowDocument;
  const presetPools = ensureDefaultPresetPool({
    ...asShow,
    presets: doc.presets ?? [],
    presetPools: doc.presetPools,
  });

  return {
    ...doc,
    version: "1.5",
    meta: {
      ...(doc.meta ?? {
        name: "Untitled Show",
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      }),
      sessionEpoch: doc.meta?.sessionEpoch ?? 0,
    },
    presetPools,
    backup: doc.backup ?? {
      enabled: false,
      role: "primary",
      takeoverMode: "manual",
      heartbeatMs: 500,
    },
    destinations: (doc.destinations ?? []).map((dest) => ({
      ...dest,
      role: dest.role ?? "primary",
    })),
    cues: (doc.cues ?? []).map((cue) => ({
      ...cue,
      parts:
        cue.parts ??
        (cue.stack ?? []).map((step) => ({
          id: step.id,
          label: step.label,
          fadeIn: step.fadeIn,
          delay: step.follow === "timed" ? step.followTime : 0,
          presetId: step.presetId,
          effectIds: step.effectIds,
        })),
    })),
  };
}

export function migrateShowDocument(doc: Partial<ShowDocument>): Partial<ShowDocument> {
  const normalized = normalizeLegacyGroups(doc as LegacyShowDocument);

  if (normalized.version === "1.0") {
    return migrateShowDocument(migrateV1_0ToV1_1(normalized));
  }
  if (normalized.version === "1.1") {
    return migrateShowDocument(migrateV1_1ToV1_2(normalized));
  }
  if (normalized.version === "1.2") {
    return migrateShowDocument(migrateV1_2ToV1_3(normalized));
  }
  if (normalized.version === "1.3") {
    return migrateShowDocument(migrateV1_3ToV1_4(normalized));
  }
  if (normalized.version === "1.4") {
    return migrateShowDocument(migrateV1_4ToV1_5(normalized));
  }
  return normalized;
}
