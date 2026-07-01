/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type {
  FixtureDefinition,
  ProgrammerControl,
  ShowfileFixtureMapped,
  WidgetConfiguration,
} from '@softdmx/engine';
import { resolveProgrammerControls } from '@softdmx/engine';
import type { ProgrammerFeatureGroup } from '../stores/programmer';

export function widgetMatchesFeatureGroup(
  widget: WidgetConfiguration,
  featureGroup: ProgrammerFeatureGroup
): boolean {
  if (featureGroup === 'all') return true;
  switch (featureGroup) {
    case 'dimmer':
      return widget.type === 'dimmerSlider';
    case 'color':
      return widget.type === 'colorPicker';
    case 'position':
      return widget.type === 'lightMover';
    case 'shutter':
      return widget.type === 'strobe';
    case 'beam':
      return widget.type === 'indexedSelect' || widget.type === 'strobe';
    case 'control':
      return widget.type === 'indexedSelect' || widget.type === 'strobe';
    default:
      return true;
  }
}

export function filterWidgetsForFeatureGroup(
  widgets: WidgetConfiguration[],
  featureGroup: ProgrammerFeatureGroup
): WidgetConfiguration[] {
  return widgets.filter((widget) => widgetMatchesFeatureGroup(widget, featureGroup));
}

export function resolveSelectionProgrammerControls(
  fixtureDefs: FixtureDefinition[],
  featureGroup: ProgrammerFeatureGroup,
): ProgrammerControl[] {
  const featureFilter = featureGroup === 'all' ? 'all' : featureGroup;
  return resolveProgrammerControls(fixtureDefs, { featureFilter });
}

export function resolveMappedSelectionControls(
  mappedFixtures: ShowfileFixtureMapped[],
  featureGroup: ProgrammerFeatureGroup,
): ProgrammerControl[] {
  return resolveSelectionProgrammerControls(
    mappedFixtures.map((fixture) => fixture.def),
    featureGroup,
  );
}

export function programmerControlsToWidgets(controls: ProgrammerControl[]): WidgetConfiguration[] {
  return controls
    .filter((control): control is ProgrammerControl & { widget: WidgetConfiguration } =>
      control.kind === 'widget' && Boolean(control.widget),
    )
    .map((control) => control.widget);
}

export function buildGroupControlFixture(
  groupName: string,
  template: ShowfileFixtureMapped
): ShowfileFixtureMapped {
  const encodedGroupName = encodeURIComponent(groupName);
  return {
    ...template,
    fixtureName: `${groupName} (selection)`,
    def: {
      ...template.def,
      channels: template.def.channels.map((channel) => ({
        ...channel,
        reference: {
          ...channel.reference,
          path: `group://${encodedGroupName}/${encodeURIComponent(channel.name)}`,
        },
      })),
    },
  };
}

export function selectionSummaryLabel(
  fixtureCount: number,
  groupCount: number
): string {
  if (fixtureCount === 0 && groupCount === 0) return 'No selection';
  const parts: string[] = [];
  if (groupCount > 0) parts.push(`${groupCount} group${groupCount === 1 ? '' : 's'}`);
  if (fixtureCount > 0) parts.push(`${fixtureCount} fixture${fixtureCount === 1 ? '' : 's'}`);
  return parts.join(' · ');
}
