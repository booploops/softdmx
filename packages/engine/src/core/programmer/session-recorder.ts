/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type {
  ProgrammerSessionEvent,
  SessionRecordingPolicy,
} from "../../types/programmer.ts";

export interface SessionClock {
  nowSec: () => number;
}

export interface PendingChannelEvent {
  tSec: number;
  path: string;
  value: number;
  attributeType?: string;
  clientId?: string;
  meta?: ProgrammerSessionEvent["meta"];
}

export class SessionRecorder {
  private events: ProgrammerSessionEvent[] = [];
  private pendingByPath = new Map<string, PendingChannelEvent>();
  private lastFlushMs = 0;

  constructor(
    private readonly clock: SessionClock,
    private policy: SessionRecordingPolicy = { coalesceMs: 80 },
  ) {}

  setPolicy(policy: SessionRecordingPolicy) {
    this.policy = { ...this.policy, ...policy };
  }

  getEvents(): ProgrammerSessionEvent[] {
    return [...this.events];
  }

  append(event: ProgrammerSessionEvent) {
    if (this.policy.semanticOnly && event.kind === "channel") {
      return;
    }
    this.events.push(event);
  }

  appendChannel(
    path: string,
    value: number,
    options?: {
      attributeType?: string;
      clientId?: string;
      meta?: ProgrammerSessionEvent["meta"];
    },
  ) {
    if (this.policy.semanticOnly) return;

    const tSec = this.clock.nowSec();
    const coalesceMs = this.policy.coalesceMs ?? 80;
    const pending: PendingChannelEvent = {
      tSec,
      path,
      value,
      attributeType: options?.attributeType,
      clientId: options?.clientId,
      meta: options?.meta,
    };

    const existing = this.pendingByPath.get(path);
    if (existing) {
      existing.value = value;
      existing.tSec = tSec;
      existing.meta = options?.meta ?? existing.meta;
      return;
    }

    this.pendingByPath.set(path, pending);
    const nowMs = tSec * 1000;
    if (coalesceMs <= 0 || nowMs - this.lastFlushMs >= coalesceMs) {
      this.flushPending();
      this.lastFlushMs = nowMs;
    }
  }

  flushPending() {
    for (const pending of this.pendingByPath.values()) {
      this.events.push({
        tSec: pending.tSec,
        kind: "channel",
        path: pending.path,
        value: pending.value,
        clientId: pending.clientId,
        meta: pending.meta,
      });
    }
    this.pendingByPath.clear();
  }

  reset(events: ProgrammerSessionEvent[] = []) {
    this.events = [...events];
    this.pendingByPath.clear();
    this.lastFlushMs = 0;
  }
}
