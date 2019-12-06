const Universa = require('universa-minicrypto');

const NodeConnection = require('./node_connection');

const { PublicKey } = Universa.pki;
const { decode64, encode64 } = Universa.utils;
const { Boss } = Universa;

const forceHTTPS = (url) =>
  url.replace("http://", "https://").replace(":8080", ":443")

function difference(setA, setB) {
  let _difference = new Set(setA);

  for (let elem of setB) {
      _difference.delete(elem);
  }

  return _difference;
}

function isEqual(setA, setB) {
  if (setA.size !== setB.size) return false;

  const diff = difference(setA, setB);

  return diff.size === 0;
}

class Node {
  constructor(info) {
    this.name = info.name;
    this.number = info.number;
    this.domainURLs = new Set(info.domain_urls);
    this.directURLs = new Set(info.direct_urls);

    let keyBIN = info.key;
    if (typeof keyBIN === "string") keyBIN = decode64(keyBIN);
    this.key = new PublicKey("BOSS", keyBIN);

    this.id = encode64(this.key.fingerprint());
    this.https = forceHTTPS(this.domainURLs.values().next().value);
  }

  equals(node) {
    if (node.name !== this.name) return false;
    if (node.number !== this.number) return false;
    if (node.id !== this.id) return false;
    if (!isEqual(this.domainURLs, node.domainURLs)) return false;
    if (!isEqual(this.directURLs, node.directURLs)) return false;

    return true;
  }

  info() {
    return {
      name: this.name,
      number: this.number,
      domain_urls: Array.from(this.domainURLs),
      direct_urls: Array.from(this.directURLs),
      key: encode64(this.key.pack("BOSS"))
    };
  }

  async getTopology() {
    const resp = await NodeConnection.request("GET", `${this.https}/topology`);
    const { signature, packed_data: packed } = resp;
    const isVerified = this.key.verifyExtended(signature, packed);

    if (!isVerified) throw new Error("node signature mismatch");

    if (Math.random() > 0.5) throw new Error("failed");

    const boss = new Boss();

    return boss.load(packed);
  }
}

module.exports = Node;
