const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const bn = require('./helpers/bignumber.js');

function check(RegisteredUsers, owner, managers, investor, purchaser, beneficiary, deployTokenCb) {
  var registeredUsers;
  var token;

  beforeEach(async function () {
    registeredUsers = await RegisteredUsers.new();
    await registeredUsers.addRegisteredUser(investor, false);
    await registeredUsers.addRegisteredUser(managers[0], false);
    await registeredUsers.addRegisteredUser(managers[1], false);

    token = await deployTokenCb(registeredUsers);
  });

  describe('when enabled', function() {
  });

  it('should allow mint when enable', async function() {
    await token.mint(purchaser, 100000).should.be.fulfilled;
  });

  it('should allow transfer when enable', async function() {
    await token.mint(purchaser, 10).should.be.fulfilled;
    await token.transfer(investor, 10, {from: purchaser}).should.be.fulfilled;
  });

  it('should allow transfer big amount tokens', async function() {
    var amount = ether(90*(10**6));
    var tokens1 = await token.balanceOf(beneficiary);
    await token.mint(purchaser, amount).should.be.fulfilled;
    await token.transfer(beneficiary, amount, {from: purchaser}).should.be.fulfilled;
    var tokens2 = await token.balanceOf(beneficiary);
    tokens2.should.be.bignumber.equal(tokens1.plus(amount));
  });

  it('should allow approve when enable', async function() {
    await token.mint(purchaser, 10000).should.be.fulfilled;
    await token.approve(investor, 10000, {from: purchaser}).should.be.fulfilled;
  });

  it('should allow transferFrom when enable', async function() {
    await token.mint(purchaser, 10).should.be.fulfilled;
    await token.transferFrom(purchaser, beneficiary, 10, {from: investor}).should.be.fulfilled;
  });

  it('should allow increaseApproval when enable', async function() {
    await token.mint(purchaser, 10).should.be.fulfilled;
    await token.increaseApproval(investor, 10, {from: purchaser}).should.be.fulfilled;
  });

  it('should allow decreaseApproval when enable', async function() {
    await token.decreaseApproval(investor, 1, {from: purchaser}).should.be.fulfilled;
  });

  it('should allow disable', async function() {
    await token.disableToken({from: managers[0]}).should.be.fulfilled;
  });

  it('should reject mint when disable', async function() {
    await token.mint(purchaser, 10).should.be.rejected;
  });

  it('should reject transfer when disable', async function() {
    await token.transfer(investor, 1, {from: purchaser}).should.be.rejected;
  });

  it('should reject approve when disable', async function() {
    await token.approve(investor, 1, {from: purchaser}).should.be.rejected;
  });

  it('should reject transferFrom when disable', async function() {
    await token.transferFrom(purchaser, beneficiary, 1, {from: investor}).should.be.rejected;
  });

  it('should reject increaseApproval when disable', async function() {
    await token.increaseApproval(investor, 1, {from: purchaser}).should.be.rejected;
  });

  it('should reject decreaseApproval when disable', async function() {
    await token.decreaseApproval(investor, 1, {from: purchaser}).should.be.rejected;
  });

  it('should reject finishMinting when disable', async function() {
    await token.finishMinting({from: owner}).should.be.rejected;
  });

  it('can enable disabled token', async function() {
    await token.enableToken({from: managers[1]}).should.be.fulfilled;
    await token.mint(purchaser, 100).should.be.fulfilled;
    await token.approve(investor, 10, {from: purchaser}).should.be.fulfilled;
    await token.transfer(investor, 1, {from: purchaser}).should.be.fulfilled;
    await token.transferFrom(purchaser, beneficiary, 1, {from: investor}).should.be.fulfilled;
    await token.increaseApproval(investor, 1, {from: purchaser}).should.be.fulfilled;
    await token.decreaseApproval(investor, 1, {from: purchaser}).should.be.fulfilled;
    await token.finishMinting({from: owner}).should.be.fulfilled;
  });
}

module.exports.check = check;
