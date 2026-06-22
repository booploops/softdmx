# Release checklist

## Build

- [ ] `yarn` installs cleanly
- [ ] `yarn test` passes
- [ ] `yarn build:spa` passes
- [ ] `yarn build` (Electron) passes
- [ ] No unintended files in `git status`

## Smoke test

- [ ] App launches (`yarn dev`)
- [ ] Load and export a show (YAML)
- [ ] Patch a fixture and change a channel value
- [ ] GridNode route loads: `http://127.0.0.1:5353/source`
- [ ] Remote page loads: `/#/remote`
- [ ] Preset fire and cue play/stop work
- [ ] Grand master and blackout respond

If the release touches networking or auth:

- [ ] Socket.IO client receives `show:state`
- [ ] REST routes under `/api/v1/remote` respond
- [ ] With `SOFTDMX_API_TOKEN` set, bad tokens get `401`

If the release touches audio, video, or output drivers, spot-check those paths on the target platform.

## Ship

- [ ] Release notes cover breaking changes
- [ ] Version/tag matches `package.json`
- [ ] Tag and push per project process
