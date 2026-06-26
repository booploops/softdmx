/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { test, expect } from '@playwright/test';

/**
 * Electron UI E2E scaffold.
 *
 * These tests are skipped unless SOFTDMX_E2E=1 is set. To run locally:
 *
 *   1. Build the Electron app: `yarn build`
 *   2. Install Playwright browsers: `npx playwright install chromium`
 *   3. Launch with: `SOFTDMX_E2E=1 npx playwright test`
 *
 * Wire `_electron.launch({ args: ['dist/electron/Unpacked/...'] })` once a
 * stable packaged path is available in CI.
 */
test.describe('Electron app launch', () => {
  test.beforeEach(() => {
    if (process.env.SOFTDMX_E2E !== '1') {
      test.skip();
    }
  });

  test('documents electron e2e setup', async () => {
    expect(process.env.SOFTDMX_E2E).toBe('1');
    test.info().annotations.push({
      type: 'setup',
      description: 'Replace with _electron.launch() against yarn build output',
    });
  });
});
