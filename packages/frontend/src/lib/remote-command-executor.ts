/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

type RemoteEmitter = {
  connected: boolean;
  emit: (event: string, payload?: unknown) => void;
};

export function emitRemotePresetCommand(
  socket: RemoteEmitter,
  presetId: string,
  fade?: number
): string {
  if (!socket.connected) {
    throw new Error('Remote API is not connected.');
  }
  socket.emit('remote:preset:fire', {
    presetId,
    ...(Number.isFinite(fade) ? { fade } : {}),
  });
  return `Fired preset ${presetId}`;
}

export function emitRemoteCueCommand(
  socket: RemoteEmitter,
  cueId: string,
  stop = false
): string {
  if (!socket.connected) {
    throw new Error('Remote API is not connected.');
  }
  socket.emit(stop ? 'remote:cue:stop' : 'remote:cue:play', { cueId });
  return stop ? `Stopped cue ${cueId}` : `Playing cue ${cueId}`;
}

