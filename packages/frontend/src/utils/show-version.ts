/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ShowDocumentVersion } from '../types/show-document.ts';

export const CURRENT_SHOW_VERSION: ShowDocumentVersion = '1.5';

const SUPPORTED_VERSIONS = new Set<ShowDocumentVersion>([
  '1.0',
  '1.1',
  '1.2',
  '1.3',
  '1.4',
  '1.5',
]);

export function isSupportedShowVersion(version: unknown): version is ShowDocumentVersion {
  return typeof version === 'string' && SUPPORTED_VERSIONS.has(version as ShowDocumentVersion);
}
