/**
 * Quasar default overrides
 */

import { QBtn, QDialog, QMenu, QSelect, QTab } from "quasar";
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

  QDialog.props["color"] = {
    type: String,
    default: "primary",
  };

  QDialog.props["transition-show"] = {
    type: String,
    default: "fade",
  };

  QDialog.props["transition-hide"] = {
    type: String,
    default: "fade",
  };

  QBtn.props['no-caps'] = {
    type: Boolean,
    default: true,
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
