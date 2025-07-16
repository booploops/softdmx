/*
 * Copyright (C) 2025-Present booploops and contributors
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
/**
 * Quasar default overrides
 */

import { QBtn, QBtnDropdown, QDialog, QMenu, QSelect, QTab } from "quasar";
import { boot } from "quasar/wrappers";

export default boot(async (app) => {
  console.log("Vue version", app.app.version);
  /**
   * Disabling transition-show animation for snapier UI
   *
   * Apple the same thing on macOS.
   */
  QSelect.props["transition-show"] = {
    type: String,
    default: "none",
  };

  QMenu.props["transition-show"] = {
    type: String,
    default: "none",
  };

  QMenu.props["transition-duration"] = {
    type: Number,
    default: 0,
  };
  QDialog.props["transition-duration"] = {
    type: Number,
    default: 0,
  };

  QDialog.props["color"] = {
    type: String,
    default: "primary",
  };

  QDialog.props["transition-show"] = {
    type: String,
    default: "none",
  };

  QDialog.props["transition-hide"] = {
    type: String,
    default: "none",
  };

  QBtn.props["no-caps"] = {
    type: Boolean,
    default: true,
  };

  QBtnDropdown.props["no-caps"] = {
    type: Boolean,
    default: true,
  };

  QBtnDropdown.props["transition-duration"] = {
    type: Number,
    default: 0,
  };
  /**
   * Disabling ripple effect several components
   */
  // QBtn.props['ripple'] = {
  //   type: Boolean,
  //   default: {
  //     early: true,
  //   },
  // };

  // QTab.props['ripple'] = {
  //   type: Boolean,
  //   default: false,
  // };
});
