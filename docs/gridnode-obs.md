# GridNode OBS Setup

This guide shows how to display SoftDMX GridNode output in OBS using a Browser Source.

## What SoftDMX serves

SoftDMX starts an internal HTTP server (default `5353`) and exposes a redirect endpoint:

- `http://127.0.0.1:5353/source`

That endpoint redirects to the GridNode overlay route:

- `/#/artnet` in development
- `/app/index.html#/artnet` in production packaging

For OBS, always use `/source` so the correct route is selected automatically.

## Local OBS setup (same machine)

1. Start SoftDMX.
2. In OBS, add **Browser Source**.
3. Set URL to:

   `http://127.0.0.1:5353/source`

4. Set a base resolution that matches your scene (for example `1920x1080`).
5. Enable **Shutdown source when not visible** only if you do not need persistent rendering.
6. Optional: enable **Refresh browser when scene becomes active**.

## Remote OBS setup (different machine)

If OBS runs on another machine, use the SoftDMX host IP:

`http://<softdmx-host-ip>:5353/source`

Checklist:

- SoftDMX machine and OBS machine are on reachable network segments.
- Port `5353` is open on the SoftDMX host firewall.
- Use the host IP, not `127.0.0.1`, from remote machines.

## Performance notes

- Browser Source rendering cost depends on scene size and frame rate.
- If you run many overlays, reduce OBS source resolution first.
- Keep SoftDMX and OBS on the same machine when possible for lowest latency.

## Troubleshooting

- Blank source:
  - Confirm SoftDMX is running.
  - Open `http://127.0.0.1:5353/source` in a normal browser first.
- Source works in browser but not OBS:
  - Click **Refresh cache of current page** in Browser Source properties.
  - Recreate source with a new name (OBS cache can stick across edits).
- Remote machine cannot connect:
  - Verify host IP and firewall rules for port `5353`.
