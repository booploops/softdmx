/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Server } from "socket.io";
import type { ActiveChannel, ShowDocument } from "@softdmx/engine";
import { resolveFixtureChannelsForMode } from "@softdmx/engine";
import type { OutputManager } from "../../output/output-manager";
import { getFixtureDefinitionFromDisk } from "../../fixture-lookup";
import { getCurrentShow, setCurrentShow } from "../context";

type OutputIngressDebugSnapshot = {
  destinationId: string;
  emittedAtMs: number;
  totalChannels: number;
  nonZeroChannels: Array<{ address: number; value: number }>;
};

function buildIngressSnapshots(channels: unknown): OutputIngressDebugSnapshot[] {
  if (!Array.isArray(channels)) return [];

  const byDestination = new Map<string, { total: number; nonZero: Array<{ address: number; value: number }> }>();

  for (const item of channels) {
    const channel = item as { universe?: unknown; id?: unknown; value?: unknown };
    if (typeof channel.universe !== "string") continue;
    if (typeof channel.id !== "number" || channel.id < 1 || channel.id > 512) continue;
    const value = typeof channel.value === "number" ? channel.value : 0;

    const current = byDestination.get(channel.universe) ?? { total: 0, nonZero: [] };
    current.total += 1;
    if (value > 0 && current.nonZero.length < 24) {
      current.nonZero.push({ address: channel.id, value });
    }
    byDestination.set(channel.universe, current);
  }

  const emittedAtMs = Date.now();
  return Array.from(byDestination.entries()).map(([destinationId, state]) => ({
    destinationId,
    emittedAtMs,
    totalChannels: state.total,
    nonZeroChannels: state.nonZero,
  }));
}

function buildFixturePatchMap(show: ShowDocument): Map<string, { destinationId: string; startChannel: number }> {
  const patchMap = new Map<string, { destinationId: string; startChannel: number }>();
  const destinationIndices = new Map<string, number>();

  for (const fixture of show.fixtures) {
    const definition = getFixtureDefinitionFromDisk(fixture.fixtureId);
    const modeChannels = definition
      ? resolveFixtureChannelsForMode(definition, fixture.modeId)
      : [];
    const channelCount = Math.max(1, modeChannels.length);
    const destinationId = fixture.outputDestinationId ?? "default-gridnode";
    const autoIndex = destinationIndices.get(destinationId) ?? 1;
    const startChannel = fixture.startingChannel ?? autoIndex;

    patchMap.set(fixture.name, {
      destinationId,
      startChannel,
    });

    destinationIndices.set(destinationId, startChannel + channelCount);
  }

  return patchMap;
}

function normalizeChannelsForOutput(
  channels: unknown,
  fixturePatchMap: Map<string, { destinationId: string; startChannel: number }>,
): ActiveChannel[] {
  if (!Array.isArray(channels)) return [];

  return channels
    .map((item) => {
      const channel = item as Partial<ActiveChannel>;
      const value = typeof channel.value === "number" ? channel.value : 0;
      const path = typeof channel.path === "string" ? channel.path : "";
      const fallbackId = typeof channel.id === "number" ? channel.id : 0;
      const fallbackUniverse = typeof channel.universe === "string" ? channel.universe : undefined;

      if (
        typeof channel.universe === "string" &&
        typeof channel.id === "number" &&
        channel.id >= 1 &&
        channel.id <= 512
      ) {
        return {
          id: channel.id,
          universe: channel.universe,
          path,
          value,
          attributeType: channel.attributeType,
        } satisfies ActiveChannel;
      }

      const match = path.match(/^show:\/\/([^/]+)\/(\d+)$/);
      if (!match) {
        return {
          id: fallbackId,
          universe: fallbackUniverse,
          path,
          value,
          attributeType: channel.attributeType,
        } satisfies ActiveChannel;
      }
      const fixtureName = match[1];
      const fixtureChannel = Number(match[2]);
      if (!fixtureName || !Number.isFinite(fixtureChannel) || fixtureChannel < 1) {
        return {
          id: fallbackId,
          universe: fallbackUniverse,
          path,
          value,
          attributeType: channel.attributeType,
        } satisfies ActiveChannel;
      }

      const patch = fixturePatchMap.get(fixtureName);
      if (!patch) {
        return {
          id: fallbackId,
          universe: fallbackUniverse,
          path,
          value,
          attributeType: channel.attributeType,
        } satisfies ActiveChannel;
      }
      const address = patch.startChannel + fixtureChannel - 1;
      if (address < 1 || address > 512) {
        return {
          id: fallbackId,
          universe: fallbackUniverse,
          path,
          value,
          attributeType: channel.attributeType,
        } satisfies ActiveChannel;
      }

      return {
        id: address,
        universe: patch.destinationId,
        path,
        value,
        attributeType: channel.attributeType,
      } satisfies ActiveChannel;
    })
    .filter((channel): channel is ActiveChannel => Boolean(channel.path));
}

export function attachChannelPipeline(io: Server, outputManager: OutputManager): void {
  let cachedShow: ShowDocument | null = null;
  let cachedPatchMap = new Map<string, { destinationId: string; startChannel: number }>();

  const getPatchMap = () => {
    const show = getCurrentShow();
    if (!show) {
      cachedShow = null;
      cachedPatchMap = new Map<string, { destinationId: string; startChannel: number }>();
      return cachedPatchMap;
    }
    if (show !== cachedShow) {
      cachedShow = show;
      cachedPatchMap = buildFixturePatchMap(show);
    }
    return cachedPatchMap;
  };

  outputManager.onHealth((statuses) => {
    io.emit("output:health", statuses);
  });

  outputManager.onFrameDebug((snapshots) => {
    io.emit("output:frame-debug", snapshots);
  });

  io.on("connection", (socket) => {
    socket.emit("output:health", outputManager.getHealthStatuses());
    socket.emit("output:frame-debug", outputManager.getFrameDebugSnapshots());

    socket.on("channels:state", (channels) => {
      const normalized = normalizeChannelsForOutput(channels, getPatchMap());
      const ingress = buildIngressSnapshots(normalized);
      if (ingress.length > 0) {
        io.emit("output:channels-ingress", ingress);
      }
      io.emit("channels:state", normalized);
      outputManager.handleChannelUpdate(normalized);
    });

    // Legacy alias
    socket.on("channels:update", (channels) => {
      const normalized = normalizeChannelsForOutput(channels, getPatchMap());
      const ingress = buildIngressSnapshots(normalized);
      if (ingress.length > 0) {
        io.emit("output:channels-ingress", ingress);
      }
      io.emit("channels:state", normalized);
      outputManager.handleChannelUpdate(normalized);
    });

    socket.on("show:state", (showfile) => {
      if (showfile) {
        setCurrentShow(showfile as ShowDocument);
        cachedShow = showfile as ShowDocument;
        cachedPatchMap = buildFixturePatchMap(cachedShow);
        outputManager.setShowfile(showfile);
        // Broadcast to other clients only — avoid echoing back to the sender
        socket.broadcast.emit("show:state", showfile);
      }
    });

    // Legacy alias
    socket.on("showfile:update", (showfile) => {
      if (showfile) {
        setCurrentShow(showfile as ShowDocument);
        cachedShow = showfile as ShowDocument;
        cachedPatchMap = buildFixturePatchMap(cachedShow);
        outputManager.setShowfile(showfile);
      }
    });
  });
}
