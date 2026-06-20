# SoftDMX Remote API

Socket.io server (default port 5353).

## Read events (server → client)

| Event | Payload | Description |
|---|---|---|
| `show:state` | `ShowDocumentV1` | Full show document |
| `channels:state` | `ActiveChannel[]` | Merged DMX output |
| `settings:current` | App config | Port and app prefs |

## Write events (client → server)

| Event | Payload | Description |
|---|---|---|
| `show:get` | — | Request current show |
| `show:load` | `ShowDocumentV1` | Load show |
| `show:state` | `ShowDocumentV1` | Broadcast show update |
| `scratch:set` | `{ path, value }` or `{ channels: [...] }` | Set live scratch channels |
| `scratch:clear` | — | Clear scratch layer |
| `preset:fire` | `{ presetId, fade? }` | Fire preset with optional fade ms |
| `cue:play` | `{ cueId }` | Start cue playback |
| `cue:stop` | `{ cueId }` | Stop cue |
| `cue:stack:go` | `{ cueId }` | Advance stack cue |
| `blackout` | `boolean` | Blackout on/off |
| `grandmaster` | `0–1` | Grand master level |
| `effect:set` | `{ effectId, enabled }` | Toggle effect |
| `audio:setEnabled` | `{ enabled }` | Enable/disable audio-reactive mappings |
| `audio:mappings:create` | `{ mapping }` | Add one audio mapping |
| `audio:mappings:update` | `{ id, mapping }` | Patch one audio mapping |
| `audio:mappings:delete` | `{ id }` | Remove one audio mapping |

## OSC direct namespace

- `/softdmx/blackout`
- `/softdmx/grandmaster`
- `/softdmx/media/time` (seconds, float)
- `/softdmx/timecode/smpte` (either `secondsFloat` or `hours,minutes,seconds,frames`)
- `/softdmx/fixture/{name}/channel/{index}`
- `/softdmx/group/{name}/master`
- `/softdmx/cue/{id}/go`
- `/softdmx/preset/{id}`

SoftDMX also accepts common media-time OSC routes used by Resolume-style controllers, including:

- `/composition/time`
- `/layer{n}/clip/time`
- `/layer{n}/video/time`

If a message includes two numeric args and the first is `0-1`, SoftDMX treats it as normalized progress and multiplies by the second arg (duration) to compute `mediaTime`.

## Timecode Notes and Limits

- Timecode sources (Settings → Show Sync): **OSC**, **LTC** (audio input via `linear-timecode`), or **MTC** (MIDI quarter-frame `0xF1` on enabled MIDI inputs).
- OSC route: `/softdmx/timecode/smpte` — either `secondsFloat` or `hours,minutes,seconds,frames`.
- LTC: select an audio input device, channel (mono/left/right), and gain. Frame rate is auto-detected when possible.
- MTC: enable MIDI inputs in Bindings; quarter-frame messages assemble into SMPTE and update show FPS from rate bits.
- Optional **latency offset (ms)** subtracts delay from incoming timecode before cue crossing evaluation.
- Cue `timecodeIn`/`timecodeOut` are evaluated on forward crossings only (rewind/jump backward does not auto-retrigger past crossings).
- Frame-to-seconds conversion uses show timecode FPS (default `30`, or MTC/LTC-detected rate when available).

## HTTP REST API

Base URL: `http://127.0.0.1:5353/api/v1/remote`

Optional auth:

- Set `SOFTDMX_API_TOKEN` in the server environment to require auth for all REST routes.
- Send token in `Authorization: Bearer <token>` or `x-api-token: <token>`.
- If token auth is enabled and missing/invalid, routes return `401 Unauthorized`.

| Method | Route | Body | Description |
|---|---|---|---|
| `GET` | `/show` | — | Get current show document |
| `POST` | `/show` | `ShowDocumentV1` | Load full show document |
| `POST` | `/scratch/set` | `{ path, value, attributeType? }` or `{ channels: [...] }` | Set live scratch values |
| `POST` | `/scratch/clear` | — | Clear scratch layer |
| `POST` | `/preset/fire` | `{ presetId, fade? }` | Fire preset |
| `POST` | `/cue/play` | `{ cueId }` | Start cue playback |
| `POST` | `/cue/stop` | `{ cueId }` | Stop cue playback |
| `POST` | `/cue/stack/go` | `{ cueId }` | Advance stack cue |
| `POST` | `/blackout` | `{ value: boolean }` | Toggle blackout |
| `POST` | `/grandmaster` | `{ value: number }` | Set grandmaster (0-1) |
| `POST` | `/audio/enabled` | `{ enabled: boolean }` | Enable/disable audio mappings |
| `POST` | `/audio/mappings` | `{ mapping }` | Create audio mapping |
| `PATCH` | `/audio/mappings/:id` | `{ mapping }` | Update audio mapping fields |
| `DELETE` | `/audio/mappings/:id` | — | Delete audio mapping |
| `POST` | `/channel/set` | `{ path, value, attributeType? }` | Set one channel via scratch |

## CLI examples

Run via:

```bash
yarn cli -- <command> [options]
```

Examples:

```bash
yarn cli -- load-show --file ./shows/club-night.yml
yarn cli -- fire-preset --preset front-wash --fade 500
yarn cli -- play-cue --cue opener
yarn cli -- play-cue --cue opener --stop
yarn cli -- set-channel --fixture Spot1 --channel 1 --value 255
yarn cli -- blackout
yarn cli -- blackout --off
```

## Playback shortcuts

- `Space`: GO on the selected executor slot (or first slot on active page)
- `Escape`: stop all executors/cues
- `PageUp`: previous executor page
- `PageDown`: next executor page
- `B`: toggle output blackout
