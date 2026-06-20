# Output Node (Headless DMX)

SoftDMX can run as a **headless output node** that merges show output and drives DMX without the full UI.

## Usage

```bash
yarn output-node -- --show ./my-show.yml
```

Or launch Electron directly:

```bash
yarn dev -- --output-node
```

The output node:

- Loads the show file
- Runs the merge engine (cues, effects, audio, video, scratch)
- Sends Art-Net / sACN / DMX USB / GridNode output
- Exposes universe health via Socket.IO (`destination:health`)
- Supports **standby** role when `show.backup.role` is `standby`

## Primary / standby

Configure in the show file:

```yaml
backup:
  enabled: true
  role: primary   # or standby
  partnerHost: 192.168.1.50
  takeoverMode: manual
  heartbeatMs: 500
```

- **Primary** publishes merged channel state and heartbeats.
- **Standby** receives `backup:state` and only outputs after manual or auto takeover.

## Multi-user session

Show files include `meta.sessionEpoch` for optimistic conflict detection when multiple clients edit the same show over the remote API.
