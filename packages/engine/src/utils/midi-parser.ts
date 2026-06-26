/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export interface ParsedMidiMessage {
  command: number; // e.g. 0x90 (Note On), 0xB0 (Control Change)
  channel: number; // 1-16
  control: number; // Note number or CC number
  value: number; // Velocity or CC value (0-127)
}

export interface ParsedMidiShowControl {
  command: "go" | "stop" | "cue";
  cueNumber?: string;
}

/**
 * Parses raw MIDI event byte array into a structured object.
 */
export function parseMidiMessage(data: Uint8Array | number[]): ParsedMidiMessage | null {
  if (!data || data.length < 3) return null;

  const status = data[0];
  const control = data[1];
  const value = data[2];

  if (status === undefined || control === undefined || value === undefined) return null;

  const command = status & 0xf0;
  const channel = (status & 0x0f) + 1; // 1-indexed

  return {
    command,
    channel,
    control,
    value,
  };
}

function parseAsciiCueNumber(bytes: number[]): string | undefined {
  const cueBytes: number[] = [];
  for (const byte of bytes) {
    if (byte === 0x00 || byte === 0xf7) break;
    cueBytes.push(byte);
  }
  if (cueBytes.length === 0) return undefined;
  return String.fromCharCode(...cueBytes).trim() || undefined;
}

/**
 * Parses MIDI Show Control (MSC) SysEx messages for GO / STOP / CUE style actions.
 */
export function parseMidiShowControl(data: Uint8Array | number[]): ParsedMidiShowControl | null {
  if (!data || data.length < 6) return null;
  const bytes = Array.from(data);
  if (bytes[0] !== 0xf0 || bytes[1] !== 0x7f || bytes[3] !== 0x02) return null;
  if (bytes[bytes.length - 1] !== 0xf7) return null;

  const command = bytes[4];
  const cueNumber = parseAsciiCueNumber(bytes.slice(5));

  if (command === 0x01) {
    return { command: "go", cueNumber };
  }
  if (command === 0x02) {
    return { command: "stop", cueNumber };
  }
  if (command === 0x06 || command === 0x07) {
    return { command: "cue", cueNumber };
  }

  return null;
}

/**
 * Scales a 7-bit MIDI value (0-127) to an 8-bit DMX value (0-255).
 */
export function scaleMidiToDmx(midiValue: number): number {
  return Math.max(0, Math.min(255, Math.round((midiValue / 127) * 255)));
}
