const BigNumber = web3.BigNumber;
const BalanceSheet = artifacts.require("./BalanceSheet.sol");
const Registry = artifacts.require('./Registry.sol')

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const bn = require('../helpers/bignumber.js');
const regAtt = require('../helpers/registryAttributeConst.js');

function check(accounts, deployTokenCb) {
  var token;
  var registry;
  var balanceSheet;
  var owner = accounts[0];
  var investor = accounts[1];
  var purchaser = accounts[2];
  var beneficiary = accounts[3];

  beforeEach(async function () {
    token = await deployTokenCb();
    balanceSheet = await BalanceSheet.new({from:owner });
    registry = await Registry.new({from:owner });

    await balanceSheet.transferOwnership(token.address).should.be.fulfilled;
    await registry.setAttribute(investor, regAtt.HAS_PASSED_KYC_AML, "Set HAS_PASSED_KYC_AML ON").should.be.fulfilled;
    await registry.setAttribute(purchaser, regAtt.HAS_PASSED_KYC_AML, "Set HAS_PASSED_KYC_AML ON").should.be.fulfilled;
    await registry.setAttribute(beneficiary, regAtt.HAS_PASSED_KYC_AML, "Set HAS_PASSED_KYC_AML ON").should.be.fulfilled;

    await token.setBalanceSheet(balanceSheet.address).should.be.fulfilled;
    await token.setRegistry(registry.address, {from : owner}).should.be.fulfilled;
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

    it('should allow burn()', async function() {
      await token.mint(investor, bn.tokens(10)).should.be.fulfilled;
      await token.burn(bn.tokens(8), "burn without pause", {from : investor}).should.be.fulfilled;
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

    it('should reject burn()', async function() {
      await token.mint(investor, bn.tokens(10)).should.be.fulfilled;
      await token.burn(bn.tokens(8), "burn when pause", {from : investor}).should.be.rejected;
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

    it('should allow burn()', async function() {
      await token.burn(bn.tokens(8), "burn when unpause", {from : purchaser}).should.be.fulfilled;
    });
  });
}

module.exports.check = check;
