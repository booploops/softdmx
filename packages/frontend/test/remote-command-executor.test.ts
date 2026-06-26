/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import {
  emitRemoteCueCommand,
  emitRemotePresetCommand,
} from '../src/lib/remote-command-executor.ts';

type EmitCall = { event: string; payload: unknown };

function createSocket(connected: boolean) {
  const calls: EmitCall[] = [];
  return {
    connected,
    calls,
    emit(event: string, payload?: unknown) {
      calls.push({ event, payload });
    },
  };
}

console.log('Running test: preset command requires connected socket');
{
  const socket = createSocket(false);
  assert.throws(
    () => emitRemotePresetCommand(socket, 'preset-1'),
    /Remote API is not connected\./
  );
  assert.equal(socket.calls.length, 0);
}

console.log('Running test: preset command emits expected payload');
{
  const socket = createSocket(true);
  const message = emitRemotePresetCommand(socket, 'preset-1', 250);
  assert.equal(message, 'Fired preset preset-1');
  assert.deepEqual(socket.calls, [
    { event: 'remote:preset:fire', payload: { presetId: 'preset-1', fade: 250 } },
  ]);
}

console.log('Running test: cue play emits play event');
{
  const socket = createSocket(true);
  const message = emitRemoteCueCommand(socket, 'cue-1', false);
  assert.equal(message, 'Playing cue cue-1');
  assert.deepEqual(socket.calls, [
    { event: 'remote:cue:play', payload: { cueId: 'cue-1' } },
  ]);
}

console.log('Running test: cue stop emits stop event');
{
  const socket = createSocket(true);
  const message = emitRemoteCueCommand(socket, 'cue-1', true);
  assert.equal(message, 'Stopped cue cue-1');
  assert.deepEqual(socket.calls, [
    { event: 'remote:cue:stop', payload: { cueId: 'cue-1' } },
  ]);
}

console.log('All remote command executor tests passed.');

