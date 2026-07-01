/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { FixtureDefinition, WidgetConfiguration } from "../../types/fixture.ts";
import type { AttributeFeature } from "../../types/attributes.ts";
import { inferAttributeFeature } from "../attributes.ts";

export type ProgrammerControlKind = "widget" | "channel";

export interface ProgrammerControl {
  id: string;
  kind: ProgrammerControlKind;
  feature: AttributeFeature;
  label: string;
  channelNames: string[];
  widget?: WidgetConfiguration;
  partialCoverage?: boolean;
}

export interface ResolveControlsOptions {
  featureFilter?: AttributeFeature | "all";
  widgetChannelNames?: Set<string>;
}

function channelNamesForFixtures(defs: FixtureDefinition[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const def of defs) {
    for (const channel of def.channels) {
      counts.set(channel.name, (counts.get(channel.name) ?? 0) + 1);
    }
  }
  return counts;
}

export function resolveProgrammerControls(
  fixtureDefs: FixtureDefinition[],
  options?: ResolveControlsOptions,
): ProgrammerControl[] {
  if (fixtureDefs.length === 0) return [];

  const template = fixtureDefs[0]!;
  const nameCounts = channelNamesForFixtures(fixtureDefs);
  const totalFixtures = fixtureDefs.length;
  const filter = options?.featureFilter ?? "all";
  const widgetChannelNames = options?.widgetChannelNames ?? new Set<string>();
  const controls: ProgrammerControl[] = [];
  const coveredChannels = new Set<string>();

  for (const widget of template.widgets ?? []) {
    const channelNames = Object.values(widget.channels).filter(Boolean) as string[];
    const features = channelNames.map((name) => {
      const ch = template.channels.find((c) => c.name === name);
      return inferAttributeFeature(ch?.type ?? "generic", name);
    });
    const feature = features[0] ?? "generic";
    if (filter !== "all" && !features.some((f) => f === filter)) continue;

    channelNames.forEach((n) => {
      coveredChannels.add(n);
      widgetChannelNames.add(n);
    });

    const partial = channelNames.some((name) => (nameCounts.get(name) ?? 0) < totalFixtures);
    controls.push({
      id: `widget:${widget.name}`,
      kind: "widget",
      feature,
      label: widget.name,
      channelNames,
      widget,
      partialCoverage: partial,
    });
  }

  for (const channel of template.channels) {
    if (coveredChannels.has(channel.name)) continue;
    const feature = inferAttributeFeature(channel.type, channel.name);
    if (filter !== "all" && feature !== filter) continue;

    const partial = (nameCounts.get(channel.name) ?? 0) < totalFixtures;
    controls.push({
      id: `channel:${channel.name}`,
      kind: "channel",
      feature,
      label: channel.name,
      channelNames: [channel.name],
      partialCoverage: partial,
    });
  }

  return controls;
}

export function intersectChannelNames(fixtureDefs: FixtureDefinition[]): string[] {
  if (fixtureDefs.length === 0) return [];
  const [first, ...rest] = fixtureDefs;
  const names = new Set(first!.channels.map((c) => c.name));
  for (const def of rest) {
    const defNames = new Set(def.channels.map((c) => c.name));
    for (const name of [...names]) {
      if (!defNames.has(name)) names.delete(name);
    }
  }
  return Array.from(names);
}
