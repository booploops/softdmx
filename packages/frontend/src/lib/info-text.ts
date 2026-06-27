/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type tooltips from 'src/i18n/en-US/tooltips';

type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}.${P}`
    : never
  : never;

type Paths<T, D extends number = 5> = [D] extends [never]
  ? never
  : T extends object
    ? {
        [K in keyof T & (string | number)]: T[K] extends object
          ? Join<K, Paths<T[K], Prev[D]>>
          : K;
      }[keyof T & (string | number)]
    : never;

type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Dot-separated path under `tooltips.*` (e.g. `desk.masterBar.menu`). */
export type TooltipKey = Paths<typeof tooltips>;

export type InfoBinding =
  | TooltipKey
  | {
      key: TooltipKey;
      vars?: Record<string, unknown>;
    };

export function tooltipPath(key: TooltipKey): string {
  return `tooltips.${key}`;
}

export function resolveInfoBinding(
  t: (key: string, vars?: Record<string, unknown>) => string,
  binding: InfoBinding
): string {
  if (typeof binding === 'string') {
    return t(tooltipPath(binding));
  }
  return t(tooltipPath(binding.key), binding.vars);
}
