/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Hono } from "hono";
import type { Context } from "hono";
import type { HttpBindings } from "@hono/node-server";
import type { ShowAudioMapping, ShowDocument } from "@softdmx/engine";
import type { RemoteContext } from "../context";
import { isSupportedShowVersion } from "@softdmx/engine";
import {
  extractTokenFromHeaders,
  getRequiredRemoteApiToken,
  isRemoteApiTokenAuthorized,
} from "../auth/remote-token";

type ScratchSetPayload =
  | { path: string; value: number; attributeType?: string; clientId?: string }
  | { channels: { path: string; value: number; attributeType?: string }[]; clientId?: string };
type AudioMappingUpdatePayload = {
  id: string;
  mapping: Partial<ShowAudioMapping>;
};

const REMOTE_RATE_LIMIT_WINDOW_MS = 60_000;
const REMOTE_RATE_LIMIT_MAX_REQUESTS = 240;

const clientRequests = new Map<string, { count: number; resetAt: number }>();

function cleanRateLimitCache() {
  const now = Date.now();
  for (const [key, record] of clientRequests.entries()) {
    if (now > record.resetAt) {
      clientRequests.delete(key);
    }
  }
}

// Every minute, prune expired rate-limit records
setInterval(cleanRateLimitCache, 60_000).unref?.();

function getClientIp(c: Context<{ Bindings: HttpBindings }>): string {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
;
  }
  return c.env?.incoming?.socket?.remoteAddress || "unknown";
}

function isShowDocument(payload: unknown): payload is ShowDocument {
  return (
    !!payload &&
    typeof payload === "object" &&
    isSupportedShowVersion((payload as { version?: string }).version)
  );
}

