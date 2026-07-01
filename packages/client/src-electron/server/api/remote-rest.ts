/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { FastifyInstance } from "fastify";
import fastifyRateLimit from "@fastify/rate-limit";
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

function isShowDocument(payload: unknown): payload is ShowDocument {
  return (
    !!payload &&
    typeof payload === "object" &&
    isSupportedShowVersion((payload as { version?: string }).version)
  );
}

export function registerRemoteRestRoutes(server: FastifyInstance, ctx: RemoteContext): void {
  const requiredToken = getRequiredRemoteApiToken();

  function resolveClientKey(request: { ip: string; headers: Record<string, unknown> }): string {
    const token = extractTokenFromHeaders(request.headers);
    if (token) return `token:${token}`;
    return `ip:${request.ip}`;
  }

  server.register(
    (instance, _opts, done) => {
      const routeRateLimitOptions = {
        max: REMOTE_RATE_LIMIT_MAX_REQUESTS,
        timeWindow: REMOTE_RATE_LIMIT_WINDOW_MS,
        keyGenerator: (request: { ip: string; headers: Record<string, unknown> }) =>
          resolveClientKey({
            ip: request.ip,
            headers: request.headers,
          }),
        errorResponseBuilder: (_request: unknown, context: { max: number; after: number }) => ({
          error: "Too many requests",
          max: context.max,
          timeWindow: context.after,
        }),
      };

      const authorizeRequest = (
        request: { headers: Record<string, unknown> },
        reply: { code: (statusCode: number) => { send: (payload: unknown) => void } },
        hookDone: () => void,
      ) => {
        if (requiredToken) {
          const token = extractTokenFromHeaders(request.headers);
          if (!isRemoteApiTokenAuthorized(token, requiredToken)) {
            reply.code(401).send({ error: "Unauthorized" });
            return;
          }
        }
        hookDone();
      };

      instance.register(fastifyRateLimit, {
        global: false,
        ...routeRateLimitOptions,
      });

      const protectedRouteOptions = {
        config: {
          rateLimit: routeRateLimitOptions,
        },
        preHandler: authorizeRequest,
      } as const;

      instance.get("/show", protectedRouteOptions, (_request, reply) => {
        const show = ctx.getShow();
        if (!show) {
          reply.code(404).send({ error: "No show loaded" });
          return;
        }
        reply.send(show);
      });

      instance.get("/scratch", protectedRouteOptions, (_request, reply) => {
        reply.send(ctx.scratchAuthority.getSnapshot());
      });

      instance.get("/scratch/clients", protectedRouteOptions, (_request, reply) => {
        reply.send({
          clients: ctx.scratchAuthority.listClients(),
          layers: ctx.scratchAuthority.getLayers(),
        });
      });

      instance.get("/sessions", protectedRouteOptions, (_request, reply) => {
        const show = ctx.getShow();
        reply.send({
          sessions: show?.timeline?.programmerSessions ?? [],
        });
      });

      instance.get<{ Params: { id: string } }>("/sessions/:id", protectedRouteOptions, (request, reply) => {
        const show = ctx.getShow();
        const session = show?.timeline?.programmerSessions?.find((entry) => entry.id === request.params.id);
        if (!session) {
          reply.code(404).send({ error: "Session not found" });
          return;
        }
        reply.send(session);
      });

      instance.post<{ Body: { sessionId?: string; clock?: string } }>(
        "/sessions/arm",
        protectedRouteOptions,
        (request, reply) => {
          const sessionId = request.body?.sessionId ?? `session-${Date.now()}`;
          ctx.io.emit("programmer-session:arm", {
            sessionId,
            clock: request.body?.clock ?? "session",
          });
          reply.send({ ok: true, sessionId });
        },
      );

      instance.post<{ Body: { sessionId?: string; persist?: boolean } }>(
        "/sessions/disarm",
        protectedRouteOptions,
        (request, reply) => {
          ctx.io.emit("programmer-session:disarm", {
            sessionId: request.body?.sessionId,
            persist: request.body?.persist !== false,
          });
          reply.send({ ok: true });
        },
      );

      instance.post<{ Body: ShowDocument }>("/show", protectedRouteOptions, (request, reply) => {
        const body = request.body;
        if (!isShowDocument(body)) {
          reply.code(400).send({ error: "Invalid show document payload" });
          return;
        }

        ctx.setShow(body);
        ctx.outputManager.setShowfile(body);
        ctx.io.emit("show:state", body);
        reply.send({ ok: true });
      });

      instance.post<{ Body: ScratchSetPayload }>("/scratch/set", protectedRouteOptions, (request, reply) => {
        const clientId = request.body?.clientId ?? `rest:${resolveClientKey(request)}`;
        const ack = ctx.scratchAuthority.applySetPayload(clientId, request.body);
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
        reply.send({ ok: true, ack, seq: snapshot.seq });
      });

      instance.post<{ Body: { clientId?: string } | undefined }>(
        "/scratch/clear",
        protectedRouteOptions,
        (request, reply) => {
          const clientId = request.body?.clientId;
          if (clientId) {
            ctx.scratchAuthority.clear(clientId);
          } else {
            ctx.scratchAuthority.clear();
          }
          const snapshot = ctx.scratchAuthority.getSnapshot();
          ctx.io.emit("scratch:layers", snapshot);
          ctx.io.emit("scratch:state", snapshot);
          ctx.io.emit("remote:scratch:clear");
          reply.send({ ok: true, seq: snapshot.seq });
        },
      );

      instance.post<{ Body: { presetId: string; fade?: number } }>(
        "/preset/fire",
        protectedRouteOptions,
        (request, reply) => {
          ctx.io.emit("remote:preset:fire", request.body);
          reply.send({ ok: true });
        },
      );

      instance.post<{ Body: { cueId: string } }>("/cue/play", protectedRouteOptions, (request, reply) => {
        ctx.io.emit("remote:cue:play", request.body);
        reply.send({ ok: true });
      });

      instance.post<{ Body: { cueId: string } }>("/cue/stop", protectedRouteOptions, (request, reply) => {
        ctx.io.emit("remote:cue:stop", request.body);
        reply.send({ ok: true });
      });

      instance.post<{ Body: { cueId: string } }>("/cue/stack/go", protectedRouteOptions, (request, reply) => {
        ctx.io.emit("remote:cue:stack:go", request.body);
        reply.send({ ok: true });
      });

      instance.post<{ Body: { value: boolean } | boolean }>("/blackout", protectedRouteOptions, (request, reply) => {
        const value =
          typeof request.body === "boolean"
            ? request.body
            : Boolean((request.body as { value?: boolean })?.value);
        ctx.io.emit("remote:blackout", value);
        reply.send({ ok: true });
      });

      instance.post<{ Body: { value: number } | number }>("/grandmaster", protectedRouteOptions, (request, reply) => {
        const value =
          typeof request.body === "number"
            ? request.body
            : Number((request.body as { value?: number })?.value ?? 0);
        ctx.io.emit("remote:grandmaster", Math.max(0, Math.min(1, value)));
        reply.send({ ok: true });
      });

      instance.post<{ Body: { enabled: boolean } | boolean }>(
        "/audio/enabled",
        protectedRouteOptions,
        (request, reply) => {
          const enabled =
            typeof request.body === "boolean"
              ? request.body
              : Boolean((request.body as { enabled?: boolean })?.enabled);
          ctx.io.emit("remote:audio:setEnabled", { enabled });
          reply.send({ ok: true });
        },
      );

      instance.post<{ Body: { mapping: ShowAudioMapping } }>(
        "/audio/mappings",
        protectedRouteOptions,
        (request, reply) => {
          const mapping = request.body?.mapping;
          if (!mapping || typeof mapping.id !== "string" || mapping.id.length === 0) {
            reply.code(400).send({ error: "Invalid mapping payload" });
            return;
          }
          ctx.io.emit("remote:audio:mappings:create", { mapping });
          reply.send({ ok: true });
        },
      );

      instance.patch<{ Body: AudioMappingUpdatePayload }>(
        "/audio/mappings/:id",
        protectedRouteOptions,
        (request, reply) => {
          const id = (request.params as { id?: string })?.id;
          if (!id || typeof id !== "string") {
            reply.code(400).send({ error: "Invalid mapping id" });
            return;
          }
          ctx.io.emit("remote:audio:mappings:update", {
            id,
            mapping: request.body?.mapping ?? {},
          });
          reply.send({ ok: true });
        },
      );

      instance.delete("/audio/mappings/:id", protectedRouteOptions, (request, reply) => {
        const id = (request.params as { id?: string })?.id;
        if (!id || typeof id !== "string") {
          reply.code(400).send({ error: "Invalid mapping id" });
          return;
        }
        ctx.io.emit("remote:audio:mappings:delete", { id });
        reply.send({ ok: true });
      });

      instance.post<{
        Body: { path: string; value: number; attributeType?: string; clientId?: string };
      }>("/channel/set", protectedRouteOptions, (request, reply) => {
        const clientId = request.body.clientId ?? `rest:${resolveClientKey(request)}`;
        const ack = ctx.scratchAuthority.applySetPayload(clientId, {
          path: request.body.path,
          value: request.body.value,
          attributeType: request.body.attributeType ?? "generic",
        });
        const snapshot = ctx.scratchAuthority.getSnapshot();
        ctx.io.emit("scratch:layers", snapshot);
        ctx.io.emit("scratch:state", snapshot);
        ctx.io.emit("remote:scratch:set", {
          path: request.body.path,
          value: request.body.value,
          attributeType: request.body.attributeType ?? "generic",
        });
        reply.send({ ok: true, ack, seq: snapshot.seq });
      });

      done();
    },
    { prefix: "/api/v1/remote" },
  );
}
