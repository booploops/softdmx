/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export type {
  OutputDestination,
  ShowMeta,
  FixturePosition,
  ShowFixture,
  ShowGroup,
  PresetTarget,
  Preset,
  PresetPoolKind,
  PresetPool,
  ShowBackupConfig,
  ShowAudioConfig,
  ShowTimecodeConfig,
  TimecodeSource,
  ShowLinkSyncConfig,
  ShowOscSyncConfig,
  ShowTimelineAudioAsset,
  ShowTimelineConfig,
  TimelineSyncMode,
  ShowAudioMapping,
  ShowPlaybackConfig,
  ShowExecutor,
  ExecutorSlot,
  ShowSubmaster,
  PixelChannelOrder,
  VideoSampleRegion,
  PixelMapFixtureChannel,
  PixelMapDefinition,
  VideoInputKind,
  VideoSampleFps,
  ShowVideoConfig,
  ShowDocumentVersion,
  ShowDocument,
} from './document.ts';

export { createEmptyShow } from './document.ts';
export { CURRENT_SHOW_VERSION, isSupportedShowVersion } from './version.ts';
export { migrateShowDocument } from './migrate.ts';
export {
  validateShowDocument,
  parseShowDocument,
  serializeShowDocument,
  downloadShowDocument,
  loadShowDocumentFromFile,
} from './io.ts';
