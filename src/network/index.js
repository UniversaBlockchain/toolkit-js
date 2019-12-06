const request = require('xhr-request');
const Universa = require('universa-minicrypto');

const Node = require('./node');
const Topology = require('./topology');
const { retry, abortable } = require('../utils');
const NodeConnection = require('./node_connection');

const { Boss } = Universa;
const { decode64, encode64 } = Universa.utils;
const { PrivateKey, PublicKey } = Universa.pki;

const mainnet = require('../../mainnet.json');

const randomIndex = (arrayLength) => ~~(arrayLength * Math.random());

function createHashId(id) {
  return {
    __type: "HashId",
    composite3: id
  };
}

// function getLocalList(key) {
//   if (typeof window === 'undefined') return;

//   const listBin = localStorage.getItem(key);
//   if (!listBin) return;

//   const boss = new Boss();
//   return boss.load(decode64(listBin));
// }

// function saveLocalList(nodes, key) {
//   if (typeof window === 'undefined') return;

//   const topology = { list: nodes };
//   const boss = new Boss();
//   localStorage.setItem(key, encode64(boss.dump(topology)));
// }

// function getProvidedList(options) {
//   if (!options.topologyPath) return;

//   return require(options.topologyPath);
// }

// function getDefaultList() {
//   return mainnet;
// }

// function getLastTopology(options, key) {
//   return (getLocalList(key) || getProvidedList(options) ||
//     getDefaultList()).list;
// }

class Network {
  constructor(privateKey, options = {}) {
    this.connections = {};
    this.topologyKey = options.topologyKey || "__universa_topology";
    this.topologyFile = options.topologyFile || "../../mainnet.json";
    this.topology = this.getLastTopology();
    this.ready = new Promise((resolve, reject) => { this.setReady = resolve; });
    this.options = options;
    this.authKey = privateKey;
  }

  size() { return this.topology.size(); }

  getLastTopology() {
    if (typeof window !== 'undefined') {
      const bin = localStorage.getItem(this.topologyKey);

      if (bin) {
        const boss = new Boss();

        return Topology.load(boss.load(decode64(listBin)));
      }
    }

    return Topology.load(require(this.topologyFile));
  }

  saveNewTopology() {
    if (typeof window === 'undefined') return;

    const boss = new Boss();
    const packed = this.topology.pack();
    localStorage.setItem(this.topologyKey, encode64(boss.dump(packed)));
  }

  async connect() {
    console.log(`Connecting to the Universa network`);
    await this.topology.update();
    console.log(`Loaded network configuration, ${this.size()} nodes`);
    this.saveNewTopology();

    this.setReady(true);

    return this;
  }

  async nodeConnection(idx) {
    if (this.connections[idx]) return this.connections[idx];

    await this.ready;

    const node = this.topology.nodes[idx];
    const connection = new NodeConnection(node, this.authKey, this.options);

    await connection.connect();
    this.connections[idx] = connection;

    return connection;
  }

  async getRandomConnection() {
    await this.ready;

    return this.nodeConnection(randomIndex(this.size()));
  }

  command(name, options, connection) {
    let req, conn;

    const run = async () => {
      conn = conn || connection || await this.getRandomConnection();

      req = conn.command(name, options);

      return await req;
    };

    return abortable(retry(run, {
      attempts: 5,
      interval: 1000,
      onError: (e) => console.log(`${e.error}, command will be sent again`)
    }), req);
  }

  checkContract(id) {
    let itemId = id;
    if (typeof id === "string") itemId = decode64(id);

    const hashId = createHashId(itemId);

    return this.command("getState", { itemId: hashId });
  }

  checkParcel(id) {
    let itemId = id;
    if (typeof id === "string") itemId = decode64(id);

    const hashId = createHashId(itemId);

    return this.command("getParcelProcessingState", { parcelId: hashId });
  }

  async isApprovedByNetwork(id, trustLevel, millisToWait) {
    const self = this;

    let tLevel = trustLevel;
    if (tLevel > 0.9) tLevel = 0.9;

    const end = new Date((new Date()).getTime() + millisToWait).getTime();
    let Nt = Math.ceil(this.size() * tLevel);
    if (Nt < 1) Nt = 1;
    const N10 = (Math.floor(this.size() * 0.1)) + 1;
    const Nn = Math.max(Nt + 1, N10);

    const positive = new Set();
    const negative = new Set();
    const shouldRetry = new Set();
    const unprocessed = new Set([...Array(this.size()).keys()]);
    const requests = [];
    const states = [];

    const isPending = (state) =>
      state.indexOf("PENDING") === 0 || state.indexOf("LOCKED") === 0;

    const buildResult = (isApproved) => {
      return {
        states,
        isApproved,
        positive,
        negative
      };
    };

    async function processNode(nodeIndex) {
      const conn = await self.nodeConnection(nodeIndex);
      const req = self.checkContract(id);
      let response;

      requests.push(req);

      try {
        response = await req;
        const { itemResult } = response;
        const { state } = itemResult;

        if (isPending(state)) shouldRetry.add(nodeIndex);
        else {
          states.push(itemResult);
          if (state === "APPROVED") positive.add(nodeIndex);
          else negative.add(nodeIndex);
        }
      }
      catch (err) { shouldRetry.add(nodeIndex); }
    }

    async function processSet() {
      const targetSet = (shouldRetry.size) ? shouldRetry : unprocessed;

      if (!targetSet.size)
        throw new Error("all nodes responded with no result");

      const queue = [];

      console.log("-------------------------------------- fill queue");

      targetSet.forEach(idx => {
        targetSet.delete(idx);
        queue.push(processNode(idx));
      });

      console.log("-------------------------------------- start wait");

      await Promise.all(queue);

      console.log("-------------------------------------- done wait");

      if (negative.size < N10 && positive.size < Nt) processSet();
    }

    async function check() {
      if (negative.size >= N10) {
        requests.map(req => req.abort());
        return buildResult(false);
      }

      if (positive.size >= Nt) {
        requests.map(req => req.abort());
        return buildResult(true);
      }

      const now = (new Date()).getTime();

      if (now > end) {
        requests.map(req => req.abort());

        throw new Error("requests timeout");
      }

      await new Promise(r => setTimeout(r, 100));

      return check();
    }

    processSet();
    return check();
  }
}

module.exports = Network;
