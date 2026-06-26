/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export type MtcFrameRate = 24 | 25 | 29.97 | 30;

export type ParsedMtcFrame = {
  hours: number;
  minutes: number;
  seconds: number;
  frames: number;
  frameRate: MtcFrameRate;
  dropFrame: boolean;
};

const MTC_FRAME_RATES: MtcFrameRate[] = [24, 25, 29.97, 30];

export function parseMtcQuarterFrame(
  data: Uint8Array | number[],
): number | null {
  if (!data || data.length < 2) return null;
  if (data[0] !== 0xf1) return null;
  const value = data[1];
  if (value === undefined) return null;
  return value;
}

export class MtcAssembler {
  private parts = Array.from({ length: 8 }, () => 0);

  reset(): void {
    this.parts.fill(0);
  }

  feed(quarterFrameByte: number): ParsedMtcFrame | null {
    const piece = (quarterFrameByte >> 4) & 0x07;
    const nibble = quarterFrameByte & 0x0f;
    this.parts[piece] = nibble;

    if (piece !== 7) return null;

    const frames = (this.parts[0] ?? 0) | ((this.parts[1] ?? 0) << 4);
    const seconds = (this.parts[2] ?? 0) | ((this.parts[3] ?? 0) << 4);
    const minutes = (this.parts[4] ?? 0) | ((this.parts[5] ?? 0) << 4);
    const hours = (this.parts[6] ?? 0) | (((this.parts[7] ?? 0) & 0x01) << 4);
    const rateBits = ((this.parts[7] ?? 0) >> 1) & 0x03;
    const frameRate = MTC_FRAME_RATES[rateBits] ?? 30;
    const dropFrame = rateBits === 2;

    this.reset();

    return {
      hours,
      minutes,
      seconds,
      frames,
      frameRate,
      dropFrame,
    };
  }
}

export function mtcFrameRateToFps(frameRate: MtcFrameRate): number {
  return frameRate;
}