export function registerRemoteRestRoutes(app: Hono<{ Bindings: HttpBindings }>, ctx: RemoteContext): void {
  const requiredToken = getRequiredRemoteApiToken();

  const remoteRouter = new Hono<{ Bindings: HttpBindings }>();

  // Custom rate-limiting middleware
  remoteRouter.use("*", async (c, next) => {
    const token = extractTokenFromHeaders(c.req.header());
    const clientKey = token ? `token:${token}` : `ip:${getClientIp(c)}`;

    const now = Date.now();
    let record = clientRequests.get(clientKey);

    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + REMOTE_RATE_LIMIT_WINDOW_MS };
      clientRequests.set(clientKey, record);
    }

    record.count++;

    if (record.count > REMOTE_RATE_LIMIT_MAX_REQUESTS) {
      c.status(429);
      return c.json({
        error: "Too many requests",
        max: REMOTE_RATE_LIMIT_MAX_REQUESTS,
        timeWindow: Math.max(0, Math.ceil((record.resetAt - now) / 1000)),
      });
    }

    await next();
  });

  // Custom authorization middleware
  remoteRouter.use("*", async (c, next) => {
    if (requiredToken) {
      const token = extractTokenFromHeaders(c.req.header());
      if (!isRemoteApiTokenAuthorized(token, requiredToken)) {
        c.status(401);
        return c.json({ error: "Unauthorized" });
      }
    }
    await next();
  });

  remoteRouter.get("/show", (c) => {
    const show = ctx.getShow();
    if (!show) {
      c.status(404);
      return c.json({ error: "No show loaded" });
    }
    return c.json(show);
  });

  remoteRouter.get("/scratch", (c) => {
    return c.json(ctx.scratchAuthority.getSnapshot());
  });

  remoteRouter.get("/scratch/clients", (c) => {
    return c.json({
      clients: ctx.scratchAuthority.listClients(),
      layers: ctx.scratchAuthority.getLayers(),
    });
  });

  remoteRouter.get("/sessions", (c) => {
    const show = ctx.getShow();
    return c.json({
      sessions: show?.timeline?.programmerSessions ?? [],
    });
  });

  remoteRouter.get("/sessions/:id", (c) => {
    const show = ctx.getShow();
    const id = c.req.param("id");
    const session = show?.timeline?.programmerSessions?.find((entry) => entry.id === id);
    if (!session) {
      c.status(404);
      return c.json({ error: "Session not found" });
    }
    return c.json(session);
  });

  remoteRouter.post("/sessions/arm", async (c) => {
    let body: { sessionId?: string; clock?: string } | undefined;
    try {
      body = await c.req.json();
    } catch {
      // Empty or invalid JSON
    }
    const sessionId = body?.sessionId ?? `session-${Date.now()}`;
    ctx.io.emit("programmer-session:arm", {
      sessionId,
      clock: body?.clock ?? "session",
    });
    return c.json({ ok: true, sessionId });
  });

  remoteRouter.post("/sessions/disarm", async (c) => {
    let body: { sessionId?: string; persist?: boolean } | undefined;
    try {
      body = await c.req.json();
    } catch {
      // Empty or invalid JSON
    }
    ctx.io.emit("programmer-session:disarm", {
      sessionId: body?.sessionId,
      persist: body?.persist !== false,
    });
    return c.json({ ok: true });
  });

  remoteRouter.post("/show", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      c.status(400);
      return c.json({ error: "Invalid show document payload" });
    }
    if (!isShowDocument(body)) {
      c.status(400);
      return c.json({ error: "Invalid show document payload" });
    }

    ctx.setShow(body);
    ctx.outputManager.setShowfile(body);
    ctx.io.emit("show:state", body);
    return c.json({ ok: true });
  });

  remoteRouter.post("/scratch/set", async (c) => {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      c.status(400);
      return c.json({ error: "Invalid payload" });
    }
    const token = extractTokenFromHeaders(c.req.header());
    const clientKey = token ? `token:${token}` : `ip:${getClientIp(c)}`;
    const clientId = body?.clientId ?? `rest:${clientKey}`;
    const ack = ctx.scratchAuthority.applySetPayload(clientId, body);
    const snapshot = ctx.scratchAuthority.getSnapshot();
    ctx.io.emit("scratch:layers", snapshot);
    ctx.io.emit("scratch:state", snapshot);
    if (snapshot.conflicts.length > 0) {
      ctx.io.emit("scratch:conflicts", snapshot.conflicts);
    }
    if (snapshot.merged.length === 0) {
      ctx.io.emit("remote:scratch:clear");
    } else if (snapshot.merged.length === 1) {
      const entry = snapshot.merged[0]!;
      ctx.io.emit("remote:scratch:set", {
        path: entry.path,
        value: entry.value,
        attributeType: entry.attributeType,
      });
    } else {
      ctx.io.emit("remote:scratch:set", {
        channels: snapshot.merged.map((entry) => ({
          path: entry.path,
          value: entry.value,
          attributeType: entry.attributeType,
        })),
      });
    }
    return c.json({ ok: true, ack, seq: snapshot.seq });
  });

  remoteRouter.post("/scratch/clear", async (c) => {
    let body: { clientId?: string } | undefined;
    try {
      body = await c.req.json();
    } catch {
      // Empty or invalid JSON
    }
    const clientId = body?.clientId;
    if (clientId) {
      ctx.scratchAuthority.clear(clientId);
    } else {
      ctx.scratchAuthority.clear();
    }
    const snapshot = ctx.scratchAuthority.getSnapshot();
    ctx.io.emit("scratch:layers", snapshot);
    ctx.io.emit("scratch:state", snapshot);
    ctx.io.emit("remote:scratch:clear");
    return c.json({ ok: true, seq: snapshot.seq });
  });

  remoteRouter.post("/preset/fire", async (c) => {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      c.status(400);
      return c.json({ error: "Invalid payload" });
    }
    ctx.io.emit("remote:preset:fire", body);
    return c.json({ ok: true });
  });

  remoteRouter.post("/cue/play", async (c) => {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      c.status(400);
      return c.json({ error: "Invalid payload" });
    }
    ctx.io.emit("remote:cue:play", body);
    return c.json({ ok: true });
  });

  remoteRouter.post("/cue/stop", async (c) => {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      c.status(400);
      return c.json({ error: "Invalid payload" });
    }
    ctx.io.emit("remote:cue:stop", body);
    return c.json({ ok: true });
  });

  remoteRouter.post("/cue/stack/go", async (c) => {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      c.status(400);
      return c.json({ error: "Invalid payload" });
    }
    ctx.io.emit("remote:cue:stack:go", body);
    return c.json({ ok: true });
  });

  remoteRouter.post("/blackout", async (c) => {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      // Body might be raw boolean, or object
    }
    const value =
      typeof body === "boolean"
        ? body
        : Boolean((body as { value?: boolean })?.value);
    ctx.io.emit("remote:blackout", value);
    return c.json({ ok: true });
  });

  remoteRouter.post("/grandmaster", async (c) => {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      // Body might be raw number, or object
    }
    const value =
      typeof body === "number"
        ? body
        : Number((body as { value?: number })?.value ?? 0);
    ctx.io.emit("remote:grandmaster", Math.max(0, Math.min(1, value)));
    return c.json({ ok: true });
  });

  remoteRouter.post("/audio/enabled", async (c) => {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      // Body might be raw boolean, or object
    }
    const enabled =
      typeof body === "boolean"
        ? body
        : Boolean((body as { enabled?: boolean })?.enabled);
    ctx.io.emit("remote:audio:setEnabled", { enabled });
    return c.json({ ok: true });
  });

  remoteRouter.post("/audio/mappings", async (c) => {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      c.status(400);
      return c.json({ error: "Invalid payload" });
    }
    const mapping = body?.mapping;
    if (!mapping || typeof mapping.id !== "string" || mapping.id.length === 0) {
      c.status(400);
      return c.json({ error: "Invalid mapping payload" });
    }
    ctx.io.emit("remote:audio:mappings:create", { mapping });
    return c.json({ ok: true });
  });

  remoteRouter.patch("/audio/mappings/:id", async (c) => {
    const id = c.req.param("id");
    if (!id || typeof id !== "string") {
      c.status(400);
      return c.json({ error: "Invalid mapping id" });
    }
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      // Empty/invalid body
    }
    ctx.io.emit("remote:audio:mappings:update", {
      id,
      mapping: body?.mapping ?? {},
    });
    return c.json({ ok: true });
  });

  remoteRouter.delete("/audio/mappings/:id", (c) => {
    const id = c.req.param("id");
    if (!id || typeof id !== "string") {
      c.status(400);
      return c.json({ error: "Invalid mapping id" });
    }
    ctx.io.emit("remote:audio:mappings:delete", { id });
    return c.json({ ok: true });
  });

  remoteRouter.post("/channel/set", async (c) => {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      c.status(400);
      return c.json({ error: "Invalid payload" });
    }
    const token = extractTokenFromHeaders(c.req.header());
    const clientKey = token ? `token:${token}` : `ip:${getClientIp(c)}`;
    const clientId = body?.clientId ?? `rest:${clientKey}`;
    const ack = ctx.scratchAuthority.applySetPayload(clientId, {
      path: body.path,
      value: body.value,
      attributeType: body.attributeType ?? "generic",
    });
    const snapshot = ctx.scratchAuthority.getSnapshot();
    ctx.io.emit("scratch:layers", snapshot);
    ctx.io.emit("scratch:state", snapshot);
    ctx.io.emit("remote:scratch:set", {
      path: body.path,
      value: body.value,
      attributeType: body.attributeType ?? "generic",
    });
    return c.json({ ok: true, ack, seq: snapshot.seq });
  });

  app.route("/api/v1/remote", remoteRouter);
}
