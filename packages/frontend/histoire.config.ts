/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { defineConfig } from 'histoire';
import { HstVue } from '@histoire/plugin-vue';

export default defineConfig({
  plugins: [HstVue()],
  setupFile: './src/histoire.setup.ts',
  theme: {
    title: 'SoftDMX Design System',
    favicon: 'favicon.ico',
  },
  tree: {
    groups: [
      { id: 'primitives', title: 'UI Primitives' },
      { id: 'tokens', title: 'Design Tokens' },
    ],
  },
});
