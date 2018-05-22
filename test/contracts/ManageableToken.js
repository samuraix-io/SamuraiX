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
    await registeredUsers.addRegisteredUser(beneficiary, false);
    await registeredUsers.addRegisteredUser(purchaser, false);
    await registeredUsers.addRegisteredUser(managers[0], false);
    await registeredUsers.addRegisteredUser(managers[1], false);

    token = await deployTokenCb(registeredUsers);
  });

  describe('when not disabled', function() {
    it('should allow to mint', async function() {
      await token.mint(purchaser, bn.tokens(100000)).should.be.fulfilled;
    });

    it('should allow to finish minting', async function() {
      await token.finishMinting().should.be.fulfilled;
    });

    it('should allow transfer()', async function() {
      await token.mint(purchaser, bn.tokens(10)).should.be.fulfilled;
      await token.transfer(investor, bn.tokens(10), {from: purchaser}).should.be.fulfilled;
    });

    it('should allow approval', async function() {
      await token.approve(investor, bn.tokens(10), {from: purchaser}).should.be.fulfilled;
    });

    it('should allow transferFrom()', async function() {
      var amount = bn.tokens(10);
      await token.mint(purchaser, amount).should.be.fulfilled;
      await token.approve(investor, amount, {from: purchaser}).should.be.fulfilled;
      await token.transferFrom(purchaser, beneficiary, amount, {from: investor}).should.be.fulfilled;
    });

    it('should allow increaseApproval()', async function() {
      await token.increaseApproval(investor, bn.tokens(10), {from: purchaser}).should.be.fulfilled;
    });

    it('should allow decreaseApproval()', async function() {
      await token.decreaseApproval(investor, bn.tokens(1), {from: purchaser}).should.be.fulfilled;
    });
  });

  describe('disableToken()', function() {
    beforeEach(async function () {
      await token.mint(purchaser, bn.tokens(1000)).should.be.fulfilled;
      await token.approve(investor, bn.tokens(100), {from: purchaser}).should.be.fulfilled;

      await token.disableToken({from: managers[0]}).should.be.fulfilled;
    });

    it('enable() should be false', async function() {
      (await token.enable()).should.be.equal(false);
    });

    it('non-manager can not invoke disableToken()', async function() {
      await token.enableToken({from: managers[0]}).should.be.fulfilled;
      await token.disableToken({from: owner}).should.be.rejected;
      await token.disableToken({from: investor}).should.be.rejected;
    });

    it('multiple managers', async function() {
      await token.enableToken({from: managers[0]}).should.be.fulfilled;
      await token.disableToken({from: managers[0]}).should.be.fulfilled;
      await token.enableToken({from: managers[0]}).should.be.fulfilled;
      await token.disableToken({from: managers[1]}).should.be.fulfilled;
    });

    it('should reject minting', async function() {
      await token.mint(purchaser, bn.tokens(10)).should.be.rejected;
    });

    it('should reject transfer()', async function() {
      await token.transfer(investor, bn.tokens(1), {from: purchaser}).should.be.rejected;
    });

    it('should reject approval', async function() {
      await token.approve(investor, bn.tokens(1), {from: purchaser}).should.be.rejected;
    });

    it('should reject transferFrom()', async function() {
      await token.transferFrom(purchaser, beneficiary, bn.tokens(1), {from: investor}).should.be.rejected;
    });

    it('should reject increaseApproval()', async function() {
      await token.increaseApproval(investor, bn.tokens(1), {from: purchaser}).should.be.rejected;
    });

    it('should reject decreaseApproval()', async function() {
      await token.decreaseApproval(investor, bn.tokens(1), {from: purchaser}).should.be.rejected;
    });

    it('should reject finishMinting()', async function() {
      await token.finishMinting().should.be.rejected;
    });
  });

  describe('enableToken()', function() {
    beforeEach(async function () {
      await token.disableToken({from: managers[0]}).should.be.fulfilled;
      await token.enableToken({from: managers[0]}).should.be.fulfilled;
    });

    it('enable() should be true', async function() {
      (await token.enable()).should.be.equal(true);
    });

    it('non-manager can not invoke enableToken()', async function() {
      await token.disableToken({from: managers[0]}).should.be.fulfilled;
      await token.enableToken({from: owner}).should.be.rejected;
      await token.enableToken({from: investor}).should.be.rejected;
    });

    it('multiple managers', async function() {
      await token.disableToken({from: managers[0]}).should.be.fulfilled;
      await token.enableToken({from: managers[0]}).should.be.fulfilled;
      await token.disableToken({from: managers[0]}).should.be.fulfilled;
      await token.enableToken({from: managers[1]}).should.be.fulfilled;
    });

    it('should allow to mint', async function() {
      await token.mint(purchaser, bn.tokens(1000)).should.be.fulfilled;
    });

    it('should allow to finish minting', async function() {
      await token.finishMinting().should.be.fulfilled;
    });

    it('should allow transfer()', async function() {
      await token.mint(purchaser, bn.tokens(1000)).should.be.fulfilled;
      await token.transfer(beneficiary, bn.tokens(1), {from: purchaser}).should.be.fulfilled;
    });

    it('should allow approval', async function() {
      await token.approve(beneficiary, bn.tokens(1), {from: purchaser}).should.be.fulfilled;
    });

    it('should allow increaseApproval()', async function() {
      await token.increaseApproval(beneficiary, bn.tokens(1), {from: purchaser}).should.be.fulfilled;
    });

    it('should allow decreaseApproval()', async function() {
      await token.decreaseApproval(beneficiary, bn.tokens(1), {from: purchaser}).should.be.fulfilled;
    });

    it('should allow transferFrom()', async function() {
      await token.mint(purchaser, bn.tokens(1000)).should.be.fulfilled;
      await token.approve(beneficiary, bn.tokens(10), {from: purchaser}).should.be.fulfilled;
      await token.transferFrom(purchaser, beneficiary, bn.tokens(1), {from: beneficiary}).should.be.fulfilled;
    });
  });
}

module.exports.check = check;
