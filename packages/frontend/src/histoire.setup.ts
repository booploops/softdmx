/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { Quasar } from 'quasar';
import quasarLang from 'quasar/lang/en-US';
import '@quasar/extras/material-icons/material-icons.css';
import 'quasar/src/css/index.sass';
import 'src/css/app.scss';

export function setupVue3({ app }: { app: ReturnType<typeof createApp> }) {
  app.use(createPinia());
  app.use(Quasar, { plugins: {}, lang: quasarLang });
}
