const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

function check(accounts, deployContractCb) {
  var contractInstance;
  var owner = accounts[0];
  var newOwner = accounts[1];
  var other = accounts[2];

  beforeEach(async function () {
    contractInstance = await deployContractCb();
  });

  it('should reject non-owner to transfer ownership', async function() {
    await contractInstance.transferOwnership({from: other}).should.be.rejected;
  });

  it('should reject non-new-owner to accept the transfer', async function() {
    await contractInstance.transferOwnership(newOwner).should.be.fulfilled;
    await contractInstance.claimOwnership({from: other}).should.be.rejected;
  });

  it('should keep owner unchange until the ownership to be claimed', async function() {
    await contractInstance.transferOwnership(newOwner).should.be.fulfilled;
    (await contractInstance.pendingOwner()).should.be.equal(newOwner);
    (await contractInstance.owner()).should.be.equal(owner);
  });

  it('should allow the owner to cancel the transfer', async function() {
    await contractInstance.transferOwnership(newOwner).should.be.fulfilled;
    await contractInstance.cancelOwnershipTransfer().should.be.fulfilled;
    (await contractInstance.pendingOwner()).should.be.equal(owner);
    (await contractInstance.owner()).should.be.equal(owner);
  });

  it('should allow the new owner to accept the transfer', async function() {
    await contractInstance.transferOwnership(newOwner).should.be.fulfilled;
    await contractInstance.claimOwnership({from: newOwner}).should.be.fulfilled;
    (await contractInstance.owner()).should.be.equal(newOwner);
    var nowhere = 0x0000000000000000000000000000000000000000;
    (await contractInstance.pendingOwner()).should.be.bignumber.equal(nowhere);
  });
}

module.exports.check = check;
