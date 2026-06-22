/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export {
  serializeFixtureYaml,
  downloadFixtureYaml,
  downloadFixtureGdtf,
  exportFixtureGdtfBytes,
  fixtureToGdtfDescriptionXml,
  loadFixtureFromGdtf,
  resolveFixtureChannelsForMode,
} from '@softdmx/engine';

export {
  initPluginRegistry,
  registerPlugin,
  clearPluginRegistry,
  loadPluginsFromIds,
  registerRuntimeFixtureFromGdtf,
  registerRuntimeFixtureFromYaml,
  getFixtureDefinition,
  getAllFixtures,
  getPlugin,
  pluginRegistryVersion,
} from './registry.ts';
