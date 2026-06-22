/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { boot } from 'quasar/wrappers';
import { useMidiStore } from 'src/stores/midi';
import { useOscStore } from 'src/stores/osc';
import { useLinkStore } from 'src/stores/link';
import { useGridNodeOverlayStore } from 'src/stores/gridnode-overlay';
import { useVideoStore } from 'src/stores/video';

export default boot(() => {
  useMidiStore().initMidi();
  useOscStore().initOsc();
  useLinkStore().initLink();
  useGridNodeOverlayStore().init();
  useVideoStore().init();
});
