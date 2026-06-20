/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { OutputDestination } from "src/types";

export class ConfigFile {
  Port: number = 5353;
  /** @deprecated Destinations live in the show document */
  OutputDestinations: OutputDestination[] = [];
}
