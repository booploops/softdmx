/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export type CommandDefinition = {
  name: string;
  usage: string;
  description: string;
  args?: string[];
};

export const COMMAND_DEFINITIONS: CommandDefinition[] = [
  { name: 'help', usage: 'help', description: 'Show programmer command help and examples' },
  { name: 'blackout', usage: 'blackout [--off]', description: 'Enable or disable blackout', args: ['--off'] },
  { name: 'fire-preset', usage: 'fire-preset <preset-id> [--fade <ms>]', description: 'Fire a preset by ID', args: ['--fade'] },
  { name: 'play-cue', usage: 'play-cue <cue-id> [--stop]', description: 'Play or stop a cue', args: ['--stop'] },
  { name: 'set-channel', usage: 'set-channel <path> <value>', description: 'Set a channel value (0-255)' },
  { name: 'clear', usage: 'clear', description: 'Clear the programmer/scratch buffer' },
  { name: 'go', usage: 'go', description: 'Trigger active playback slot (Go+)' },
  { name: 'square', usage: 'stop', description: 'Stop all playback' },
  { name: 'session-arm', usage: 'session arm [--clock <mode>]', description: 'Arm programmer session recording', args: ['--clock'] },
  { name: 'session-disarm', usage: 'session disarm [--no-persist]', description: 'Disarm session recording and persist to timeline', args: ['--no-persist'] },
  { name: 'session-marker', usage: 'session marker <label>', description: 'Drop a marker into the armed session' },
  { name: 'store', usage: 'store [name] [--active] [--mode store|update|merge|remove]', description: 'Store scratch to preset pool', args: ['--active', '--mode'] },
];

export function autocompleteCommand(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return COMMAND_DEFINITIONS.map((cmd) => cmd.name);

  const [command, ...rest] = trimmed.split(/\s+/);
  const partial = rest.join(' ');

  const match = COMMAND_DEFINITIONS.find((cmd) => cmd.name.startsWith(command ?? ''));
  if (!match) {
    return COMMAND_DEFINITIONS.filter((cmd) => cmd.name.startsWith(trimmed)).map((cmd) => cmd.name);
  }

  if (rest.length === 0 && command !== match.name) {
    return [match.name];
  }

  if (match.args?.length) {
    return match.args.filter((arg) => arg.startsWith(partial));
  }

  return [];
}

export function parseCommandLine(input: string): { command: string; args: string[] } {
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  const [command = '', ...args] = tokens;
  return { command: command.toLowerCase(), args };
}
