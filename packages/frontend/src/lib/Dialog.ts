/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useModal } from "vue-final-modal";

export interface CreateDialogOptions {
  component: any;
  props?: Record<string, any>;
  componentProps?: Record<string, any>;
}

export async function createDialog<T>(options: CreateDialogOptions): Promise<T | undefined> {
  return new Promise<T | undefined>((res) => {
    let resolved = false;
    const safeResolve = (val: T | undefined) => {
      if (!resolved) {
        resolved = true;
        res(val);
      }
    };

    const { open, close } = useModal({
      component: options.component,
      attrs: {
        ...(options.props || options.componentProps),
        onConfirm(val?: any) {
          safeResolve(val);
          close();
        },
        onCancel() {
          safeResolve(undefined);
          close();
        },
      },
    });

    open();
  });
}
