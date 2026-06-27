/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  getFeatureFlagDefaults,
  resolveFeatureFlagProfile,
  type FeatureFlagSnapshot,
} from './feature-flags-schema';

const STORAGE_KEY = 'softdmx.command_line_flags';
const COMMAND_FLAG_KEYS = [
  'commandLineV2Enabled',
  'commandIntentEnabled',
  'commandSandboxRequiredForRisky',
  'commandSuggestionsEnabled',
] as const;

export type CommandLineFlags = Pick<FeatureFlagSnapshot, (typeof COMMAND_FLAG_KEYS)[number]>;

function defaults(): CommandLineFlags {
  const profile = resolveFeatureFlagProfile(
    typeof import.meta !== 'undefined' ? (import.meta as { env?: { MODE?: string } }).env?.MODE : undefined,
  );
  const base = getFeatureFlagDefaults(profile);
  return {
    commandLineV2Enabled: base.commandLineV2Enabled,
    commandIntentEnabled: base.commandIntentEnabled,
    commandSandboxRequiredForRisky: base.commandSandboxRequiredForRisky,
    commandSuggestionsEnabled: base.commandSuggestionsEnabled,
  };
}

const DEFAULTS = defaults();

function parseOverrides(value: string | null): Partial<CommandLineFlags> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as Partial<CommandLineFlags>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function getCommandLineFlags(): CommandLineFlags {
  if (typeof window === 'undefined') return { ...DEFAULTS };
  const overrides = parseOverrides(window.localStorage.getItem(STORAGE_KEY));
  return {
    ...DEFAULTS,
    ...overrides,
  };
}

export function updateCommandLineFlags(patch: Partial<CommandLineFlags>): CommandLineFlags {
  const next = {
    ...getCommandLineFlags(),
    ...patch,
  };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function resetCommandLineFlags(): CommandLineFlags {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  return { ...DEFAULTS };
}
