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
    addPreset: 'Add a new preset',
    editPreset: 'Open the preset editor',
    deletePreset: 'Delete this preset',
    addFixtureTarget: 'Add a fixture target to the selected preset',
    addGroupTarget: 'Add a group target to the selected preset',
    deleteTarget: 'Remove this target from the preset',
    closeEditor: 'Close the preset editor',
  },
  effects: {
    addEffect: 'Add a new lighting effect',
    editEffect: 'Open the effect editor',
    deleteEffect: 'Delete this effect',
    duplicateEffect: 'Duplicate this effect',
    enableEffect: 'Enable or disable this effect',
    closeEditor: 'Close the effect editor',
  },
  executors: {
    addPage: 'Add a new executor page',
    removePage: 'Remove the current executor page',
    addSlot: 'Add a slot to the executor page',
    editSlot: 'Edit the selected executor slot',
  },
  cues: {
    addCue: 'Add a new timeline cue (use Program → Cues for timeline or stack)',
    closeEditor: 'Close the cue editor',
    removeCue: 'Remove the selected cue',
    duplicateCue: 'Duplicate the selected cue',
    playPause: 'Play or pause the active cue',
    stop: 'Stop the active cue and return to the start',
    record: 'Record the current programmer values as a timeline frame',
    addLayer: 'Add a new timeline layer',
    soloOn: 'Solo this layer',
    soloOff: 'Clear solo on this layer',
    deleteLayer: 'Delete this timeline layer',
    moveStepUp: 'Move this stack step earlier',
    moveStepDown: 'Move this stack step later',
    deleteStep: 'Remove this stack step',
    snap: 'Snap frames to the snap interval while editing',
    cueType: 'Switch this cue between timeline and stack editing modes',
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
