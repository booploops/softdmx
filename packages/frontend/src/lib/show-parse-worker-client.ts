/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { parseShowDocument } from "@softdmx/engine";
import ShowParseWorker from "src/workers/show-parse.worker.ts?worker";

type Pending = {
  resolve: (doc: ReturnType<typeof parseShowDocument>) => void;
  reject: (error: Error) => void;
};

let worker: Worker | null = null;
const pending = new Map<number, Pending>();
let requestId = 0;

function ensureWorker() {
  if (worker) return worker;
  worker = new ShowParseWorker();
  worker.onmessage = (event: MessageEvent) => {
    const message = event.data as
      | { type: "parsed-show"; requestId: number; document: ReturnType<typeof parseShowDocument> }
      | { type: "parse-error"; requestId: number; error: string };
    const request = pending.get(message.requestId);
    if (!request) return;
    pending.delete(message.requestId);
    if (message.type === "parsed-show") {
      request.resolve(message.document);
      return;
    }
    request.reject(new Error(message.error));
  };
  return worker;
}

export function parseShowDocumentInWorker(yaml: string): Promise<ReturnType<typeof parseShowDocument>> {
  const activeWorker = ensureWorker();
  const id = ++requestId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    activeWorker.postMessage({
      type: "parse-show",
      requestId: id,
      payload: yaml,
    });
  });
}

export function destroyShowParseWorker() {
  for (const request of pending.values()) {
    request.reject(new Error("Show parse worker destroyed"));
  }
  pending.clear();
  if (worker) {
    worker.terminate();
    worker = null;
  }
}
