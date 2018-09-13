const BigNumber = web3.BigNumber;
const Registry = artifacts.require('Registry')
const Attribute = artifacts.require('Attribute')

const bn = require('./helpers/bignumber.js');
const regAtt = require('./helpers/registryAttributeConst.js');
const BalanceSheet = artifacts.require("./BalanceSheet");

const should = require('chai')
.use(require('chai-as-promised'))
.use(require('chai-bignumber')(BigNumber))
.should();

function check(accounts, deployTokenCb) {
  var token;
  var balanceSheet;
  var registry;
  const owner       = accounts[0];
  const guess       = accounts[1];
  const receiver    = accounts[2];
  const holder      = accounts[3];

  const TEN_TOKENS      = bn.tokens(10);

  beforeEach(async function () {
    token = await deployTokenCb();
    balanceSheet = await BalanceSheet.new({from:owner});
    registry = await Registry.new({from:owner});

    await balanceSheet.transferOwnership(token.address).should.be.fulfilled;
    await token.setBalanceSheet(balanceSheet.address).should.be.fulfilled;
    await token.setRegistry(registry.address, {from : owner}).should.be.fulfilled;

    await registry.setAttribute(holder, regAtt.HAS_PASSED_KYC_AML, "set HAS_PASSED_KYC_AML ON").should.be.fulfilled;
    await token.mint(holder, TEN_TOKENS).should.be.fulfilled;
  });

  describe("mint()", function () {
    it('Should allow mint if user has passed KYC_AML and not in Blacklist', async function () {
      await registry.setAttribute(guess, regAtt.HAS_PASSED_KYC_AML, "set HAS_PASSED_KYC_AML ON").should.be.fulfilled;
      (await registry.hasAttribute(guess, regAtt.IS_BLACKLISTED)).should.equal(false);
      await token.mint(guess, TEN_TOKENS).should.be.fulfilled;
    });

    it('Should reject mint if user has not passed KYC_AML', async function () {
      (await registry.hasAttribute(guess, regAtt.HAS_PASSED_KYC_AML)).should.equal(false);
      await token.mint(guess, TEN_TOKENS).should.be.rejected;
    });

    it('Should reject mint if user is in Blacklist', async function () {
      await registry.setAttribute(guess, regAtt.HAS_PASSED_KYC_AML, "set HAS_PASSED_KYC_AML ON").should.be.fulfilled;
      await registry.setAttribute(guess, regAtt.IS_BLACKLISTED, "set IS_BLACKLISTED ON").should.be.fulfilled;
      await token.mint(guess, TEN_TOKENS).should.be.rejected;
    });
  });

  describe("transfer()", function () {
    it('Should allow transfer if sender and receiver have passed KYC_AML and not in Blacklist', async function () {
      await registry.setAttribute(guess, regAtt.HAS_PASSED_KYC_AML, "set HAS_PASSED_KYC_AML ON").should.be.fulfilled;

      (await registry.hasAttribute(guess, regAtt.HAS_PASSED_KYC_AML)).should.equal(true);
      (await registry.hasAttribute(guess, regAtt.IS_BLACKLISTED)).should.equal(false);

      await token.transfer(guess, TEN_TOKENS, {from : holder}).should.be.fulfilled;
    });

    it('Should reject transfer if sender is in Blacklist', async function () {
      await registry.setAttribute(guess, regAtt.HAS_PASSED_KYC_AML, "set HAS_PASSED_KYC_AML ON").should.be.fulfilled;
      await registry.setAttribute(holder, regAtt.IS_BLACKLISTED, "set IS_BLACKLISTED ON").should.be.fulfilled;

      (await registry.hasAttribute(guess, regAtt.HAS_PASSED_KYC_AML)).should.equal(true);
      (await registry.hasAttribute(holder, regAtt.IS_BLACKLISTED)).should.equal(true);

      await token.transfer(guess, TEN_TOKENS, {from : holder}).should.be.rejected;
    });

    it('Should reject transfer if receiver is in Blacklist', async function () {
      await registry.setAttribute(guess, regAtt.IS_BLACKLISTED, "set IS_BLACKLISTED ON").should.be.fulfilled;
      (await registry.hasAttribute(guess, regAtt.IS_BLACKLISTED)).should.equal(true);

      await token.transfer(guess, TEN_TOKENS, {from : holder}).should.be.rejected;
    });

    it('Should reject transfer if sender has not passed KYC_AML', async function () {
      await registry.clearAttribute(holder, regAtt.HAS_PASSED_KYC_AML, "PASSED_KYC_AML").should.be.fulfilled;

      (await registry.hasAttribute(holder, regAtt.HAS_PASSED_KYC_AML)).should.equal(false);
      (await registry.hasAttribute(guess, regAtt.IS_BLACKLISTED)).should.equal(false);

      await token.transfer(guess, TEN_TOKENS, {from : holder}).should.be.rejected;
    });
  });

  describe("transferFrom()", function () {
    beforeEach(async function () {
      await token.approve(guess, TEN_TOKENS, {from: holder}).should.be.fulfilled;
      var val = await token.allowance(holder, guess);
      val.should.be.bignumber.equal(TEN_TOKENS);
    });

    it('Should allow transferFrom if sender and receiver have passed KYC_AML and not in Blacklist', async function () {
      await registry.setAttribute(receiver, regAtt.HAS_PASSED_KYC_AML, "set HAS_PASSED_KYC_AML ON").should.be.fulfilled;

      (await registry.hasAttribute(receiver, regAtt.HAS_PASSED_KYC_AML)).should.equal(true);
      (await registry.hasAttribute(guess, regAtt.IS_BLACKLISTED)).should.equal(false);
      (await registry.hasAttribute(receiver, regAtt.IS_BLACKLISTED)).should.equal(false);

      await token.transferFrom(holder, receiver, TEN_TOKENS, {from: guess}).should.be.fulfilled;
    });

    it('Should reject transferFrom if sender is in Blacklist', async function () {
      await registry.setAttribute(receiver, regAtt.HAS_PASSED_KYC_AML, "set HAS_PASSED_KYC_AML ON").should.be.fulfilled;
      await registry.setAttribute(holder, regAtt.IS_BLACKLISTED, "set IS_BLACKLISTED ON").should.be.fulfilled;

      (await registry.hasAttribute(receiver, regAtt.HAS_PASSED_KYC_AML)).should.equal(true);
      (await registry.hasAttribute(receiver, regAtt.IS_BLACKLISTED)).should.equal(false);
      (await registry.hasAttribute(holder, regAtt.IS_BLACKLISTED)).should.equal(true);

      await token.transferFrom(holder, receiver, TEN_TOKENS, {from: guess}).should.be.rejected;
    });

    it('Should reject transferFrom if receiver is in Blacklist', async function () {
      await registry.setAttribute(receiver, regAtt.HAS_PASSED_KYC_AML, "set HAS_PASSED_KYC_AML ON").should.be.fulfilled;
      await registry.setAttribute(receiver, regAtt.IS_BLACKLISTED, "set IS_BLACKLISTED ON").should.be.fulfilled;

      (await registry.hasAttribute(receiver, regAtt.HAS_PASSED_KYC_AML)).should.equal(true);
      (await registry.hasAttribute(holder, regAtt.IS_BLACKLISTED)).should.equal(false);
      (await registry.hasAttribute(receiver, regAtt.IS_BLACKLISTED)).should.equal(true);

      await token.transferFrom(holder, receiver, TEN_TOKENS, {from: guess}).should.be.rejected;
    });

    it('Should reject transferFrom if receiver has not passed KYC_AML', async function () {
      (await registry.hasAttribute(receiver, regAtt.IS_BLACKLISTED)).should.equal(false);
      (await registry.hasAttribute(receiver, regAtt.HAS_PASSED_KYC_AML)).should.equal(false);
      (await registry.hasAttribute(holder, regAtt.IS_BLACKLISTED)).should.equal(false);

      await token.transferFrom(holder, receiver, TEN_TOKENS, {from: guess}).should.be.rejected;
    });
  });
}

module.exports.check = check;
