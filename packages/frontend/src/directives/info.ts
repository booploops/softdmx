/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Directive, DirectiveBinding } from 'vue';
import { resolveInfoFrom } from 'src/composables/useInfoText';
import type { InfoBinding } from 'src/lib/info-text';

function applyInfo(el: HTMLElement, binding: DirectiveBinding<InfoBinding | undefined>) {
  if (!binding.value) {
    delete el.dataset.sdmxInfo;
    return;
  }
  el.dataset.sdmxInfo = resolveInfoFrom(binding.value);
}

export const infoDirective: Directive<HTMLElement, InfoBinding | undefined> = {
  mounted: applyInfo,
  updated: applyInfo,
};
