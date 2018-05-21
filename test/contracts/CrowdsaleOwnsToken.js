const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

function check(accounts, deployCrowdsaleAndTokenCb) {
  var crowdsale;
  var token;
  var owner = accounts[0];
  var investor = accounts[3];

  beforeEach(async function () {
    var ret = await deployCrowdsaleAndTokenCb();
    crowdsale = ret[0];
    token = ret[1];
  });

  it('should reject if owner have not transfered token ownership to crowdsale address', async function() {
    await crowdsale.claimTokenOwnership().should.be.rejected;
  });

  it('should reject non-owner', async function() {
    await token.transferOwnership(crowdsale.address).should.be.fulfilled;
    await crowdsale.claimTokenOwnership({from: investor}).should.be.rejected;
  });

  it('should allow to update the token ownership', async function() {
    await token.transferOwnership(crowdsale.address).should.be.fulfilled;
    await crowdsale.claimTokenOwnership().should.be.fulfilled;
    (await token.owner()).should.be.equal(crowdsale.address);
  });
}

module.exports.check = check;
