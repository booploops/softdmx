# Show schema (1.6)

YAML show files validated at load time. Older versions migrate to `1.6` automatically.

## Top-level object

```yaml
version: "1.6"
meta: {}
plugins: []
destinations: []
fixtures: []
groups: []
presets: []
presetPools: []
effects: []
cues: []
bindings: {}
audio: {}
audioMappings: []
executors: []
submasters: []
pixelMaps: []
video: {}
backup: {}
desk: {}
touch: {}
programmer: {}
```

## Field reference

### `version`

- Type: `"1.0" | "1.1" | "1.2" | "1.3" | "1.4" | "1.5"`
- Current schema target: `"1.5"`
- Older documents are migrated to `1.5` on load.

### `presetPools`

- Type: `PresetPool[]` (optional; default pool created on load)
- Named preset slot grids for busking and executor recall.
- Fields:
  - `id: string`
  - `name: string`
  - `kind: "all" | "position" | "color" | "beam" | "custom"`
  - `slots: string[]` — preset IDs indexed by slot number
  - `pageSize?: number`

### `backup`

- Type: `ShowBackupConfig` (optional)
- Primary/standby output node pairing.
- Fields:
  - `enabled: boolean`
  - `role: "primary" | "standby"`
  - `partnerHost?: string`
  - `takeoverMode: "manual" | "auto"`
  - `heartbeatMs: number`

### `desk`

- Type: `ShowDeskConfig` (optional; injected on load if missing)
- Saved Live desk views (Busking, Focus, Plot, Playback) as 12-column pane grids
- Fields:
  - `defaultViewId: string`
  - `views: DeskView[]` — each view has `id`, `name`, `panes[]` with `windowType` and `rect`

### `touch`

- Type: `ShowTouchConfig` (optional; injected on load if missing)
- Remote/Touch layout for phones and tablets
- Fields:
  - `defaultPageId?: string`
  - `pages: TouchPage[]` — grid of controls (`preset-button`, `executor-button`, `grand-master`, etc.)

### `meta`

- Type: object (required)
- Fields:
  - `name: string` (required)
  - `created: string` (ISO timestamp)
  - `modified: string` (ISO timestamp, updated on export)
  - `sessionEpoch?: number` — incremented on multi-user edits for conflict detection
  - `modifiedBy?: string`
  - `lock?: { user: string; since: string }`

### `plugins`

- Type: `string[]`
- Plugin IDs enabled for this show.
- Defaults to `["builtin"]` when omitted.

### `destinations`

- Type: `OutputDestination[]`
- DMX output targets.

`OutputDestination` fields:

- `id: string`
- `name: string`
- `type: "gridnode" | "artnet" | "sacn" | "dmx_usb"`
- `role?: "primary" | "standby"` — failover role (default `primary`)
- `failoverGroup?: string` — pairs primary/standby destinations
- `settings: object`
  - `Host?: string`
  - `Port?: number`
  - `Universe?: number`
  - `Net?: number`
  - `Subnet?: number`
  - `PortPath?: string`

### `fixtures`

- Type: `ShowfileFixture[]`
- Patched fixtures in the show.

`ShowfileFixture` fields:

- `name: string` (unique display/lookup name)
- `fixtureId: string` (fixture definition ID)
- `outputDestinationId?: string` (destination `id`; defaults to `default-gridnode`)
- `startingChannel?: number` (1-based DMX address)
- `position?: FixturePosition`
  - `x?: number`
  - `y?: number`
  - `z?: number`
  - `pan?: number`
  - `tilt?: number`

### `groups`

- Type: `ShowfileGroup[]`

`ShowfileGroup` fields:

- `name: string`
- `fixtures: string[]` (fixture names)

### `presets`

- Type: `Preset[]`

`Preset` fields:

- `id: string`
- `name: string`
- `color?: string` (UI hint, usually CSS color)
- `targets: PresetTarget[]`

`PresetTarget` fields:

- `fixtures?: string[]` (fixture names)
- `group?: string` (group name)
- `attrs: Record<string, number>` (attribute/value pairs)

### `effects`

