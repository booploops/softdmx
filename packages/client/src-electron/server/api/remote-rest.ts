/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { FastifyInstance } from "fastify";
import type { ShowAudioMapping, ShowDocument } from "@softdmx/engine";
import type { RemoteContext } from "../context";
import { isSupportedShowVersion } from "@softdmx/engine";
import {
  extractTokenFromHeaders,
  getRequiredRemoteApiToken,
  isRemoteApiTokenAuthorized,
} from "../auth/remote-token";

type ScratchSetPayload =
  | { path: string; value: number; attributeType?: string }
  | { channels: { path: string; value: number; attributeType?: string }[] };
type AudioMappingUpdatePayload = {
  id: string;
  mapping: Partial<ShowAudioMapping>;
};

function isShowDocument(payload: unknown): payload is ShowDocument {
  return (
    !!payload &&
    typeof payload === "object" &&
    isSupportedShowVersion((payload as { version?: string }).version)
  );
}

export function registerRemoteRestRoutes(server: FastifyInstance, ctx: RemoteContext): void {
  const requiredToken = getRequiredRemoteApiToken();

  server.register(
    (instance, _opts, done) => {
      if (requiredToken) {
        instance.addHook("onRequest", (request, reply, hookDone) => {
          const token = extractTokenFromHeaders(request.headers as Record<string, unknown>);
          if (!isRemoteApiTokenAuthorized(token, requiredToken)) {
            reply.code(401).send({ error: "Unauthorized" });
            return;
          }
          hookDone();
        });
      }

      instance.get("/show", (_request, reply) => {
        const show = ctx.getShow();
        if (!show) {
          reply.code(404).send({ error: "No show loaded" });
          return;
        }
        reply.send(show);
      });

      instance.post<{ Body: ShowDocument }>("/show", (request, reply) => {
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

      instance.post<{ Body: ScratchSetPayload }>("/scratch/set", (request, reply) => {
        ctx.io.emit("remote:scratch:set", request.body);
        reply.send({ ok: true });
      });

      instance.post("/scratch/clear", (_request, reply) => {
        ctx.io.emit("remote:scratch:clear");
        reply.send({ ok: true });
      });

      instance.post<{ Body: { presetId: string; fade?: number } }>(
        "/preset/fire",
        (request, reply) => {
          ctx.io.emit("remote:preset:fire", request.body);
          reply.send({ ok: true });
        },
      );

      instance.post<{ Body: { cueId: string } }>("/cue/play", (request, reply) => {
        ctx.io.emit("remote:cue:play", request.body);
        reply.send({ ok: true });
      });

      instance.post<{ Body: { cueId: string } }>("/cue/stop", (request, reply) => {
        ctx.io.emit("remote:cue:stop", request.body);
        reply.send({ ok: true });
      });

      instance.post<{ Body: { cueId: string } }>("/cue/stack/go", (request, reply) => {
        ctx.io.emit("remote:cue:stack:go", request.body);
        reply.send({ ok: true });
      });

      instance.post<{ Body: { value: boolean } | boolean }>("/blackout", (request, reply) => {
        const value =
          typeof request.body === "boolean"
            ? request.body
            : Boolean((request.body as { value?: boolean })?.value);
        ctx.io.emit("remote:blackout", value);
        reply.send({ ok: true });
      });

      instance.post<{ Body: { value: number } | number }>("/grandmaster", (request, reply) => {
        const value =
          typeof request.body === "number"
            ? request.body
            : Number((request.body as { value?: number })?.value ?? 0);
        ctx.io.emit("remote:grandmaster", Math.max(0, Math.min(1, value)));
        reply.send({ ok: true });
      });

      instance.post<{ Body: { enabled: boolean } | boolean }>(
        "/audio/enabled",
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

      instance.delete("/audio/mappings/:id", (request, reply) => {
        const id = (request.params as { id?: string })?.id;
        if (!id || typeof id !== "string") {
          reply.code(400).send({ error: "Invalid mapping id" });
          return;
        }
        ctx.io.emit("remote:audio:mappings:delete", { id });
        reply.send({ ok: true });
      });

      // Convenience route for CLI-level channel updates.
      instance.post<{
        Body: { path: string; value: number; attributeType?: string };
      }>("/channel/set", (request, reply) => {
        ctx.io.emit("remote:scratch:set", {
          path: request.body.path,
          value: request.body.value,
          attributeType: request.body.attributeType ?? "generic",
        });
        reply.send({ ok: true });
      });

      done();
    },
    { prefix: "/api/v1/remote" },
  );
}
