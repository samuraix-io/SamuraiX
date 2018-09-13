const BigNumber = web3.BigNumber;
const BalanceSheet = artifacts.require("./BalanceSheet");
const Registry = artifacts.require('Registry')
const Attribute = artifacts.require('Attribute')
const should = require('chai')
.use(require('chai-as-promised'))
.use(require('chai-bignumber')(BigNumber))
.should();

const bn = require('./helpers/bignumber.js');
const regAtt = require('./helpers/registryAttributeConst.js');
function check(accounts, deployTokenCb) {
  var token;
  var registry;
  var balanceSheet;
  var owner = accounts[0];
  var investor = accounts[1];
  var purchaser = accounts[2];

  beforeEach(async function () {
    token = await deployTokenCb();
    balanceSheet = await BalanceSheet.new({from:owner });
    registry = await Registry.new({from:owner });
    await registry.setAttribute(investor, regAtt.HAS_PASSED_KYC_AML, "set HAS_PASSED_KYC_AML : ON").should.be.fulfilled;
    await registry.setAttribute(purchaser, regAtt.HAS_PASSED_KYC_AML, "set HAS_PASSED_KYC_AML : ON").should.be.fulfilled;
    await registry.setAttribute(owner, regAtt.HAS_PASSED_KYC_AML, "set HAS_PASSED_KYC_AML : ON").should.be.fulfilled;

    await token.setRegistry(registry.address, {from : owner}).should.be.fulfilled;
    await balanceSheet.transferOwnership(token.address).should.be.fulfilled;
    await token.setBalanceSheet(balanceSheet.address).should.be.fulfilled;
  });
  describe('mint()', function() {
    it("add beneficiary address to the holders set", async function () {
      await token.mint(investor, bn.tokens(100));
      (await token.getTheNumberOfHolders()).should.be.bignumber.equal(1);
      (await token.getHolder(0)).should.be.equal(investor);
    });
    it("should not add existed address to the holders set", async function () {
      await token.mint(investor, bn.tokens(100));
      (await token.getTheNumberOfHolders()).should.be.bignumber.equal(1);
      (await token.getHolder(0)).should.be.equal(investor);
      await token.mint(investor, bn.tokens(200));
      (await token.getTheNumberOfHolders()).should.be.bignumber.equal(1);
    });
    describe('transfer()', function() {
      it("add target address to the holders set", async function () {
        await token.mint(owner, bn.tokens(1000));
        await token.transfer(investor, bn.tokens(100));
        (await token.getTheNumberOfHolders()).should.be.bignumber.equal(2);
        (await token.getHolder(0)).should.be.equal(owner);
        (await token.getHolder(1)).should.be.equal(investor);
      });
      it("should not add existed address to the holders set", async function () {
        await token.mint(owner, bn.tokens(1000));
        await token.mint(purchaser, bn.tokens(1000));
        await token.transfer(investor, bn.tokens(100));
        (await token.getTheNumberOfHolders()).should.be.bignumber.equal(3);
        (await token.getHolder(0)).should.be.equal(owner);
        (await token.getHolder(1)).should.be.equal(purchaser);
        (await token.getHolder(2)).should.be.equal(investor);

        await token.transfer(investor, bn.tokens(100), {from: purchaser});
        (await token.getTheNumberOfHolders()).should.be.bignumber.equal(3);
        (await token.getHolder(0)).should.be.equal(owner);
        (await token.getHolder(1)).should.be.equal(purchaser);
        (await token.getHolder(2)).should.be.equal(investor);
      });
    });
    describe('transferFrom()', function() {
      it("add target address to the holders set", async function () {
        await token.mint(owner, bn.tokens(1000));
        await token.approve(investor, bn.tokens(1000))
        await token.transferFrom(owner, investor, bn.tokens(100), {from: investor});
        (await token.getTheNumberOfHolders()).should.be.bignumber.equal(2);
        (await token.getHolder(0)).should.be.equal(owner);
        (await token.getHolder(1)).should.be.equal(investor);
      });
      it("should not add existed address to the holders set", async function () {
        await token.mint(owner, bn.tokens(1000));
        await token.mint(purchaser, bn.tokens(1000));
        await token.approve(investor, bn.tokens(1000))
        await token.transferFrom(owner, investor, bn.tokens(100), {from: investor});
        (await token.getTheNumberOfHolders()).should.be.bignumber.equal(3);
        (await token.getHolder(0)).should.be.equal(owner);
        (await token.getHolder(1)).should.be.equal(purchaser);
        (await token.getHolder(2)).should.be.equal(investor);

        await token.approve(investor, bn.tokens(1000), {from: purchaser})
        await token.transferFrom(purchaser, investor, bn.tokens(100), {from: investor});
        (await token.getTheNumberOfHolders()).should.be.bignumber.equal(3);
        (await token.getHolder(0)).should.be.equal(owner);
        (await token.getHolder(1)).should.be.equal(purchaser);
        (await token.getHolder(2)).should.be.equal(investor);
      });
    });

    describe('getTheNumberOfHolders()', function() {
      it("should return the number of token holders exactly", async function () {
        await token.mint(owner, bn.tokens(1000));
        await token.mint(investor, bn.tokens(100));
        (await token.getTheNumberOfHolders()).should.be.bignumber.equal(2);
      });

      it("should not be called by non-owner", async function () {
        await token.getTheNumberOfHolders({from: investor}).should.be.rejected;
      });
    });

    describe('getHolder()', function() {
      it("should return the specified token holder", async function () {
        await token.mint(owner, bn.tokens(1000));
        await token.mint(investor, bn.tokens(100));
        (await token.getHolder(1)).should.be.equal(investor);
      });
      it("should not be called by non-owner", async function () {
        await token.getHolder({from: investor}).should.be.rejected;
      });
    });
  });
};

module.exports.check = check;
