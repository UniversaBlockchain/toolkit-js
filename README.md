## universa-toolkit

Minimalistic Javascript library required to perform basic operations with Universa Network, based on universa-minicrypto.

## Installation

### Node.js

For usage in an existing Node.js project, add it to your dependencies:

```
$ npm install universa-toolkit
```

or with yarn:

```
$ yarn add universa-toolkit
```


And use it with the following line wherever you need it:

```javascript
const Universa = require('universa-toolkit');
```

### Web

In root folder of package run

```bash
npm install
npm run build
```

In folder `dist` there will be `toolkit.js`.

Simply copy `dist/toolkit.js` to wherever you keep your vendor scripts and include
it as a script:

```html
<script src="path/to/toolkit.js"></script>
```

## Usage

### Connecting to network

Connect to network with default topology

```js
const { Network } = Universa;
const { PrivateKey } = Universa.pki;

// privateKey is PrivateKey instance
const network = new Network(privateKey);
let response;

try { await network.connect(); }
catch (err) { console.log("network connection error: ", err); }

try { response = await network.command("sping"); }
catch (err) { console.log("on network command:", err); }
```

Connect to network with topology, provided by file path

```js
const { Network } = Universa;
const { PrivateKey } = Universa.pki;

// privateKey is PrivateKey instance
const network = new Network(privateKey, {
  topologyPath: "/path/to/mainnet.json"
});
let response;

try { await network.connect(); }
catch (err) { console.log("network connection error: ", err); }

try { response = await network.command("sping"); }
catch (err) { console.log("on network command:", err); }
```

Connect to network with provided topology

```js
const { Network, Topology } = Universa;
const { PrivateKey } = Universa.pki;

const topology = Topology.load(require("/path/to/mainnet.json"));

// privateKey is PrivateKey instance
const network = new Network(privateKey, { topology });
let response;

try { await network.connect(); }
catch (err) { console.log("network connection error: ", err); }

try { response = await network.command("sping"); }
catch (err) { console.log("on network command:", err); }
```

(Browser only) Connect to network and save topology to localStorage

```js
const { Network } = Universa;
const { PrivateKey } = Universa.pki;

// privateKey is PrivateKey instance
const network = new Network(privateKey, {
  topologyKey: "local_storage_key_to_store"
});
let response;

try { await network.connect(); }
catch (err) { console.log("network connection error: ", err); }

try { response = await network.command("sping"); }
catch (err) { console.log("on network command:", err); }
```

### Topology

Load topology from file
```js
const { Topology } = Universa;

const topology = Topology.load(require("/path/to/mainnet.json"));
```

Get topology from network instance
```js
const { Network } = Universa;
const { PrivateKey } = Universa.pki;

// privateKey is PrivateKey instance
const network = new Network(privateKey);
const { topology } = network; // Topology instance
```

Update topology
```js
const { Topology } = Universa;

const topology = Topology.load(require("/path/to/mainnet.json"));
const done = await topology.update(); // updates topology that then can be saved
```

Pack topology to save as file
```js
const fs = require('fs');
const { Network } = Universa;
const { PrivateKey } = Universa.pki;

// privateKey is PrivateKey instance
const network = new Network(privateKey);
const { topology } = network; // Topology instance

const packedTopology = topology.pack();
const json = JSON.stringify(packedTopology);
fs.writeFile('mainnet.json', json);
```

### Running commands

network.command(commandName, parameters) - returns Promise with result

```js
const { Network } = Universa;
const { PrivateKey } = Universa.pki;

// privateKey is PrivateKey instance
const network = new Network(privateKey);
let response;

try { await network.connect(); }
catch (err) { console.log("network connection error: ", err); }

try {
  // approvedId is Uint8Array
  response = await network.command("getState", {
    itemId: { __type: "HashId", composite3: approvedId }
  });
}
catch (err) { console.log("on network command:", err); }
```

### Check full contract status

Special command to check contract status over network
isApproved(contractId, trustLevel: Double) // Promise[Boolean]

```js
const { Network } = Universa;
const { PrivateKey } = Universa.pki;

// privateKey is PrivateKey instance
const network = new Network(privateKey);
let isApproved; // boolean

try { await network.connect(); }
catch (err) { console.log("network connection error: ", err); }

try {
  // approvedId can be Uint8Array or base64 string
  isApproved = await network.isApproved(approvedId, 0.6);
}
catch (err) { console.log("on network command:", err); }
```

## Running tests

Run tests
```bash
npm test
```

Run coverage
```bash
npm run coverage
```
