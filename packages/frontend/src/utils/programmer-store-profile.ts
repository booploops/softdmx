/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ShowDocument, StoreProfile } from '@softdmx/engine';

export function resolveDefaultStoreProfile(doc: ShowDocument): StoreProfile | null {
  const profiles = doc.programmer?.storeProfiles;
  if (!profiles?.length) return null;

  const preferredId = doc.programmer?.defaultStoreProfileId ?? profiles[0]?.id;
  return profiles.find((profile) => profile.id === preferredId) ?? profiles[0] ?? null;
}
