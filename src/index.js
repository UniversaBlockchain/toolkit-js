const Universa = require('universa-minicrypto');
const Network = require('./network');

Universa.Network = Network;
Universa.Topology = Network.Topology;

module.exports = Universa;
