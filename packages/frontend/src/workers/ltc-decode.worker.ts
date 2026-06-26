/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Decoder } from "linear-timecode";

type InitMessage = {
  type: "init";
  sampleRate: number;
};

type DecodeMessage = {
  type: "decode";
  requestId: number;
  samples: Float32Array;
};

type LtcWorkerMessage = InitMessage | DecodeMessage;

type LtcWorkerResponse =
  | {
      type: "decoded";
      requestId: number;
      frame: {
        hours: number;
        minutes: number;
        seconds: number;
        frames: number;
        framerate?: number;
      } | null;
    }
  | {
      type: "error";
      requestId: number;
      error: string;
    };

let decoder: InstanceType<typeof Decoder> | null = null;
let pendingFrame: {
  hours: number;
  minutes: number;
  seconds: number;
  frames: number;
  framerate?: number;
} | null = null;

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<LtcWorkerMessage>) => void) | null;
  postMessage: (message: LtcWorkerResponse) => void;
};

scope.onmessage = (event: MessageEvent<LtcWorkerMessage>) => {
  const message = event.data;
  if (message.type === "init") {
    decoder = new Decoder(message.sampleRate);
    decoder.on("frame", (frame) => {
      pendingFrame = {
        hours: frame.hours,
        minutes: frame.minutes,
        seconds: frame.seconds,
        frames: frame.frames,
        framerate: frame.framerate,
      };
    });
    return;
  }

  if (message.type !== "decode") return;

  try {
    if (!decoder) {
      scope.postMessage({
        type: "decoded",
        requestId: message.requestId,
        frame: null,
      });
      return;
    }
    pendingFrame = null;
    decoder.decode(Array.from(message.samples));
    scope.postMessage({
      type: "decoded",
      requestId: message.requestId,
      frame: pendingFrame,
    });
  } catch (error) {
    scope.postMessage({
      type: "error",
      requestId: message.requestId,
      error: error instanceof Error ? error.message : "LTC worker decode failure",
    });
  }
};
