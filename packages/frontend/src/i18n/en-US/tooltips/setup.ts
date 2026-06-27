/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default {
  patch: {
    autoPatch: 'Re-allocate all fixture starting channels to prevent overlaps',
    addFixture: 'Add a new fixture to the patch',
    removeFixture: 'Remove the selected fixture from the patch',
    duplicateFixture: 'Duplicate the selected fixture',
    importFixtures: 'Import fixtures from a GDTF or library file',
    addressFixture: 'Set the DMX address for the selected fixture',
    universeSelect: 'Select the DMX universe for patching',
    fixtureType: 'Choose the fixture type for the new patch entry',
    applyPatch: 'Apply pending patch changes to the show',
  },
  settings: {
    addDestination: 'Add a new DMX output destination',
    scanPorts: 'Scan for available serial and network ports',
    refreshAudio: 'Refresh the list of audio input devices',
    saveSettings: 'Save output and sync settings',
    enableLink: 'Enable Ableton Link tempo sync',
    enableTimecode: 'Enable SMPTE timecode input',
  },
  audio: {
    refreshDevices: 'Refresh the list of audio input devices',
    enableAnalysis: 'Enable real-time audio analysis',
    selectDevice: 'Select the audio input device for analysis',
    sensitivity: 'Adjust audio sensitivity threshold',
  },
  bindings: {
    addBinding: 'Add a new MIDI or OSC binding',
    removeBinding: 'Remove the selected binding',
    learnMode: 'Enter learn mode to capture the next incoming message',
  },
  pixelMap: {
    addRegion: 'Add a new pixel map region',
    removeRegion: 'Remove the selected pixel map region',
  },
  video: {
    addOutput: 'Add a video output mapping',
    removeOutput: 'Remove the selected video output',
  },
  theme: {
    applyTheme: 'Apply this theme to the interface',
    importTheme: 'Import a theme from a file',
    exportTheme: 'Export the current theme',
  },
  interface: {
    saveLayout: 'Save interface layout preferences',
    resetLayout: 'Reset interface layout to defaults',
  },
} as const;
