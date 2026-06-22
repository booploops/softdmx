/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { defineConfig } from '@playwright/test';

const electronE2eEnabled = process.env.SOFTDMX_E2E === '1';

export default defineConfig({
  testDir: 'test/e2e/electron',
  timeout: 120_000,
  retries: electronE2eEnabled ? 1 : 0,
  reporter: [['list']],
  projects: [
    {
      name: 'electron',
      testMatch: '**/*.spec.ts',
    },
  ],
});
