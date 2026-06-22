import assert from 'node:assert/strict';
import { filterWidgetsForFeatureGroup, widgetMatchesFeatureGroup } from '../src/utils/selection-controls.ts';

assert.equal(widgetMatchesFeatureGroup({ type: 'colorPicker', name: 'RGB', channels: {} }, 'color'), true);
assert.equal(widgetMatchesFeatureGroup({ type: 'dimmerSlider', name: 'Dim', channels: {} }, 'color'), false);

const widgets = [
  { type: 'dimmerSlider', name: 'Dim', channels: {} },
  { type: 'colorPicker', name: 'RGB', channels: {} },
  { type: 'lightMover', name: 'Pos', channels: {} },
];
assert.equal(filterWidgetsForFeatureGroup(widgets, 'position').length, 1);
assert.equal(filterWidgetsForFeatureGroup(widgets, 'all').length, 3);

console.log('selection-controls tests passed');
