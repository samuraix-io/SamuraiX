const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const bn = require('./helpers/bignumber.js');

function check(accounts, deployTokenCb) {
  var token;
  var owner = accounts[0];
  var investor = accounts[1];
  var purchaser = accounts[2];
  var beneficiary = accounts[3];

  beforeEach(async function () {
    token = await deployTokenCb();
  });

  describe('when not paused', function() {
    it('should allow approval', async function() {
      await token.mint(purchaser, bn.tokens(10)).should.be.fulfilled;
      await token.approve(investor, bn.tokens(2), {from: purchaser}).should.be.fulfilled;
    });

    it('should allow transfer()', async function() {
      await token.mint(purchaser, bn.tokens(10)).should.be.fulfilled;
      await token.transfer(beneficiary, bn.tokens(1), {from: purchaser}).should.be.fulfilled;
    });

    it('should allow increaseApproval()', async function() {
      await token.increaseApproval(investor, bn.tokens(3), {from: purchaser}).should.be.fulfilled;
    });

    it('should allow decreaseApproval()', async function() {
      await token.decreaseApproval(investor, bn.tokens(1), {from: purchaser}).should.be.fulfilled;
    });

    it('should allow transferFrom()', async function() {
      await token.mint(purchaser, bn.tokens(10)).should.be.fulfilled;
      await token.approve(investor, bn.tokens(2), {from: purchaser}).should.be.fulfilled;
      await token.transferFrom(purchaser, investor, bn.tokens(2), {from: investor}).should.be.fulfilled;
    });
  });

  describe('pause()', function() {
    beforeEach(async function () {
      await token.pause().should.be.fulfilled;
    });

    it('paused() should return true', async function() {
      (await token.paused()).should.be.equal(true);
    });

    it('non-owner can not invoke pause()', async function() {
      await token.unpause().should.be.fulfilled;
      await token.pause({from: purchaser}).should.be.rejected;
    });

    it('should allow minting', async function() {
      await token.mint(investor, bn.tokens(1)).should.be.fulfilled;
    });

    it('should reject transfer()', async function() {
      await token.mint(purchaser, bn.tokens(1)).should.be.fulfilled;
      await token.transfer(investor, bn.tokens(1), {from: purchaser}).should.be.rejected;
    });

    it('should reject approval', async function() {
      await token.approve(investor, bn.tokens(1), {from: purchaser}).should.be.rejected;
    });

    it('should reject increaseApproval()', async function() {
      await token.increaseApproval(investor, bn.tokens(1), {from: purchaser}).should.be.rejected;
    });

    it('should reject decreaseApproval()', async function() {
      await token.decreaseApproval(investor, bn.tokens(1), {from: purchaser}).should.be.rejected;
    });

    it('should reject transferFrom()', async function() {
      await token.mint(purchaser, bn.tokens(1)).should.be.fulfilled;
      await token.unpause();
      await token.approve(investor, bn.tokens(1), {from: purchaser}).should.be.fulfilled;
      await token.pause();
      await token.transferFrom(purchaser, investor, bn.tokens(1), {from: investor}).should.be.rejected;
    });
  });

  describe('unpause()', function() {
    beforeEach(async function () {
      await token.pause().should.be.fulfilled;
      await token.unpause().should.be.fulfilled;

      await token.mint(purchaser, bn.tokens(10)).should.be.fulfilled;
    });

    it('paused() should return false', async function() {
      (await token.paused()).should.be.equal(false);
    });

    it('non-owner can not invoke unpause()', async function() {
      await token.pause().should.be.fulfilled;
      await token.unpause({from: purchaser}).should.be.rejected;
    });

    it('should allow transfer()', async function() {
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
      await token.approve(beneficiary, bn.tokens(1), {from: purchaser}).should.be.fulfilled;
      await token.transferFrom(purchaser, beneficiary, bn.tokens(1), {from: beneficiary}).should.be.fulfilled;
    });
  });
}

module.exports.check = check;