- Type: `EffectDefinition[]`
- All effect variants share:
  - `id: string`
  - `name: string`
  - `enabled: boolean`
  - `target: EffectTarget`
    - `fixtures?: string[]`
    - `group?: string`
    - `attr: string`
  - `sync?: "free" | "link"`

Effect-specific fields:

- `sine`
  - `type: "sine"`
  - `rate: number`
  - `depth: number`
  - `offset?: number`
- `saw`
  - `type: "saw"`
  - `rate: number`
  - `min: number`
  - `max: number`
- `step`
  - `type: "step"`
  - `rate: number`
  - `steps: number[]`
- `chase`
  - `type: "chase"`
  - `rate: number`
  - `width: number`
  - `direction: "forward" | "reverse"`
  - `wings?: number`
- `phaser`
  - `type: "phaser"`
  - `rate: number`
  - `depth: number`
  - `offset?: number`
  - `phaseSpread?: number`
- `random_hold`
  - `type: "random_hold"`
  - `rate: number`
  - `min: number`
  - `max: number`
  - `seed?: number`

### `cues`

- Type: `Cue[]`

`Cue` fields:

- `id: string`
- `name: string`
- `description?: string`
- `view: "timeline" | "stack"`
- `tracking?: boolean` (defaults false on load)
- `block?: boolean` (defaults true on load)
- `mib?: boolean` (defaults false on load)
- `layers?: CueLayer[]` (defaults `[]` on load)
- `stack?: StackStep[]` (defaults `[]` on load; migrated to `parts` on load)
- `parts?: CuePart[]` (sequential stack playback; preferred over legacy `stack`)
- `totalDuration: number`
- `isLooping: boolean`
- `fadeInDuration: number`
- `fadeOutDuration: number`
- `priority: number`
- `tags: string[]`
- `created: string` (ISO timestamp)
- `modified: string` (ISO timestamp)

`CueLayer` fields:

- `id: string`
- `name: string`
- `frames: RecordedFrame[]`
- `enabled: boolean`
- `opacity: number`
- `blendMode: "replace" | "add" | "multiply" | "screen"`
- `solo: boolean`

`RecordedFrame` fields:

- `name: string`
- `type: "channels" | "delay" | "preset"`
- `channels?: ActiveChannel[]`
- `presetId?: string`
- `delayDuration?: number`
- `duration?: number`
- `easing?: "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out" | "bounce" | "elastic"`

`ActiveChannel` fields:

- `id: number` (1-based)
- `universe?: string` (destination ID)
- `path: string` (show path, for example `show://Fixture/1`)
- `value: number` (0-255)
- `attributeType?: string`

`StackStep` fields:

- `id: string`
- `label?: string`
- `presetId?: string`
- `effectIds?: string[]`
- `fadeIn: number`
- `fadeOut?: number`
- `follow: "manual" | "auto" | "timed"`
- `followTime?: number`

`CuePart` fields:

- `id: string`
- `label?: string`
- `presetId?: string`
- `effectIds?: string[]`
- `targets?: PresetTarget[]`
- `fadeIn?: number`
- `delay?: number`
- `tracking?: boolean`
- `block?: boolean`

### `bindings`

- Type: `ShowBindings` (required object)

`ShowBindings` fields:

- `midi: MidiMapping[]`
- `osc: OscMapping[]`

`MidiMapping` fields:

- `id: string`
- `deviceName?: string`
- `channel: number`
- `controlType: "cc" | "note"`
- `controlNumber: number`
- `target: BindingTarget`

`OscMapping` fields:

- `id: string`
- `addressPattern: string`
- `target: BindingTarget`

`BindingTarget` fields:

- `type: "fixture_channel" | "group_master" | "cue_trigger" | "cue_stack_go" | "preset" | "blackout" | "grandmaster"`
- `fixtureName?: string`
- `channelIndex?: number`
- `groupName?: string`
- `cueId?: string`
- `presetId?: string`

### `audio`

- Type: `ShowAudioConfig` (optional)

`ShowAudioConfig` fields:

- `enabled?: boolean`
- `inputDeviceId?: string`
- `bpm?: number`
- `latencyMs?: number`

### `audioMappings`

