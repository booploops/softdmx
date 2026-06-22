/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { boot } from 'quasar/wrappers';
import { useLtcTimecodeStore } from 'src/stores/ltc-timecode';
import { useShowStore } from 'src/stores/show';
import { watch } from 'vue';

export default boot(() => {
  const ltcStore = useLtcTimecodeStore();
  const showStore = useShowStore();

  watch(
    () => [showStore.document.timecode?.enabled, showStore.document.timecode?.source],
    () => {
      void ltcStore.restartIfNeeded();
    },
    { immediate: true }
  );
});
