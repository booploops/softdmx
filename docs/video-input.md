# Video Input Operator Guide

SoftDMX can drive fixture RGB channels from live video via **pixel maps**. Sources:

- **Webcam / OBS Virtual Camera** (all platforms)
- **Syphon** (macOS — Resolume, VDMX, etc.)
- **Spout** (Windows — Resolume, OBS, TouchDesigner, etc.)

Configure under **Setup → Video**.

## Workflow

1. Create a **pixel map** under Setup → Patch → Pixel Maps tab.
2. Assign fixtures to grid cells on each map (Setup → Patch → Pixel Maps).
3. Open **Setup → Video**, select **one or more pixel maps** and a shared source.
4. Draw a **sample region (ROI)** per map on the preview — each colored box samples into its map.
5. Enable **Video mapping**.

## Resolume + custom screen map

### Option A — Resolume sends a cropped slice (recommended)

1. In Resolume Advanced Output, route your screen map slice to **Syphon/Spout**.
2. In SoftDMX, pick that sender and leave ROI at **Full frame**.

### Option B — Full composition + ROI in SoftDMX

1. Send the full composition via Syphon/Spout.
2. In SoftDMX preview, drag the ROI box over the screen-map zone.
3. Use **Lock map aspect** if the pixel map grid should match fixture layout proportions.

## OBS Virtual Camera

1. OBS → **Start Virtual Camera**.
2. SoftDMX → Source: **Webcam / OBS Virtual Camera** → select **OBS Virtual Camera**.

## Controls

| Control | Effect |
|---------|--------|
| Gain | Per pixel map — scales sampled RGB for that map |
| Smoothing | Per pixel map — EMA smoothing per channel (ms) |
| Black level | Global — subtract from RGB before output |
| Sample FPS | Global target sample rate (15–60 Hz; 44 = DMX max universe rate) |

## Electron 40+

Syphon/Spout uses native `@napolab/texture-bridge` in the main process. Frames are downscaled to pixel-map size before IPC. Requires Electron desktop build (`yarn dev` / `yarn build`).
