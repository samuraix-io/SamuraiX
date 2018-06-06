import ether from './helpers/ether.js';

const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

function check(accounts, deployContractCb) {
  var contractInstance;
  var owner = accounts[0];
  var investor = accounts[3];
  var purchaser = accounts[4];

  beforeEach(async function () {
    contractInstance = await deployContractCb();
  });

  it('disallows direct send', async function() {
    var amount = ether(100);
    await contractInstance.sendTransaction({from: owner, value: amount}).should.be.rejected;
    await contractInstance.sendTransaction({from: investor, value: amount}).should.be.rejected;
    await contractInstance.sendTransaction({from: purchaser, value: amount}).should.be.rejected;
  });
}

module.exports.check = check;
