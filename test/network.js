const should = require('should');
const Universa = require('universa-minicrypto');

const Network = require('../src/network');

const { encode64, decode64 } = Universa.utils;
const { PrivateKey, PublicKey } = Universa.pki;

describe('Network', function() {
  const keyBin = decode64("HhisGAUQuCAAuPpkMr8wf6f/jCb2p1+5xDwCU25f/m3Q7dh3R31OUfD+WvAtDga1aifgufNudMwZREU6yiqADUIEBsELX6kFEHn0hd5zsniIoGchIhMWeaQ+F2EzB7wkK742QoY4mlbJpCsNzc8ehr/MsD19a8Im0YdJ4t1gudvQE7h+tRrImh+CLIN4FpHtvT0ZNroDKnNCnimOPbfe0jFip3cnC6bGdEvvpkLVJwWs1OQa6kkPBrdCMI3NrTlk21qxMu/ySukeRhCGsSp+KprNWinUWrVqfKmWkrKdLLePlyY+HB6sQkIBmZ7PbVd3nejRiTGeswOR+ZTHOvE4t5afVq+dfmWFsNlEGCQvKmwUqxPIw+kw5IcUdZrat0DvsJ2rDS6LwlnaNBLoEd7EgaPcI3lvjwuQ8XjCBQ05YrHwegTkLv6djqwfooS6ip4wCMmwPG1t294hP5BXcJ/i1uv2pkNdEQMacPbXjiPw0d5v0S02/VJv9oJ3NWLqtMhxgjFAhuKyzyz/0gqpQllW9zJrYQop3oNv1l6v0+FMo5ITfqB+NvuX5LjSYXimKLnj7BqwO4lVfOTaTehHaNGuBW4JqC5F3eRx1YWFmIM6VHlsXJ9KzmK9nSA1mDJe1v3GNq7bd8GDGsF89ROB2M44p8yN9tJnXIGn/pxB+7/2sB9suUcxgykkTePnnpIoo1AdoWppTG/qNtXDi0amhy3XwOg0kDQg60JNW4mo5did7Z6vkTPufi9yFcW+H3s9JB1IssbETopHDJ80Vl+xYAozLvEKxbectXw");
  const keyPassword = "81bf60af-703c-4c28-8fc7-878860089df5";
  const approvedId = decode64("dXFhEhoVw8G9QI1I4TnLJJxfgp2O+E+tddXY89u2/ZiFntd108MjIN1554GkSsS5kGVPW0nRjG/B2qI0JRm+Y6F7PPGB23vN3Tm55VnKung5OAijgsypuT/OL33lyUze");
  const privateKey = new PrivateKey("BOSS", {
    bin: keyBin,
    password: keyPassword
  });

  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

  let network;

  beforeEach(async function() {
    network = new Network(privateKey);

    try { await network.connect(); }
    catch (err) { console.log("network connection error: ", err); }
  });

  // it.only('should build topology', async function() {
  //   // console.log(network.topology);

  //   should(1).eql(1);
  // });

  it('should connect to network with default topology', async function() {
    this.timeout(3000);

    let response;

    try { response = await network.command("sping"); }
    catch (err) { console.log("on network command:", err); }

    should(response.sping).eql("spong");
  });

  it.skip('should connect to network with provided topology file', async function() {
    this.timeout(8000);
    const net = new Network(privateKey, {
      topologyPath: "/Users/anzhu/Documents/mainnet.json"
    });

    try { await net.connect(); }
    catch (err) { console.log("network connection error: ", err); }

    let response;

    try { response = await net.command("sping"); }
    catch (err) { console.log("on network command:", err); }

    should(response.sping).eql("spong");
  });

  it('should do simple contract status check (id base64)', async function() {
    this.timeout(3000);
    let response;

    try { response = await network.checkContract(approvedId); }
    catch (err) { console.log("on network command:", err); }

    should(response.itemResult.state).eql("APPROVED");
  });

  it('should do simple contract status check (id bytes)', async function() {
    this.timeout(3000);
    let response;

    try { response = await network.checkContract(approvedId); }
    catch (err) { console.log("on network command:", err); }

    should(response.itemResult.state).eql("APPROVED");
  });

  it('should perform command with parameters', async function() {
    this.timeout(3000);
    let response;

    try {
      response = await network.command("getState", {
        itemId: { __type: "HashId", composite3: approvedId }
      });
    }
    catch (err) { console.log("on network command:", err); }

    should(response.itemResult.state).eql("APPROVED");
  });

  it.skip('should do full status check', async function() {
    this.timeout(30000);
    let response;

    try { response = await network.isApprovedByNetwork(approvedId, 0.2, 30000); }
    catch (err) { console.log("on network command:", err); }

    // console.log(response);

    should(response.isApproved).eql(true);
  });
});
