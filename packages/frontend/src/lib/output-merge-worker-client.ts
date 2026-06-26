/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ActiveChannel } from "@softdmx/engine";
import type { MergeSnapshot } from "./output-merge-runtime";
import OutputMergeWorker from "src/workers/output-merge.worker.ts?worker";

type PendingRequest = {
  resolve: (channels: ActiveChannel[]) => void;
  reject: (error: Error) => void;
};

let worker: Worker | null = null;
let requestId = 0;
const pending = new Map<number, PendingRequest>();

function ensureWorker(): Worker {
  if (worker) return worker;
  worker = new OutputMergeWorker();
  worker.onmessage = (event: MessageEvent) => {
    const message = event.data as
      | { type: "merged"; requestId: number; channels: ActiveChannel[] }
      | { type: "error"; requestId: number; error: string };
    const request = pending.get(message.requestId);
    if (!request) return;
    pending.delete(message.requestId);
    if (message.type === "merged") {
      request.resolve(message.channels);
      return;
    }
    request.reject(new Error(message.error));
  };
  return worker;
}

export function mergeOutputSnapshotInWorker(snapshot: MergeSnapshot): Promise<ActiveChannel[]> {
  const activeWorker = ensureWorker();
  const id = ++requestId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    activeWorker.postMessage({
      type: "merge",
      requestId: id,
      snapshot,
    });
  });
}

export function destroyOutputMergeWorkerClient() {
  for (const request of pending.values()) {
    request.reject(new Error("Output merge worker was destroyed"));
  }
  pending.clear();
  if (worker) {
    worker.terminate();
    worker = null;
  }
}
