/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Server, Socket } from 'socket.io';
import type { ShowAudioMapping, ShowDocumentV1 } from 'src/types/show-document';
import type { OutputManager } from '../output/OutputManager';
import { isSupportedShowVersion } from 'src/utils/show-version';

export interface RemoteContext {
  io: Server;
  outputManager: OutputManager;
  getShow: () => ShowDocumentV1 | null;
  setShow: (show: ShowDocumentV1) => void;
  onMergeRequest?: () => void;
}

type RemoteHandler = (socket: Socket, payload: unknown, ctx: RemoteContext) => void;
type AudioMappingMutationPayload =
  | { mapping: ShowAudioMapping }
  | { id: string; mapping: Partial<ShowAudioMapping> };
const handlers: Record<string, RemoteHandler> = {
  'show:get': (socket, _payload, ctx) => {
    const show = ctx.getShow();
    if (show) socket.emit('show:state', show);
  },

  'show:load': (socket, payload, ctx) => {
    const show = payload as ShowDocumentV1;
    if (isSupportedShowVersion(show?.version)) {
      ctx.setShow(show);
      ctx.outputManager.setShowfile(show);
      ctx.io.emit('show:state', show);
    }
  },

  'scratch:set': (_socket, payload, ctx) => {
    ctx.io.emit('remote:scratch:set', payload);
  },

  'scratch:clear': (_socket, _payload, ctx) => {
    ctx.io.emit('remote:scratch:clear');
  },

  'preset:fire': (_socket, payload, ctx) => {
    ctx.io.emit('remote:preset:fire', payload);
  },

  'cue:play': (_socket, payload, ctx) => {
    ctx.io.emit('remote:cue:play', payload);
  },

  'cue:stop': (_socket, payload, ctx) => {
    ctx.io.emit('remote:cue:stop', payload);
  },

  'cue:stack:go': (_socket, payload, ctx) => {
    ctx.io.emit('remote:cue:stack:go', payload);
  },

  'blackout': (_socket, payload, ctx) => {
    ctx.io.emit('remote:blackout', payload);
  },

  'grandmaster': (_socket, payload, ctx) => {
    ctx.io.emit('remote:grandmaster', payload);
  },

  'playbackbus': (_socket, payload, ctx) => {
    ctx.io.emit('remote:playbackbus', payload);
  },

  'executor:trigger': (_socket, payload, ctx) => {
    ctx.io.emit('remote:executor:trigger', payload);
  },

  'effect:set': (_socket, payload, ctx) => {
    ctx.io.emit('remote:effect:set', payload);
  },

  'audio:setEnabled': (_socket, payload, ctx) => {
    const enabled = typeof payload === 'boolean'
      ? payload
      : Boolean((payload as { enabled?: boolean })?.enabled);
    ctx.io.emit('remote:audio:setEnabled', { enabled });
  },

  'audio:mappings:create': (_socket, payload, ctx) => {
    const body = payload as AudioMappingMutationPayload | null;
    if (body && typeof body === 'object' && 'mapping' in body) {
      ctx.io.emit('remote:audio:mappings:create', body);
    }
  },

  'audio:mappings:update': (_socket, payload, ctx) => {
    const body = payload as AudioMappingMutationPayload | null;
    if (body && typeof body === 'object' && 'id' in body) {
      ctx.io.emit('remote:audio:mappings:update', body);
    }
  },

  'audio:mappings:delete': (_socket, payload, ctx) => {
    const id = (payload as { id?: string })?.id;
    if (typeof id === 'string' && id.length > 0) {
      ctx.io.emit('remote:audio:mappings:delete', { id });
    }
  },
};

export function registerRemoteHandlers(socket: Socket, ctx: RemoteContext): void {
  for (const [event, handler] of Object.entries(handlers)) {
    socket.on(event, (payload: unknown) => handler(socket, payload, ctx));
  }
}

export function attachChannelPipeline(
  io: Server,
  outputManager: OutputManager
): void {
  io.on('connection', (socket) => {
    socket.on('channels:state', (channels) => {
      io.emit('channels:state', channels);
      outputManager.handleChannelUpdate(channels);
    });

    // Legacy alias
    socket.on('channels:update', (channels) => {
      io.emit('channels:state', channels);
      outputManager.handleChannelUpdate(channels);
    });

    socket.on('show:state', (showfile) => {
      if (showfile) {
        outputManager.setShowfile(showfile);
        // Broadcast to other clients only — avoid echoing back to the sender
        socket.broadcast.emit('show:state', showfile);
      }
    });

    // Legacy alias
    socket.on('showfile:update', (showfile) => {
      if (showfile) {
        outputManager.setShowfile(showfile);
      }
    });
  });
}
