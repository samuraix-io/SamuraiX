const BigNumber = web3.BigNumber;
const BalanceSheet = artifacts.require("./BalanceSheet.sol");
const Registry = artifacts.require('./Registry.sol')
const bn = require('../helpers/bignumber.js');
const regAtt = require('../helpers/registryAttributeConst.js');

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

function check(accounts, deployTokenCb) {
  var token;
  var registry;
  var balanceSheet;

  var owner = accounts[0];
  var non_owner = accounts[5];
  var mandator = accounts[1];
  var non_mandator = accounts[6];
  var purchaser = accounts[2];
  var beneficiary = accounts[3];
  var investor = accounts[4];

  beforeEach(async function () {
    token = await deployTokenCb();
    balanceSheet = await BalanceSheet.new({from:owner });
    registry = await Registry.new({from:owner });
    await balanceSheet.transferOwnership(token.address).should.be.fulfilled;
    await registry.setAttribute(purchaser, regAtt.HAS_PASSED_KYC_AML, "Set HAS_PASSED_KYC_AML ON").should.be.fulfilled;
    await registry.setAttribute(beneficiary, regAtt.HAS_PASSED_KYC_AML, "Set HAS_PASSED_KYC_AML ON").should.be.fulfilled;
    await registry.setAttribute(investor, regAtt.HAS_PASSED_KYC_AML, "Set HAS_PASSED_KYC_AML ON").should.be.fulfilled;
    await token.setBalanceSheet(balanceSheet.address).should.be.fulfilled;
    await token.setRegistry(registry.address, {from : owner}).should.be.fulfilled;
  });

  describe('setDelegatedFrom()', function() {
    it('Should allow owner set delegated from', async function() {
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
    });

    it('Should reject non-owner set delegated from', async function() {
      await token.setDelegatedFrom(mandator, {from: non_owner}).should.be.rejected;
    });

    it('mandator will be changed', async function() {
      let _oldmandator = token.delegatedFrom();
      assert.notEqual(_oldmandator, mandator);
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
      let _currmandator = token.delegatedFrom();
      assert.notEqual(_currmandator, mandator);
    });

    it ('Should log event', async function() {
      const {logs} = await token.setDelegatedFrom(mandator, {from:owner}).should.be.fulfilled;
      const delegateEvent = logs.find(e => e.event === 'DelegatedFromSet');
      delegateEvent.should.exist;
      (delegateEvent.args.addr).should.equal(mandator);
    });
  });

  describe('delegateTotalSupply()', function() {
    it('Should allow mandator to get totalSupply', async function() {
      let _amount = bn.tokens(100);
      await token.mint(investor, _amount).should.be.fulfilled;
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;

      let _totalSupply = await token.delegateTotalSupply({from : mandator}).should.be.fulfilled;
      _totalSupply.should.be.bignumber.equal(_amount);
    });

    it('Should reject non-mandator to get totalSupply', async function() {
      let _amount = bn.tokens(100);
      await token.mint(investor, _amount).should.be.fulfilled;
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;

      let _totalSupply = await token.delegateTotalSupply({from : non_mandator}).should.be.rejected;
    });
  });

  describe('delegateBalanceOf()', function() {
    it('Should allow mandator to get delegateBalanceOf', async function() {
      let _amount = bn.tokens(100);
      await token.mint(investor, _amount).should.be.fulfilled;
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;

      let _delegateBalanceOf = await token.delegateBalanceOf(investor, {from : mandator}).should.be.fulfilled;
      _delegateBalanceOf.should.be.bignumber.equal(_amount);
    });

    it('Should reject non-mandator to get delegateBalanceOf', async function() {
      let _amount = bn.tokens(100);
      await token.mint(investor, _amount).should.be.fulfilled;
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;

      let _delegateBalanceOf = await token.delegateBalanceOf({from : non_mandator}).should.be.rejected;
    });
  });

  describe('delegateTransfer()', function() {
    it('should allow to transfer tokens', async function() {
      await token.mint(investor, bn.tokens(100)).should.be.fulfilled;
      var balance1Before = await token.balanceOf(investor);
      var balance2Before = await token.balanceOf(purchaser);
      var amount = bn.tokens(10);
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;

      await token.delegateTransfer(purchaser, amount, investor, {from: mandator}).should.be.fulfilled;
      var balance1After = await token.balanceOf(investor);
      var balance2After = await token.balanceOf(purchaser);

      balance2After.should.be.bignumber.equal(balance2Before.plus(amount));
      balance1After.should.be.bignumber.equal(balance1Before.minus(amount));
    });

    it('should reject to transfer tokens by non-mandator', async function() {
      await token.mint(investor, bn.tokens(100)).should.be.fulfilled;
      var amount = bn.tokens(10);
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;

      await token.delegateTransfer(purchaser, amount, investor, {from: non_mandator}).should.be.rejected;
    });
  });

  describe('delegateAllowance()', function() {
    it('Should have expected initial value', async function() {
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
      (await token.delegateAllowance(investor, purchaser, {from: mandator})).should.be.bignumber.equal(0);
    });

    it('Should reject if call from non-mandator', async function() {
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
      await token.delegateAllowance(investor, purchaser, {from: non_mandator}).should.be.rejected;
    });
  });

  describe('delegateTransferFrom()', function() {
    it('Should allow tranferFrom ', async function() {
      var amount = bn.tokens(100);
      await token.mint(investor, amount).should.be.fulfilled;
      await token.approve(purchaser, amount, {from: investor}).should.be.fulfilled;
      var balance1Before = await token.balanceOf(investor);
      var balance2Before = await token.balanceOf(purchaser);

      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
      await token.delegateTransferFrom(investor, purchaser, amount, purchaser, {from: mandator}).should.be.fulfilled;

      var balance1After = await token.balanceOf(investor);
      var balance2After = await token.balanceOf(purchaser);

      balance2After.should.be.bignumber.equal(balance2Before.plus(amount));
      balance1After.should.be.bignumber.equal(balance1Before.minus(amount));
    });

    it('Should reject tranferFrom if the call is called by non_mandator ', async function() {
      var amount = bn.tokens(100);
      await token.mint(investor, amount).should.be.fulfilled;
      await token.approve(purchaser, amount, {from: investor}).should.be.fulfilled;

      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
      await token.delegateTransferFrom(investor, purchaser, amount, purchaser, {from: non_mandator}).should.be.rejected;
    });
  });

  describe('delegateApprove()', function() {
    var amount;
    beforeEach(async function () {
      amount = bn.tokens(100);
      await token.mint(investor, amount).should.be.fulfilled;
    });

    it('should allow to delegateApprove tokens', async function() {
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
      await token.delegateApprove(purchaser, amount.minus(bn.tokens(1)), investor, {from: mandator}).should.be.fulfilled;
    });

    it('should reject to delegateApprove tokens if the call is called by non_mandator', async function() {
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
      await token.delegateApprove(purchaser, amount.minus(bn.tokens(1)), investor, {from: non_mandator}).should.be.rejected;
    });
  });

  describe('delegateIncreaseApproval()', function() {
    var amount;
    beforeEach(async function () {
      amount = bn.tokens(100);
      await token.mint(investor, amount).should.be.fulfilled;
    });

    it('should allow to delegateIncreaseApproval tokens', async function() {
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
      await token.delegateIncreaseApproval(purchaser, amount.minus(bn.tokens(1)), investor, {from: mandator}).should.be.fulfilled;
    });

    it('should reject to delegateIncreaseApproval tokens if the call is called by non_mandator', async function() {
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
      await token.delegateIncreaseApproval(purchaser, amount.minus(bn.tokens(1)), investor, {from: non_mandator}).should.be.rejected;
    });
  });

  describe('delegateDecreaseApproval()', function() {
    var amount;
    beforeEach(async function () {
      amount = bn.tokens(100);
      await token.mint(investor, amount).should.be.fulfilled;
    });

    it('should allow to delegateDecreaseApproval tokens', async function() {
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
      await token.delegateDecreaseApproval(purchaser, amount.minus(bn.tokens(1)), investor, {from: mandator}).should.be.fulfilled;
    });

    it('should reject to delegateDecreaseApproval tokens if the call is called by non_mandator', async function() {
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
      await token.delegateDecreaseApproval(purchaser, amount.minus(bn.tokens(1)), investor, {from: non_mandator}).should.be.rejected;
    });
  });

  describe('delegateBurn()', function() {
    var amount;
    beforeEach(async function () {
      amount = bn.tokens(100);
      await token.mint(investor, amount).should.be.fulfilled;
    });
    it('should allow to delegateBurn tokens', async function() {

      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
      await token.delegateBurn(investor, bn.tokens(10), 'delegateBurn', {from: mandator}).should.be.fulfilled;
    });

    it('should reject to delegateBurn tokens if the call is called by non_mandator', async function() {
      await token.setDelegatedFrom(mandator, {from: owner}).should.be.fulfilled;
      await token.delegateBurn(investor, bn.tokens(10), 'delegateBurn', {from: non_mandator}).should.be.rejected;
    });
  });
}

module.exports.check = check;
