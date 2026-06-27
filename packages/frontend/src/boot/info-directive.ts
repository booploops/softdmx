/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { boot } from 'quasar/wrappers';
import { infoDirective } from 'src/directives/info';

export default boot(({ app }) => {
  app.directive('info', infoDirective);
});
