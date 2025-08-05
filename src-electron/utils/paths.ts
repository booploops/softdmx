/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { app } from 'electron';
import { join } from 'path';

export const Paths = {
  get appData() {
    return join(app.getPath('appData'), 'dev.booploops.softdmx');
  },
}
