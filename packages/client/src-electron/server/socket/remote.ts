/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Socket } from "socket.io";
import type { ClientIdentity, ShowAudioMapping, ShowDocument } from "@softdmx/engine";
import { isSupportedShowVersion } from "@softdmx/engine";
import type { RemoteContext } from "../context";
import type { ScratchStateSnapshot } from "../scratch-authority";
import { showStore } from "../../state/show";

type RemoteHandler = (socket: Socket, payload: unknown, ctx: RemoteContext) => void;
type AudioMappingMutationPayload =
  | { mapping: ShowAudioMapping }
  | { id: string; mapping: Partial<ShowAudioMapping> };

type ScratchSetPayload =
  | { path: string; value: number; attributeType?: string; clientId?: string }
  | { channels: { path: string; value: number; attributeType?: string }[]; clientId?: string };

const socketClientIds = new WeakMap<Socket, string>();

function resolveClientId(socket: Socket, payload?: { clientId?: string }): string {
  return payload?.clientId ?? socketClientIds.get(socket) ?? socket.id;
}

function broadcastScratchState(ctx: RemoteContext) {
  const snapshot = ctx.scratchAuthority.getSnapshot();
  ctx.io.emit("scratch:layers", snapshot);
  ctx.io.emit("scratch:state", snapshot);
  if (snapshot.conflicts.length > 0) {
    ctx.io.emit("scratch:conflicts", snapshot.conflicts);
  }
  emitMergedScratchRemote(snapshot, ctx);
}

function emitMergedScratchRemote(snapshot: ScratchStateSnapshot, ctx: RemoteContext) {
  if (snapshot.merged.length === 0) {
    ctx.io.emit("remote:scratch:clear");
    return;
  }

  if (snapshot.merged.length === 1) {
    const entry = snapshot.merged[0]!;
    ctx.io.emit("remote:scratch:set", {
      path: entry.path,
      value: entry.value,
      attributeType: entry.attributeType,
    });
    return;
  }

  ctx.io.emit("remote:scratch:set", {
    channels: snapshot.merged.map((entry) => ({
      path: entry.path,
      value: entry.value,
      attributeType: entry.attributeType,
    })),
  });
}

