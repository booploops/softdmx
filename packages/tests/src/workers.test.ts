/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { test } from 'node:test';
import { vi } from 'vitest';
import assert from 'node:assert/strict';
import { createSampleGdtfBytes } from './fixtures/sample-gdtf.ts';
import type {
  MidiWorkerResponse,
  MtcFrameMessage,
  MscMessage,
  MidiActionMessage,
} from '../../frontend/src/workers/midi-parser.worker.ts';

// 1. Mock worker_threads and output driver dependencies for output-worker testing
const mockPostMessage = vi.fn();
let parentPortMessageHandler: ((msg: { type: string; [key: string]: any }) => void) | null = null;

const mockOn = vi.fn((event: string, handler: (msg: { type: string; [key: string]: any }) => void) => {
  if (event === 'message') {
    parentPortMessageHandler = handler;
  }
});

vi.mock('node:worker_threads', () => ({
  parentPort: {
    postMessage: mockPostMessage,
    on: mockOn,
  },
}));

vi.mock('../../client/src-electron/output/drivers/artnet-driver', () => ({
  ArtNetDriver: class {
    initialize = vi.fn().mockResolvedValue(undefined);
    send = vi.fn();
    destroy = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock('../../client/src-electron/output/drivers/sacn-driver', () => ({
  SacnDriver: class {
    initialize = vi.fn().mockResolvedValue(undefined);
    send = vi.fn();
    destroy = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock('../../client/src-electron/output/drivers/dmx-usb-pro-driver', () => ({
  DmxUsbProDriver: class {
    initialize = vi.fn().mockResolvedValue(undefined);
    send = vi.fn();
    destroy = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock('../../client/src-electron/fixture-lookup', () => ({
  getFixtureDefinitionFromDisk: vi.fn().mockReturnValue({
    id: 'test-fixture',
    name: 'Test Fixture',
    channels: [{ name: 'Dimmer' }],
  }),
}));

// Test the GDTF Parser Web Worker
test('GDTF Parser Web Worker processes valid GDTF bytes asynchronously', async () => {
  const mockMessages: { type: string; [key: string]: any }[] = [];
  const mockSelf = {
    postMessage: (msg: { type: string; [key: string]: any }) => {
      mockMessages.push(msg);
    },
    onmessage: null as unknown as ((ev: MessageEvent<{ bytes: Uint8Array; fileName?: string }>) => void) | null,
  };

  global.self = mockSelf as unknown as typeof globalThis;

  // Import the worker to set it up
  await import('../../frontend/src/workers/gdtf-parser.worker.ts');

  assert.ok(mockSelf.onmessage);

  const bytes = createSampleGdtfBytes();
  mockSelf.onmessage!({
    data: { bytes, fileName: 'sample-wash.gdtf' },
  } as MessageEvent<{ bytes: Uint8Array; fileName?: string }>);

  assert.equal(mockMessages.length, 1);
  const response = mockMessages[0];
  assert.equal(response.type, 'success');
  assert.equal(response.fixture.id, 'Sample_Wash');
  assert.equal(response.fixture.name, 'Sample Wash');
});

// Test the MIDI Parser Web Worker
test('MIDI Parser Web Worker handles MIDI, MSC, and MTC messages correctly', async () => {
  const mockMessages: MidiWorkerResponse[] = [];
  const mockSelf = {
    postMessage: (msg: MidiWorkerResponse) => {
      mockMessages.push(msg);
    },
    onmessage: null as unknown as ((ev: MessageEvent<{ data: Uint8Array | number[] }>) => void) | null,
  };

  global.self = mockSelf as unknown as typeof globalThis;

  await import('../../frontend/src/workers/midi-parser.worker.ts');

  assert.ok(mockSelf.onmessage);

  // 1. Test standard midi message (Note On)
  mockSelf.onmessage!({
    data: { data: new Uint8Array([0x90, 60, 100]) },
  } as MessageEvent<{ data: Uint8Array | number[] }>);

  assert.equal(mockMessages.length, 1);
  const resp1 = mockMessages[0] as MidiActionMessage;
  assert.equal(resp1.type, 'message');
  assert.equal(resp1.channel, 1);
  assert.equal(resp1.controlType, 'note');
  assert.equal(resp1.control, 60);
  assert.equal(resp1.value, 100);
  assert.equal(resp1.targetValue, 201); // 100 / 127 * 255 = 201 rounded

  // 2. Test MTC quarter frame assembly
  mockMessages.length = 0;
  for (let i = 0; i < 8; i++) {
    mockSelf.onmessage!({
      data: { data: new Uint8Array([0xf1, (i << 4) | 0x00]) }, // feed MTC quarter frames with 0x00 nibbles
    } as MessageEvent<{ data: Uint8Array | number[] }>);
  }

  assert.equal(mockMessages.length, 1);
  const resp2 = mockMessages[0] as MtcFrameMessage;
  assert.equal(resp2.type, 'mtc');
  assert.equal(resp2.frame.hours, 0);
  assert.equal(resp2.frame.minutes, 0);
  assert.equal(resp2.frame.seconds, 0);

  // 3. Test MIDI Show Control GO message
  mockMessages.length = 0;
  mockSelf.onmessage!({
    data: { data: new Uint8Array([0xf0, 0x7f, 0x7f, 0x02, 0x01, 0x31, 0x2e, 0x35, 0x00, 0xf7]) },
  } as MessageEvent<{ data: Uint8Array | number[] }>);

  assert.equal(mockMessages.length, 1);
  const resp3 = mockMessages[0] as MscMessage;
  assert.equal(resp3.type, 'msc');
  assert.equal(resp3.command, 'go');
  assert.equal(resp3.cueNumber, '1.5');
});

// Test the DMX Output Node Worker
test('DMX Output Node Worker correctly processes channel outputs and updates health status', async () => {
  // Import the output-worker file which listens on parentPort
  await import('../../client/src-electron/output/output-worker.ts');

  assert.ok(parentPortMessageHandler);

  // Send an init message to set up output destinations
  parentPortMessageHandler({
    type: 'init',
    destinations: [
      {
        id: 'dest-artnet',
        type: 'artnet',
        role: 'primary',
        name: 'ArtNet Output',
        settings: { Host: '127.0.0.1', Port: 6454, Universe: 0 },
      },
    ],
  });

  // Yield to the event loop to let asynchronous updates complete
  await new Promise((resolve) => setTimeout(resolve, 0));

  // Verify health status was posted back
  assert.ok(mockPostMessage.mock.calls.length > 0);
  const lastHealthMsg = mockPostMessage.mock.calls[mockPostMessage.mock.calls.length - 1][0];
  assert.equal(lastHealthMsg.type, 'health-status');
  assert.ok(Array.isArray(lastHealthMsg.statuses));
  assert.equal(lastHealthMsg.statuses[0].destinationId, 'dest-artnet');

  // Send an active channel update
  mockPostMessage.mockClear();
  parentPortMessageHandler({
    type: 'handleChannelUpdate',
    channels: [
      {
        id: 1,
        universe: 'dest-artnet',
        value: 255,
        path: 'direct', // non-empty path so it doesn't get skipped
      },
    ],
  });

  // Yield to let the channel update finish
  await new Promise((resolve) => setTimeout(resolve, 0));

  // Health status and output driver send should occur
  assert.ok(mockPostMessage.mock.calls.length > 0);
  const updateMsg = mockPostMessage.mock.calls.find((call) => call[0]?.type === 'health-status')?.[0];
  assert.ok(updateMsg, 'expected health-status message');
  assert.equal(updateMsg.type, 'health-status');
  assert.equal(updateMsg.statuses[0].channelCount, 1);
});
