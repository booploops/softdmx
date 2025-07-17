# SoftDMX (name not final)

## What is this?

The "SoftDMX" project is intended to be an easy to use, hackable, software lighting controller that can be used across a range of devices to make your own custom lighting consoles.

Some of SoftDMX's current goals are:
- A primarily software driven lighting controller
- Modular with in and out of tree addons and plugins
- Simplifying and making a much lower barrier to entry for getting into lighting, particularly for virtual environments like VRChat
- Not centered around being an interface for *just* professional consoles and controllers
- Easily programmable and replayable cues
- Natively support VRSL by producing its own GridNode and include its common fixtures out of the box
- Networked over WebSockets
- Various intuitive controls and widgets for the needs of different fixture controls
- Support for binding MIDI devices to controls
- Multiple output formats (currently only produces a GridNode)
- Cross-platform

## Dependencies
- Node.JS 22 ([`fnm`](https://github.com/Schniz/fnm) is recommended for managing Node versions)

## Install the dependencies
```bash
npm i -g corepack
corepack enable
yarn
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)
```bash
yarn dev
```


### Build the app for production
```bash
yarn build
```

## License

This project is licensed under the Mozilla Public License 2.0 - see the [LICENSE](LICENSE) file for details.