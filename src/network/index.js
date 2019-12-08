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

function createHashId(id) {
  return {
    __type: "HashId",
    composite3: id
  };
}

class Network {
  constructor(privateKey, options = {}) {
    this.options = options;
    this.connections = {};
    this.topologyKey = options.topologyKey || "__universa_topology";
    this.topologyFile = options.topologyFile || "../../mainnet.json";
    this.topology = this.getLastTopology();
    this.ready = new Promise((resolve, reject) => { this.setReady = resolve; });
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

    if (this.options.topology) return this.options.topology;

    return Topology.load(require(this.topologyFile));
  }

  saveNewTopology() {
    if (typeof window === 'undefined') return;

    const boss = new Boss();
    const packed = this.topology.pack();
    localStorage.setItem(this.topologyKey, encode64(boss.dump(packed)));
  }

  async connect() {
    // console.log(`Connecting to the Universa network`);
    await this.topology.update();
    // console.log(`Loaded network configuration, ${this.size()} nodes`);
    this.saveNewTopology();
    this.setReady(true);

    return this;
  }

  async nodeConnection(nodeId) {
    const node = this.topology.getNode(nodeId);
    if (this.connections[nodeId]) return this.connections[nodeId];

    await this.ready;

    const connection = new NodeConnection(node, this.authKey, this.options);
    await connection.connect();
    this.connections[nodeId] = connection;

    return connection;
  }

  async getRandomConnection() {
    await this.ready;

    return this.nodeConnection(this.topology.getRandomNodeId());
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
      // onError: (e) => console.log(`${e}, send command again`)
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

  isApproved(id, trustLevel) {
    const self = this;

    return new Promise((resolve, reject) => {
      let tLevel = trustLevel;
      if (tLevel > 0.9) tLevel = 0.9;

      // const end = new Date((new Date()).getTime() + millisToWait).getTime();
      let Nt = Math.ceil(self.size() * tLevel);
      if (Nt < 1) Nt = 1;
      const N10 = (Math.floor(self.size() * 0.1)) + 1;
      const Nn = Math.max(Nt + 1, N10);
      let resultFound = false;

      let positive = 0;
      let negative = 0;
      const requests = [];
      const ids = Object.keys(self.topology.nodes);

      const isPending = (state) =>
        state.indexOf("PENDING") === 0 || state.indexOf("LOCKED") === 0;

      function success(status) {
        if (resultFound) return;

        resultFound = true;
        resolve(status);
      }

      function failure(err) {
        if (resultFound) return;

        resultFound = true;
        reject(err);
      }

      function processNext() {
        if(!resultFound && ids.length > 0) {
          processNode(ids.pop());
        }
      }

      function processVote(state, nodeId) {
        if (resultFound) return;
        if (isPending(state)) return ids.unshift(nodeId);
        if (state === "APPROVED") {
          positive++;
          if (positive >= Nt) return success(true);
        }
        else {
          negative++;
          if (negative >= N10) return success(false);
        }
      }

      async function processNode(nodeId) {
        if (resultFound) return;

        try {
          const conn = await self.nodeConnection(nodeId);
          if (resultFound) return;
          const req = self.checkContract(id);
          requests.push(req);
          const response = await req;
          const { itemResult } = response;
          const { state } = itemResult;

          processVote(response.itemResult.state, nodeId);
        } catch (err) {
          if (ids.length > 0) processNext()
          else failure(new Error("not enough responses"));
        }
      }

      for (let i = 0; i < Nt; i++) processNext();
    });
  }
}

Network.Topology = Topology;

module.exports = Network;
