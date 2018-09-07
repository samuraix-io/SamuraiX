//
const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

function check(accounts, deployContractCb) {
  var token;
  var owner = accounts[0];
  var newOwner = accounts[1];
  var other = accounts[2];

  beforeEach(async function () {
    token = await deployContractCb();
  });
  describe('transferOwnership()', function() {
    it('Should reject non-owner to transfer ownership', async function() {
      await token.transferOwnership({from: other}).should.be.rejected;
    });

    it('Should keep owner unchange until the ownership to be claimed', async function() {
      await token.transferOwnership(newOwner).should.be.fulfilled;
      (await token.pendingOwner()).should.be.equal(newOwner);
      (await token.owner()).should.be.equal(owner);
    });
  });

  describe('transferOwnership()', function() {
    it('Should reject non-new-owner to accept the transfer', async function() {
      await token.transferOwnership(newOwner).should.be.fulfilled;
      await token.claimOwnership({from: other}).should.be.rejected;
    });

    it('Should allow the new owner to accept the transfer', async function() {
      await token.transferOwnership(newOwner).should.be.fulfilled;
      await token.claimOwnership({from: newOwner}).should.be.fulfilled;
      (await token.owner()).should.be.equal(newOwner);
      var nowhere = 0x0000000000000000000000000000000000000000;
      (await token.pendingOwner()).should.be.bignumber.equal(nowhere);
    });
  });
}

module.exports.check = check;
