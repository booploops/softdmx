# Output Node (Headless DMX)

SoftDMX can run as a **headless output node** that merges show output and drives DMX without the full UI.

## Usage

```bash
yarn dev -- --output-node --show ./my-show.yml
```

Or, after a production build, launch the Electron client with the same flags:

```bash
yarn workspace @softdmx/client dev -- --output-node --show ./my-show.yml
```

The output node:

- Loads the show file (`--show <path>`)
- Runs the merge engine (cues, effects, audio, video, scratch)
- Sends Art-Net / sACN / DMX USB / GridNode output
- Exposes universe health via Socket.IO (`output:health`)
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
