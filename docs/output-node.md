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
- Exposes the same local server as the desk (REST / Socket.IO) so a remote client can attach later

The current output-node path is a slim Electron window, not a standalone appliance binary.

## Primary / standby

Show files may include `backup` settings (`enabled`, `role`, `partnerHost`, `takeoverMode`, `heartbeatMs`). Helper functions live in `packages/client/src-electron/backup/coordinator.ts`. Production failover (peer heartbeat, standby output gating, takeover) is not wired.