const handlers: Record<string, RemoteHandler> = {
  "client:hello": (socket, payload, ctx) => {
    const body = (payload ?? {}) as Partial<ClientIdentity>;
    const identity = ctx.scratchAuthority.registerClient(body);
    socketClientIds.set(socket, identity.clientId);
    socket.emit("client:identity", identity);
    socket.emit("scratch:layers", ctx.scratchAuthority.getSnapshot());
  },

  "show:get": (socket, _payload, ctx) => {
    const show = ctx.getShow();
    if (show) {
      socket.emit("show:state", show);
      socket.emit("show:state-sync", {
        document: showStore.document(),
        isDirty: showStore.isDirty(),
        filePath: showStore.filePath(),
        undoStack: showStore.undoStack(),
        redoStack: showStore.redoStack(),
      });
    }
  },

  "show:load": (socket, payload, ctx) => {
    const show = payload as ShowDocument;
    if (isSupportedShowVersion(show?.version)) {
      ctx.setShow(show);
    }
  },

  "show:action:load": (socket, payload, ctx) => {
    const { document, filePath } = (payload ?? {}) as { document: ShowDocument; filePath?: string | null };
    if (isSupportedShowVersion(document?.version)) {
      showStore.loadShow(document, filePath ?? null);
    }
  },

  "show:action:new": (socket, payload, ctx) => {
    const { showName } = (payload ?? {}) as { showName?: string };
    showStore.newShow(showName);
  },

  "show:action:updateDocument": (socket, payload, ctx) => {
    const { document } = (payload ?? {}) as { document: ShowDocument };
    if (isSupportedShowVersion(document?.version)) {
      showStore.updateDocument(document);
    }
  },

  "show:action:undo": (socket, payload, ctx) => {
    showStore.undo();
  },

  "show:action:redo": (socket, payload, ctx) => {
    showStore.redo();
  },

  "show:action:save": (socket, payload, ctx) => {
    showStore.saveShow();
  },

  "scratch:set": (socket, payload, ctx) => {
    const clientId = resolveClientId(socket, payload as ScratchSetPayload);
    ctx.scratchAuthority.applySetPayload(clientId, payload as ScratchSetPayload);
    const ack = { seq: ctx.scratchAuthority.getSnapshot().seq, clientId, appliedAt: Date.now() };
    socket.emit("scratch:ack", ack);
    broadcastScratchState(ctx);
  },

  "scratch:clear": (socket, payload, ctx) => {
    const body = payload as { clientId?: string } | null;
    const clientId = body?.clientId;
    if (clientId) {
      ctx.scratchAuthority.clear(clientId);
    } else {
      ctx.scratchAuthority.clear();
    }
    broadcastScratchState(ctx);
  },

  "scratch:clear-client": (socket, _payload, ctx) => {
    const clientId = socketClientIds.get(socket);
    if (!clientId) return;
    ctx.scratchAuthority.clear(clientId);
    broadcastScratchState(ctx);
  },

  "preset:fire": (_socket, payload, ctx) => {
    ctx.io.emit("remote:preset:fire", payload);
  },

  "cue:play": (_socket, payload, ctx) => {
    ctx.io.emit("remote:cue:play", payload);
  },

  "cue:stop": (_socket, payload, ctx) => {
    ctx.io.emit("remote:cue:stop", payload);
  },

  "cue:stack:go": (_socket, payload, ctx) => {
    ctx.io.emit("remote:cue:stack:go", payload);
  },

  blackout: (_socket, payload, ctx) => {
    ctx.io.emit("remote:blackout", payload);
  },

  grandmaster: (_socket, payload, ctx) => {
    ctx.io.emit("remote:grandmaster", payload);
  },

  playbackbus: (_socket, payload, ctx) => {
    ctx.io.emit("remote:playbackbus", payload);
  },

  "executor:trigger": (_socket, payload, ctx) => {
    ctx.io.emit("remote:executor:trigger", payload);
  },

  "effect:set": (_socket, payload, ctx) => {
    ctx.io.emit("remote:effect:set", payload);
  },

  "programmer-session:event": (_socket, payload, ctx) => {
    ctx.io.emit("programmer-session:event", payload);
  },

  "programmer-session:arm": (_socket, payload, ctx) => {
    ctx.io.emit("programmer-session:arm", payload);
  },

  "programmer-session:disarm": (_socket, payload, ctx) => {
    ctx.io.emit("programmer-session:disarm", payload);
  },

  "audio:setEnabled": (_socket, payload, ctx) => {
    const enabled =
      typeof payload === "boolean" ? payload : Boolean((payload as { enabled?: boolean })?.enabled);
    ctx.io.emit("remote:audio:setEnabled", { enabled });
  },

  "audio:mappings:create": (_socket, payload, ctx) => {
    const body = payload as AudioMappingMutationPayload | null;
    if (body && typeof body === "object" && "mapping" in body) {
      ctx.io.emit("remote:audio:mappings:create", body);
    }
  },

  "audio:mappings:update": (_socket, payload, ctx) => {
    const body = payload as AudioMappingMutationPayload | null;
    if (body && typeof body === "object" && "id" in body) {
      ctx.io.emit("remote:audio:mappings:update", body);
    }
  },

  "audio:mappings:delete": (_socket, payload, ctx) => {
    const id = (payload as { id?: string })?.id;
    if (typeof id === "string" && id.length > 0) {
      ctx.io.emit("remote:audio:mappings:delete", { id });
    }
  },
};

export function registerRemoteHandlers(socket: Socket, ctx: RemoteContext): void {
  const identity = ctx.scratchAuthority.registerClient({ clientId: socket.id });
  socketClientIds.set(socket, identity.clientId);
  socket.emit("client:identity", identity);
  socket.emit("scratch:layers", ctx.scratchAuthority.getSnapshot());

  for (const [event, handler] of Object.entries(handlers)) {
    socket.on(event, (payload: unknown) => handler(socket, payload, ctx));
  }

  socket.on("disconnect", () => {
    const clientId = socketClientIds.get(socket);
    if (clientId) {
      ctx.scratchAuthority.unregisterClient(clientId);
      broadcastScratchState(ctx);
    }
  });
}