- Type: `ShowAudioMapping[]`

`ShowAudioMapping` fields:

- `id: string`
- `source: "rms" | "peak" | "beat" | "band"`
- `bandIndex?: 0 | 1 | 2 | 3` (used when `source: "band"`)
- `targetType: "fixture" | "group" | "effect" | "executor" | "submaster"`
- `targetId: string`
- `attribute?: string`
- `gain?: number`
- `offset?: number`
- `enabled?: boolean`
- `invert?: boolean`
- `min?: number`
- `max?: number`
- `attackMs?: number`
- `releaseMs?: number`

### `executors`

- Type: `ShowExecutor[]`

`ShowExecutor` fields:

- `id: string`
- `name: string`
- `pages: number`
- `activePage?: number`
- `defaultReleaseMs?: number`
- `slots: ExecutorSlot[]`

`ExecutorSlot` fields:

- `id: string`
- `name: string`
- `page: number`
- `index: number` (zero-based slot index on page)
- `cueId?: string`
- `mode?: "go" | "toggle" | "flash" | "latch" | string`
- `fadeMs?: number`
- `releaseMs?: number`
- `submasterId?: string`

### `submasters`

- Type: `ShowSubmaster[]`

`ShowSubmaster` fields:

- `id: string`
- `name: string`
- `value: number` (typically 0-1)
- `mode?: "cue-intensity" | "group-intensity" | string`
- `targets?: string[]`
- `min?: number`
- `max?: number`

### `pixelMaps`

- Type: `PixelMapDefinition[]`

`PixelMapDefinition` fields:

- `id: string`
- `name: string`
- `width: number`
- `height: number`
- `channelOrder: "rgb" | "rbg" | "grb" | "gbr" | "brg" | "bgr"`
- `fixtureChannels: PixelMapFixtureChannel[]`
- `sampleRegion?: VideoSampleRegion` — normalized crop (0..1) on incoming video before grid sampling
- `videoGain?: number` — per-map sampling gain (0..2, default 1)
- `videoSmoothingMs?: number` — per-map EMA smoothing (ms, default 80)

`VideoSampleRegion` fields: `x`, `y`, `width`, `height` (all 0..1, origin top-left)

### `video`

- Type: `ShowVideoConfig` (optional)

Fields: `enabled`, `pixelMapIds` (array), `inputKind` (`none` | `webcam` | `syphon` | `spout`), `deviceId`, `senderName`, `blackLevel`, `followDimmer`, `fps`

Gain and smoothing are configured per pixel map (`videoGain`, `videoSmoothingMs`). Legacy global `gain` / `smoothingMs` on `video` are used as fallbacks when a map has no override.

`PixelMapFixtureChannel` fields:

- `fixtureName: string`
- `x: number`
- `y: number`
- `startChannel: number`

### `programmer`

- Type: `ProgrammerConfig` (optional)

Fields:

- `storeProfiles?: StoreProfile[]` — named one-tap store targets
- `customFeatureGroups?: CustomFeatureGroup[]` — show-level attribute group overrides
- `operators?: ProgrammerOperator[]` — `{ id, label, color?, priority? }`
- `conflictMode?: "attribute-merge" | "last-writer" | "operator-priority"`
- `macros?: ProgrammerMacroDefinition[]`
- `defaultStoreProfileId?: string`

### `timeline.programmerSessions`

- Type: `ProgrammerSession[]` (optional)

Busk session transcripts anchored to the set timeline. Each session has `id`, `name`, `anchorSec`, `clock`, `events[]` with kinds `channel`, `channels`, `clear`, `store`, `marker`, `blind`.

## Minimal valid document example

```yaml
version: "1.1"
meta:
  name: Untitled Show
  created: "2026-01-01T00:00:00.000Z"
  modified: "2026-01-01T00:00:00.000Z"
plugins: [builtin]
destinations:
  - id: default-gridnode
    name: Default GridNode Overlay
    type: gridnode
    settings: {}
fixtures: []
groups: []
presets: []
effects: []
cues: []
bindings:
  midi: []
  osc: []
audioMappings: []
executors: []
submasters: []
pixelMaps: []
```
