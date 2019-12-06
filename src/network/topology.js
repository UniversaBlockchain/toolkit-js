const Node = require('./node');

class Topology {
  constructor(nodes, updatedAt) {
    this.nodes = nodes;
    this.nodesById = {};
    this.nodes.map(node => this.nodesById[node.id] = node);
    this.updatedAt = updatedAt;
  }

  async update() {
    const trustLevel = 0.4;
    const self = this;
    const confirmed = {};
    const failed = {};
    const stats = {};

    function addStats(nodes) {
      nodes.map(node => {
        if (!stats[node.id]) stats[node.id] = [];

        let found = false;

        stats[node.id].map((stat, i) => {
          if (stat.node.equals(node)) {
            found = true;
            stats[node.id][i].count++;
          }
        });

        if (!found) stats[node.id].push({ count: 1, node });
      });
    }

    function buildFinal(level = 0) {
      const nodes = {};

      for (var id in stats) {
        let total = 0;
        const list = stats[id];

        list.map(stat => {
          total += stat.count;
        });

        let trusted;

        if (level !== 0)
          trusted = list.find(n => n.count/total >= level);
        else {
          const maximum = Math.max.apply(null, list.map(n => n.count));
          trusted = list.find(n => n.count === maximum);
        }

        if (trusted) nodes[id] = trusted.node;
      }

      return nodes;
    }

    function colloquium(trustLevel, nodes) {
      return new Promise((resolve, reject) => {
        let Nt = Math.ceil(self.size() * trustLevel);
        if (Nt < 1) Nt = 1;
        let resultFound = false;
        const source = nodes || self.nodesById;
        const ids = Object.keys(source);

        function success() {
          if (resultFound) return;

          resultFound = true;
          resolve({ failed, confirmed });
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

        async function processNode(id) {
          if (resultFound) return;

          try {
            const response = await source[id].getTopology();
            processResponse(id, response);
          } catch(err) {
            failed[id] = true;
            if (ids.length > 0) processNext();
            else failure(new Error("confirmed responses < 40%"));
          }
        }

        function processResponse(id, resp) {
          if (resultFound) return;

          confirmed[id] = resp;
          delete failed[id];
          addStats(resp.nodes.map(info => new Node(info)));

          if (Object.keys(confirmed).length >= Nt) success();
        }

        for (var i = 0; i < Nt; i++) processNode(ids.pop());
      });
    }

    try {
      await colloquium(0.4);
    } catch(err) {
      const tempResult = buildFinal(0);
      for (var id in tempResult) if (!failed[id]) delete tempResult[id];

      await colloquium(0.4, tempResult);
    }

    const result = buildFinal(0.9);
    this.nodesById = result;

    const list = [];
    for (var id in result) list.push(result[id]);
    this.nodes = list;

    this.updatedAt = new Date();
  }

  size() { return this.nodes.length; }

  pack() {
    return {
      list: this.nodes.map(n => n.info()),
      updated: this.updatedAt.getTime()
    };
  }
}

Topology.load = (packed) => new Topology(
  packed.list.map(info => new Node(info)),
  new Date(packed.updatedAt)
);

module.exports = Topology;
