/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Dialog, type QDialogOptions } from "quasar";

export async function createDialog<T>(options: QDialogOptions) {
  return new Promise<T | undefined>((res) => {
    Dialog.create({
      ...options,
    })
      .onOk((value: T) => {
        res(value);
      })
      .onCancel(() => {
        res(undefined);
      })
      .onDismiss(() => {
        res(undefined);
      });
  });
}
