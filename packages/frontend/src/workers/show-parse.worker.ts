/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { parseShowDocument } from "@softdmx/engine";

type ParseShowMessage = {
  type: "parse-show";
  requestId: number;
  payload: string;
};

type ParseShowResponse =
  | {
      type: "parsed-show";
      requestId: number;
      document: ReturnType<typeof parseShowDocument>;
    }
  | {
      type: "parse-error";
      requestId: number;
      error: string;
    };

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<ParseShowMessage>) => void) | null;
  postMessage: (message: ParseShowResponse) => void;
};

scope.onmessage = (event: MessageEvent<ParseShowMessage>) => {
  const message = event.data;
  if (message.type !== "parse-show") return;
  try {
    const document = parseShowDocument(message.payload);
    scope.postMessage({
      type: "parsed-show",
      requestId: message.requestId,
      document,
    });
  } catch (error) {
    scope.postMessage({
      type: "parse-error",
      requestId: message.requestId,
      error: error instanceof Error ? error.message : "Unable to parse show document",
    });
  }
};
