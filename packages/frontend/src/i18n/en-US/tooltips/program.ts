/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default {
  presets: {
    addPool: 'Add a new preset pool',
    removePool: 'Remove the selected preset pool',
    addPreset: 'Add a new preset to the pool',
    editPreset: 'Edit the selected preset',
  },
  effects: {
    addEffect: 'Add a new lighting effect',
    duplicateEffect: 'Duplicate the selected effect',
    enableEffect: 'Enable or disable this effect',
  },
  executors: {
    addPage: 'Add a new executor page',
    removePage: 'Remove the current executor page',
    addSlot: 'Add a slot to the executor page',
    editSlot: 'Edit the selected executor slot',
  },
  cues: {
    addCue: 'Add a new cue',
    closeEditor: 'Close the cue editor',
    removeCue: 'Remove the selected cue',
    duplicateCue: 'Duplicate the selected cue',
  },
  showfile: {
    editMeta: 'Edit show metadata',
    editSection: 'Edit this show file section',
    duplicateSection: 'Duplicate this section',
    removeSection: 'Remove this section from the show',
  },
  timeline: {
    addCue: 'Add a cue at the current timeline position',
    close: 'Close the timeline editor',
    play: 'Play the timeline preview',
    stop: 'Stop timeline preview',
  },
} as const;
