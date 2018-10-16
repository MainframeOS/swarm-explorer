# Swarm Explorer

Swarm manifest creation and edition tool.

## Usage

Latest version is deployed with hash `19bbb8f61dac4c74e1ef7c20c9b439ab41446e23a3bc8de8f050c52b13c5ec81` - [access it using Swarm gateways](https://swarm-gateways.net/bzz:/19bbb8f61dac4c74e1ef7c20c9b439ab41446e23a3bc8de8f050c52b13c5ec81/).

## Examples

- [`theswarm.eth`](https://swarm-gateways.net/bzz:/19bbb8f61dac4c74e1ef7c20c9b439ab41446e23a3bc8de8f050c52b13c5ec81/?hash=theswarm.eth)
- [Swarm Explorer app](https://swarm-gateways.net/bzz:/19bbb8f61dac4c74e1ef7c20c9b439ab41446e23a3bc8de8f050c52b13c5ec81/?hash=19bbb8f61dac4c74e1ef7c20c9b439ab41446e23a3bc8de8f050c52b13c5ec81)

## Development

This app is created using [Create React App](https://github.com/facebook/create-react-app). It requires [node](https://nodejs.org/en/) v8+ with npm to be installed.

The following scripts are exposed:

- `npm install` to install the dependencies (must be done first).
- `npm start` to run the app locally and watch for changes.
- `npm run-script build` to build the assets into the `build` folder.
- `npm run-script upload` to upload the assets to the local Swarm node.
- `npm run-script deploy` to run the `build` and `upload` scripts.

### Publishing a new version

1.  Run `npm run-script deploy` to build and upload the contents to the local Swarm node.
1.  Use the returned hash to access the app using the `bzz` protocol.

## License

MIT.\
See [LICENSE](LICENSE) file.
