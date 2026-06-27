/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default {
  connection: 'Connection status to SoftDMX desk',
  infoMode: 'Toggle info mode — hover elements to learn their function',
  touch: {
    presetButton: 'Fire preset: {label}',
    executorButton: 'Trigger executor: {label}',
    blackout: 'Toggle blackout — kills all output',
    cueGo: 'GO the assigned cue',
    grandMaster: 'Grand Master — scales all output levels',
    audioMeter: 'Live audio level meter',
  },
} as const;
