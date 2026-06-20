# GDTF Fixture Loading

SoftDMX imports [GDTF](https://gdtf-share.com/) fixture files and maps them to the same extended YAML-compatible fixture model used by bundled plugins.

## Import

**Setup → Patch → Import GDTF/YAML**

- `.gdtf` — parsed from `description.xml` inside the zip archive
- `.yaml` / `.yml` — native SoftDMX fixture format (editable)

Imported fixtures register in the runtime plugin library and appear in **Add Fixture from Library**.

## Modes

GDTF fixtures may expose multiple DMX modes. When patching:

1. Select the fixture type
2. Choose **DMX Mode** in the add-fixture dialog
3. Patched channel count follows the selected mode

Mode selection is stored on the patched fixture as `modeId`.

## YAML round-trip (for hacking)

GDTF imports are mapped to an extended YAML structure:

```yaml
id: Sample_Wash
name: Sample Wash
source: gdtf
defaultModeId: mode-6-channel-1
attributes:
  - id: Dimmer
    feature: dimmer
    merge: htp
    channelName: Dimmer
modes:
  - id: mode-6-channel-1
    name: 6 Channel
    channelNames: [Dimmer, ColorAdd_R, ColorAdd_G, ColorAdd_B, Pan, Tilt]
    channels: [...]
channels: [...]
```

Export YAML from Patch, edit channels/widgets/attributes, re-import YAML to iterate quickly.

## Export

From **Add Fixture from Library** (with a fixture type selected):

- **Export YAML** — editable SoftDMX fixture file
- **Export GDTF** — regenerates `description.xml` and packages a `.gdtf` zip

Re-imported GDTF preserves original `description.xml` when exported from a GDTF source; otherwise XML is generated from the extended model.

## Supported GDTF features

- Attribute definitions + feature mapping (Dimmer, Color, Position, Beam, Shutter, Control)
- Multiple DMX modes
- Channel sets → indexed channels (gobo/color wheels)
- Wheel slot names
- Auto-generated widgets (dimmer, RGB, pan/tilt) when attributes match

## Programmer v2

See desk **Programmer** window:

- Feature group filter (All / Dim / Color / Position / Beam / …)
- Store modes: Store, Update, Merge, Remove (scoped by active feature group)
- Preset pool + slot assignment on store
- Align / Wings controls for selection-ordered fixtures

See also: [fixture-yaml.md](fixture-yaml.md)
