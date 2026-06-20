/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { FixtureDefinition } from 'src/types';

export interface SoftDMXPlugin {
  id: string;
  version: string;
  fixtures?: FixtureDefinition[];
}

export interface WidgetComponentLoader {
  type: string;
  load: () => Promise<{ default: unknown }>;
}
