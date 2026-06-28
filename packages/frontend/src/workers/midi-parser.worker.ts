/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  MtcAssembler,
  parseMtcQuarterFrame,
  parseMidiShowControl,
  parseMidiMessage,
  scaleMidiToDmx,
} from '@softdmx/engine';

export interface MtcFrameMessage {
  type: 'mtc';
  frame: {
    hours: number;
    minutes: number;
    seconds: number;
    frames: number;
    frameRate: number;
  };
}

export interface MscMessage {
  type: 'msc';
  command: string;
  cueNumber?: string;
}

export interface MidiActionMessage {
  type: 'message';
  deviceName?: string;
  channel: number;
  controlType: 'cc' | 'note';
  control: number;
  value: number;
  targetValue: number;
}

export type MidiWorkerResponse = MtcFrameMessage | MscMessage | MidiActionMessage;

interface MidiWorkerGlobalScope {
  onmessage: ((this: MidiWorkerGlobalScope, ev: MessageEvent<{ data: Uint8Array | number[]; deviceName?: string }>) => void) | null;
  postMessage(message: MidiWorkerResponse): void;
}

const ctx = self as unknown as MidiWorkerGlobalScope;
const mtcAssembler = new MtcAssembler();

ctx.onmessage = (e: MessageEvent<{ data: Uint8Array | number[]; deviceName?: string }>) => {
  const { data, deviceName } = e.data;
  if (!data) return;

  const mtcQuarter = parseMtcQuarterFrame(data);
  if (mtcQuarter !== null) {
    const frame = mtcAssembler.feed(mtcQuarter);
    if (frame) {
      ctx.postMessage({
        type: 'mtc',
        frame: {
          hours: frame.hours,
          minutes: frame.minutes,
          seconds: frame.seconds,
          frames: frame.frames,
          frameRate: frame.frameRate,
        },
      });
    }
    return;
  }

  const msc = parseMidiShowControl(data);
  if (msc) {
    ctx.postMessage({
      type: 'msc',
      command: msc.command,
      cueNumber: msc.cueNumber,
    });
    return;
  }

  const parsed = parseMidiMessage(data);
  if (parsed) {
    const { command, channel, control, value } = parsed;
    const controlType = command === 0xb0 ? 'cc' : 'note';
    const targetValue = scaleMidiToDmx(value);

    ctx.postMessage({
      type: 'message',
      deviceName,
      channel,
      controlType,
      control,
      value,
      targetValue,
    });
  }
};
