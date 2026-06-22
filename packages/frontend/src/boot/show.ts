/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { boot } from 'quasar/wrappers';
import { useShowStore } from 'src/stores/show';
import { useScratchStore } from 'src/stores/scratch';

export default boot(() => {
  const scratch = useScratchStore();
  scratch.clear();

  if (typeof window === 'undefined') return;

  const persistSession = () => {
    useShowStore().persistLastSession();
  };

  window.addEventListener('beforeunload', persistSession);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      persistSession();
    }
  });
});
