/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export function isDev() {
  return process.env.DEV;
}

export function getDevUrl() {
  return process.env.APP_URL || 'http://127.0.0.1:9000';
}
