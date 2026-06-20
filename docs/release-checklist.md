# Release Checklist

Use this checklist before cutting a SoftDMX release.

## 1) Workspace sanity

- [ ] `git status` has only intended release changes.
- [ ] No local secrets or machine-specific files are staged.
- [ ] README/docs reflect user-visible behavior for this release.

## 2) Install and tests

- [ ] `yarn` completes with no install errors.
- [ ] `yarn test` passes.

## 3) Build verification

- [ ] `yarn build:spa` passes.
- [ ] `yarn build` (Electron) passes.
- [ ] Production build artifacts are created as expected.

## 4) Core runtime smoke checks

- [ ] App launches in development mode (`yarn dev`).
- [ ] Show load/export (YAML) works.
- [ ] At least one fixture can be patched and controlled.
- [ ] GridNode output route works at `http://127.0.0.1:5353/source`.
- [ ] Remote page loads at `/#/remote`.

## 5) Control path checks

- [ ] Preset fire works from main UI.
- [ ] Cue play/stop (and stack GO if used) works.
- [ ] Grand master and blackout controls respond.
- [ ] Executor slots/pages trigger expected cues.
- [ ] MIDI/OSC bindings (if configured) trigger expected targets.

## 6) Audio-reactivity checks

- [ ] Audio input can be selected/enabled.
- [ ] Audio meters update in UI/remote.
- [ ] At least one audio mapping affects a target as expected.

## 7) Network API checks

- [ ] Socket.IO remote client can connect and receive `show:state`.
- [ ] REST endpoints under `/api/v1/remote` respond correctly.
- [ ] If token auth is enabled, unauthorized requests return `401`.

## 8) Platform/packaging checks

- [ ] Electron packaged app starts and loads UI.
- [ ] DMX output drivers needed for release are verified (GridNode/Art-Net/sACN/DMX USB).
- [ ] No unexpected console errors during normal operation.

## 9) Release notes and tagging

- [ ] Changelog/release notes summarize major changes and breaking behavior.
- [ ] Version/tag matches package metadata and release notes.
- [ ] Final commit is tagged and pushed according to project process.
