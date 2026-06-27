/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ExecutionPlan } from './command-line-v2';

export type CommandPolicyDecision = {
  action: 'allow' | 'warn' | 'block';
  reason?: string;
};

export type CommandPolicyConfig = {
  blockDeleteWhenLocked: boolean;
  warnOnRiskyMirror: boolean;
};

const STORAGE_KEY = 'softdmx.command_policy_v2';

const DEFAULT_CONFIG: CommandPolicyConfig = {
  blockDeleteWhenLocked: true,
  warnOnRiskyMirror: true,
};

export function getCommandPolicyConfig(): CommandPolicyConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_CONFIG };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<CommandPolicyConfig> | null;
    return {
      ...DEFAULT_CONFIG,
      ...(parsed ?? {}),
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function updateCommandPolicyConfig(patch: Partial<CommandPolicyConfig>): CommandPolicyConfig {
  const next = {
    ...getCommandPolicyConfig(),
    ...patch,
  };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function evaluateCommandPolicy(
  plan: ExecutionPlan,
  options: { operateLocked: boolean; isDeleteLike: boolean }
): CommandPolicyDecision {
  const config = getCommandPolicyConfig();
  if (config.blockDeleteWhenLocked && options.operateLocked && options.isDeleteLike) {
    return {
      action: 'block',
      reason: 'Operate lock prevents delete-like commands.',
    };
  }
  if (config.warnOnRiskyMirror && plan.risky && plan.tags.includes('spatial')) {
    return {
      action: 'warn',
      reason: 'Spatial mirror/distribute operations can reposition multiple fixtures.',
    };
  }
  return { action: 'allow' };
}
