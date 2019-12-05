const Universa = require('universa-minicrypto');

const { PublicKey } = Universa.pki;
const { decode64 } = Universa.utils;

const forceHTTPS = (url) =>
  url.replace("http://", "https://").replace(":8080", ":443")

class Node {
  constructor(description) {
    this.desc = description;

    let keyBin = description.key;
    if (typeof keyBin === "string") keyBin = decode64(keyBin);

    this.key = new PublicKey("BOSS", keyBin);
    this.https = forceHTTPS(this.desc.url || this.desc.domain_urls[0]);
  }
}

module.exports = Node;
