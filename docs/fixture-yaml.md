# Fixture YAML Format

SoftDMX fixture plugins can ship YAML fixture definitions and a `plugin.json` manifest.

Extended fields (`attributes`, `modes`, `attributeId`) are shared with GDTF imports — see [fixture-gdtf.md](fixture-gdtf.md).

## `plugin.json`

```json
{
  "id": "vrsl-pack",
  "version": "1.0.0",
  "fixtures": [
    "fixtures/vrsl-wash-5ch.yaml"
  ]
}
```

- `id`: plugin id
- `version`: plugin version
- `fixtures`: fixture YAML file paths (relative to the manifest location)

## Fixture YAML

```yaml
id: VRSL_Wash_5CH
name: VRSL Wash (5ch)
channels:
  - name: Dimmer
    type: intensity
    minValue: 0
    maxValue: 255
    defaultValue: 255
widgets:
  - type: dimmerSlider
    name: Intensity
    channels:
      dimmerChannel: Dimmer
```

- `id`: fixture type id
- `name`: display name
- `channels`: required array of channel definitions
  - `name`, `type`, `minValue`, `maxValue`, `defaultValue` are required
  - optional indexed/discrete control:
    - `controlMode`: `dmx` (default) or `indexed`
    - `indexedSlots`: slot count (required when `controlMode: indexed`, minimum 2)
    - `indexedLabels`: optional label per slot (length must match `indexedSlots`)
- `widgets`: optional array of widget configs
  - each widget needs `type`, `name`, and a `channels` mapping
  - `indexedSelect` widget uses `channels.channel` for an indexed channel

## Widget protocol

Built-in widget types (registered in `WidgetRenderer.vue`):

| Type | Required channel keys |
|------|----------------------|
| `dimmerSlider` | `dimmerChannel` |
| `colorPicker` | `redChannel`, `greenChannel`, `blueChannel` |
| `lightMover` | `panChannel`, `tiltChannel` (optional: `panFineChannel`, `tiltFineChannel`) |
| `strobe` | `strobeChannel` |
| `indexedSelect` | `channel` |
| `channelAttribute` | `channel` |

Unknown or incomplete widget types fall back to `ChannelAttributeControl` when a resolvable `channel` (or first mapped channel) exists.

Custom widget types may use any `type` string; provide at least one channel mapping. The renderer uses the registry first, then the generic channel control fallback.

Example custom fallback widget:

```yaml
widgets:
  - type: channelAttribute
    name: Gobo
    channels:
      channel: Gobo Wheel
```

Validation rules:
- channels must be non-empty
- `maxValue >= minValue`
- `defaultValue` must be within `[minValue, maxValue]`
