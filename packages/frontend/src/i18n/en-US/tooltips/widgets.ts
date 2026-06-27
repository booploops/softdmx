/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default {
  lightMover: {
    reset: 'Reset pan and tilt to center position',
    pan: 'Adjust pan position',
    tilt: 'Adjust tilt position',
  },
  strobe: {
    preset: '{description}',
    rate: 'Adjust strobe rate',
    duration: 'Adjust strobe duration',
  },
  dimmer: {
    level: 'Adjust dimmer level for {name}',
  },
} as const;
