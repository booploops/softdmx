# SoftDMX Design Tokens

SoftDMX uses a CSS custom-property token system (`--sdmx-*`) applied at runtime via the theme store. All UI components should consume tokens rather than hardcoded colors, spacing, or typography.

## Token categories

| Category | Prefix | TypeScript type |
|----------|--------|-----------------|
| Colors | `--sdmx-color-*` | `ThemeColorTokens` |
| Typography | `--sdmx-font-*`, `--sdmx-line-height-*` | `ThemeTypographyTokens` |
| Spacing | `--sdmx-space-*` | `ThemeSpacingTokens` |
| Elevation | `--sdmx-elevation-*` | `ThemeElevationTokens` |
| Radius | `--sdmx-radius-*` | `ThemeRadiusTokens` |
| Layout | `--sdmx-layout-*` | `ThemeLayoutTokens` |
| Motion | `--sdmx-motion-*` | `ThemeMotionTokens` |

Source of truth: [`packages/frontend/src/themes/types.ts`](../packages/frontend/src/themes/types.ts)

## Semantic color roles

| Token | Usage |
|-------|-------|
| `scratch` | Programmer / modified values |
| `gm` | Grand master level |
| `active` | Fixture or playback actively running |
| `armed` | Cue/preset armed, awaiting Go |
| `flash` | Momentary flash state |
| `blind` | Blind/preview mode |
| `focusRing` | Keyboard focus outline |

## Utility classes

Defined in [`packages/frontend/src/css/theme.scss`](../packages/frontend/src/css/theme.scss):

- Surfaces: `.sdmx-surface`, `.sdmx-elevated`, `.sdmx-inset`, `.sdmx-muted`
- Typography: `.sdmx-text-display`, `.sdmx-text-title`, `.sdmx-text-body`, `.sdmx-text-label`, `.sdmx-text-caption`, `.sdmx-text-mono`, `.sdmx-text-tabular`
- States: `.sdmx-widget--selected`, `.sdmx-widget--active`, `.sdmx-widget--armed`, `.sdmx-widget--flash`
- Empty states: `.sdmx-empty-state`
- Focus: `.sdmx-focus-ring`
- Touch: `.sdmx-touch-target`

## UI primitives

Use components from `src/components/ui/` instead of raw Quasar controls:

| Component | Replaces |
|-----------|----------|
| `SdmxButton` | `q-btn` for desk actions |
| `SdmxToggle` | toggle switches |
| `SdmxStatusChip` | `q-chip` for status indicators |
| `SdmxValueField` | inline numeric displays |
| `SdmxFader` | `q-slider` faders |
| `SdmxEncoder` | attribute encoders |
| `SdmxWindowChrome` | desk window headers |
| `SdmxPanel` | section panels |
| `SdmxEmptyState` | empty placeholder states |

## Built-in themes

| ID | Mode | Description |
|----|------|-------------|
| `default-dark` | Dark | Signature SoftDMX dark console |
| `default-light` | Light | Setup/programming sessions |
| `high-contrast-daylight` | Dark | Maximum contrast for bright venues |
| `studio-blue` | Dark | Cool blue variant |

Themes are importable/exportable as JSON via Theme Settings.

## Adding a custom theme

1. Copy an existing preset from `src/themes/presets/`
2. Override `tokens.colors` (minimum) and optionally other token groups
3. Register in `src/themes/presets/index.ts` or import via Theme Settings dialog

## Histoire component docs

Run `yarn workspace @softdmx/frontend story:dev` to browse primitive stories.
