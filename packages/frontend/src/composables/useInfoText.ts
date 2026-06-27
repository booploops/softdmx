/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useI18n } from 'vue-i18n';
import { i18n } from 'src/boot/i18n';
import {
  resolveInfoBinding,
  tooltipPath,
  type InfoBinding,
  type TooltipKey,
} from 'src/lib/info-text';

export function useInfoText() {
  const { t } = useI18n();

  function info(key: TooltipKey, vars?: Record<string, unknown>): string {
    return t(tooltipPath(key), vars ?? {});
  }

  function infoFrom(binding: InfoBinding): string {
    return resolveInfoBinding(t, binding);
  }

  return { info, infoFrom };
}

/** Resolve tooltip copy outside of component setup (directives, tests). */
export function resolveInfoText(key: TooltipKey, vars?: Record<string, unknown>): string {
  return i18n.global.t(tooltipPath(key), vars ?? {});
}

export function resolveInfoFrom(binding: InfoBinding): string {
  return resolveInfoBinding((key, vars) => i18n.global.t(key, vars ?? {}), binding);
}
