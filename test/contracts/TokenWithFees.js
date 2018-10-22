import assertRevert from './helpers/assertRevert'
import assertBalance from './helpers/assertBalance'
const BalanceSheet = artifacts.require("./BalanceSheet");
const Registry = artifacts.require('Registry')
const Attribute = artifacts.require('Attribute')
const expectEvent = require('./helpers/expectEvent');
const BigNumber = web3.BigNumber;
const bn = require('./helpers/bignumber.js');
const regAtt = require('./helpers/registryAttributeConst.js');

const should = require('chai')
.use(require('chai-as-promised'))
.use(require('chai-bignumber')(BigNumber))
.should();

function check(accounts, deployTokenCb) {
  var token;
  var registry;
  var balanceSheet;
  var owner     = accounts[0];
  var sender    = accounts[1];
  var receiver  = accounts[2];
  var manager   = accounts[3];
  var manager1  = accounts[4];
  var wallet    = accounts[5];

  const TEN_TOKENS = bn.tokens(10);

  beforeEach(async function () {
    token = await deployTokenCb();
    balanceSheet = await BalanceSheet.new({from: owner});
    registry = await Registry.new({from: owner});
    await registry.setAttribute(owner, regAtt.ROLE_MANAGER, "set ROLE_MANAGER ON").should.be.fulfilled;
    await registry.setAttribute(manager, regAtt.ROLE_MANAGER, "set ROLE_MANAGER ON").should.be.fulfilled;
    await registry.setAttribute(manager1, regAtt.ROLE_MANAGER, "set ROLE_MANAGER ON").should.be.fulfilled;
    await token.setRegistry(registry.address, {from : owner}).should.be.fulfilled;
    await balanceSheet.transferOwnership(token.address).should.be.fulfilled;
    await token.setBalanceSheet(balanceSheet.address).should.be.fulfilled;
  });

  describe('changeWallet()', function(){
    it("Should allow manager to change system-wallet to a valid address", async function(){
      let old_wallet = await token.beneficiary();
      assert.notEqual(old_wallet, wallet);

      await token.changeWallet(wallet, {from: manager});
      let new_wallet = await token.beneficiary();
      assert.equal(new_wallet, wallet);
    });

    it("should be rejected if caller is not manager", async function(){
      let guess = accounts[7];
      await token.changeWallet(wallet, {from: guess}).should.be.rejected;
    });

    it("Multiple managers can change system-wallet", async function() {
      let old_wallet = await token.beneficiary();
      assert.notEqual(old_wallet, wallet);

      await token.changeWallet(wallet, {from: manager});
      let new_wallet = await token.beneficiary();
      assert.equal(new_wallet, wallet);

      await token.changeWallet(old_wallet, {from: manager1});
      let lastest_wallet = await token.beneficiary();
      assert.equal(lastest_wallet, old_wallet);
    })

    it("Fees should be transferred to the new system-wallet", async function(){
      let old_wallet = await token.beneficiary();
      assert.notEqual(old_wallet, wallet);

      await token.changeWallet(wallet, {from: manager});
      let new_wallet = await token.beneficiary();
      assert.equal(new_wallet, wallet);

      let oldWalletBalance_before = await token.balanceOf(old_wallet);
      let newWalletBalance_before = await token.balanceOf(new_wallet);

      await token.changeFees(1, 2, {from: manager1})
      let tokens = bn.tokens(100);
      await registry.setAttribute(sender, 3, "set_att HAS_PASSED_KYC_AML : ON").should.be.fulfilled;
      await registry.setAttribute(receiver, 3, "set_att HAS_PASSED_KYC_AML : ON").should.be.fulfilled;
      await token.mint(sender, tokens, {from : owner}).should.be.fulfilled;
      await token.transfer(receiver, tokens, {from: sender});

      let oldWalletBalance_after = await token.balanceOf(old_wallet);
      let newWalletBalance_after = await token.balanceOf(new_wallet);
      let fee = tokens * 1/2;
      newWalletBalance_after.minus(newWalletBalance_before).should.be.bignumber.equal(fee);
      oldWalletBalance_after.minus(oldWalletBalance_before).should.be.bignumber.equal(0);
    });

    it("invalid address should be rejected", async function() {
      await token.changeWallet(0x0, {from: manager}).should.be.rejected;
    });

    it("Catch event log", async function() {
      let oldWallet = await token.beneficiary();
      const { logs } = await token.changeWallet(wallet, {from: manager});
      const event = logs.find(e => e.event === 'ChangeWallet');
      event.should.exist;
      (event.args.addr).should.equal(wallet);
    });
  });

  describe('changeFees()', function () {
    it('should allow manager changing fees', async function () {
      const oldNumerator = await token.transferFeeNumerator();
      const oldDenominator = await token.transferFeeDenominator();
      assert.equal(oldNumerator, 0);
      assert.equal(oldDenominator, 100);

      await token.changeFees(1, 2, {from: manager1})
      const newNumerator = await token.transferFeeNumerator();
      assert.equal(newNumerator, 1)
      const newDenominator = await token.transferFeeDenominator();
      assert.equal(newDenominator, 2)
    });

    it('should reject non-manager', async function () {
      await token.changeFees(1, 2, {from: sender}).should.be.rejected;
    });

    it("Multiple managers can change fees", async function() {
      await token.changeFees(1, 3, {from: manager})
      const newNumerator = await token.transferFeeNumerator();
      assert.equal(newNumerator, 1)
      const newDenominator = await token.transferFeeDenominator();
      assert.equal(newDenominator, 3)

      await token.changeFees(1, 4, {from: manager1})
      const lastNumerator = await token.transferFeeNumerator();
      assert.equal(lastNumerator, 1)
      const lastDenominator = await token.transferFeeDenominator();
      assert.equal(lastDenominator, 4)
    })

    it('should reject setting fees to 100%', async function () {
      await token.changeFees(1, 1, {from: manager}).should.be.rejected;
    });

    it('should reject setting fees which is greater than 100%', async function () {
      await token.changeFees(2, 1, {from: manager}).should.be.rejected;
    });

    it('should log event', async function () {
      const { logs } = await token.changeFees(1, 2, {from: manager1})
      const event = logs.find(e => e.event === 'ChangeFees');
      event.should.exist;
      (event.args.transferFeeNumerator).should.be.bignumber.equal(1);
      (event.args.transferFeeDenominator).should.be.bignumber.equal(2);
    });
  });

  describe('checkTransferFee()', function(){
    const amount = bn.tokens(48);
    it ('should return exact fees', async function(){
      await token.changeFees(1, 2, { from: manager})
      let fee = await token.checkTransferFee(amount, { from: owner });
      assert.equal(fee, amount*1/2);
    });
  });

  describe('transfer()', function(){
    beforeEach(async function() {
      await registry.setAttribute(sender, 3, "set_att HAS_PASSED_KYC_AML : ON").should.be.fulfilled;
      await registry.setAttribute(receiver, 3, "set_att HAS_PASSED_KYC_AML : ON").should.be.fulfilled;
      await token.mint(sender, TEN_TOKENS, {from : owner}).should.be.fulfilled;
      await token.changeFees(1, 4, {from: manager1});
    });

    it('fees should be 0% if both sender and receiver have NO_FEE attribute', async function () {
      let before_sender = await token.balanceOf(sender);
      let before_recevier = await token.balanceOf(receiver);
      let system_wallet = await token.beneficiary();
      let before_wallet = await token.balanceOf(system_wallet);
      await registry.setAttribute(sender, 4, "NO_FEE").should.be.fulfilled;
      await registry.setAttribute(receiver, 4, "NO_FEE").should.be.fulfilled;
      await token.transfer(receiver, TEN_TOKENS, {from: sender});

      let after_sender = await token.balanceOf(sender);
      let after_receiver = await token.balanceOf(receiver);
      let after_wallet = await token.balanceOf(system_wallet);
      after_receiver.minus(before_recevier).should.be.bignumber.equal(TEN_TOKENS);
      before_sender.minus(after_sender).should.be.bignumber.equal(TEN_TOKENS);
      (await token.balanceOf(sender)).should.be.bignumber.equal(0);
      (await token.balanceOf(receiver)).should.be. bignumber.equal(TEN_TOKENS);
      after_wallet.minus(before_wallet).should.be.bignumber.equal(0);
    });

    it('fees should be 0% if sender has NO_FEE attribute', async function () {
      let before_sender = await token.balanceOf(sender);
      let before_recevier = await token.balanceOf(receiver);
      let system_wallet = await token.beneficiary();
      let before_wallet = await token.balanceOf(system_wallet);
      await registry.setAttribute(sender, 4, "NO_FEE").should.be.fulfilled;
      await token.transfer(receiver, TEN_TOKENS, {from: sender}).should.be.fulfilled;

      let after_sender = await token.balanceOf(sender);
      let after_receiver = await token.balanceOf(receiver);
      let after_wallet = await token.balanceOf(system_wallet);
      after_receiver.minus(before_recevier).should.be.bignumber.equal(TEN_TOKENS);
      before_sender.minus(after_sender).should.be.bignumber.equal(TEN_TOKENS);
      after_wallet.minus(before_wallet).should.be.bignumber.equal(0);
    });

    it('fees should be 0% if receiver has NO_FEE attribute', async function () {
      let before_sender = await token.balanceOf(sender);
      let before_recevier = await token.balanceOf(receiver);
      let system_wallet = await token.beneficiary();
      let before_wallet = await token.balanceOf(system_wallet);
      await registry.setAttribute(receiver, 4, "NO_FEE").should.be.fulfilled;
      await token.transfer(receiver, TEN_TOKENS, {from: sender}).should.be.fulfilled;

      let after_sender = await token.balanceOf(sender);
      let after_receiver = await token.balanceOf(receiver);
      let after_wallet = await token.balanceOf(system_wallet);
      after_receiver.minus(before_recevier).should.be.bignumber.equal(TEN_TOKENS);
      before_sender.minus(after_sender).should.be.bignumber.equal(TEN_TOKENS);
      after_wallet.minus(before_wallet).should.be.bignumber.equal(0);
    });

    it('fees should be transferred to system-wallet if both sender and receiver have no NO_FEE attribute', async function(){
      let before_sender = await token.balanceOf(sender);
      let before_recevier = await token.balanceOf(receiver);
      let system_wallet = await token.beneficiary();
      let before_wallet = await token.balanceOf(system_wallet);
      await token.changeFees(1, 8, { from: owner });
      await token.transfer(receiver, TEN_TOKENS, {from: sender}).should.be.fulfilled;

      let after_sender = await token.balanceOf(sender);
      let after_receiver = await token.balanceOf(receiver);
      let after_wallet = await token.balanceOf(system_wallet);
      before_sender.minus(after_sender).should.be.bignumber.equal(TEN_TOKENS);
      let fee = after_wallet.minus(before_wallet);
      fee.should.be.bignumber.equal(TEN_TOKENS*1/8);
      after_receiver.minus(before_recevier).should.be.bignumber.equal(TEN_TOKENS.minus(fee));
    });
  });

  describe('transferFrom()', function() {
    beforeEach(async function() {
      await registry.setAttribute(sender, 3, "set_att HAS_PASSED_KYC_AML : ON").should.be.fulfilled;
      await registry.setAttribute(receiver, 3, "set_att HAS_PASSED_KYC_AML : ON").should.be.fulfilled;
      await registry.setAttribute(owner, 3, "set_att HAS_PASSED_KYC_AML : ON").should.be.fulfilled;
      await token.mint(sender, TEN_TOKENS, {from : owner}).should.be.fulfilled;
    });

    it('fees should be 0% if both sender and receiver have NO_FEE attribute', async function () {
      let before_sender = await token.balanceOf(sender);
      let before_recevier = await token.balanceOf(receiver);
      let system_wallet = await token.beneficiary();
      let before_wallet = await token.balanceOf(system_wallet);
      await registry.setAttribute(sender, 4, "NO_FEE").should.be.fulfilled;
      await registry.setAttribute(receiver, 4, "NO_FEE").should.be.fulfilled;
      await token.approve(owner, TEN_TOKENS, {from: sender}).should.be.fulfilled;
      await token.transferFrom(sender, receiver,TEN_TOKENS, {from:owner});

      let after_sender = await token.balanceOf(sender);
      let after_receiver = await token.balanceOf(receiver);
      let after_wallet = await token.balanceOf(system_wallet);
      after_receiver.minus(before_recevier).should.be.bignumber.equal(TEN_TOKENS);
      before_sender.minus(after_sender).should.be.bignumber.equal(TEN_TOKENS);
      (await token.balanceOf(sender)).should.be.bignumber.equal(0);
      (await token.balanceOf(receiver)).should.be. bignumber.equal(TEN_TOKENS);
      after_wallet.minus(before_wallet).should.be.bignumber.equal(0);
    });

    it('fees should be 0% if sender has NO_FEE attribute', async function () {
      let before_sender = await token.balanceOf(sender);
      let before_recevier = await token.balanceOf(receiver);
      let system_wallet = await token.beneficiary();
      let before_wallet = await token.balanceOf(system_wallet);
      await registry.setAttribute(sender, 4, "NO_FEE").should.be.fulfilled;
      await token.approve(owner, TEN_TOKENS, {from: sender}).should.be.fulfilled;
      await token.transferFrom(sender, receiver,TEN_TOKENS, {from:owner});

      let after_sender = await token.balanceOf(sender);
      let after_receiver = await token.balanceOf(receiver);
      let after_wallet = await token.balanceOf(system_wallet);
      after_receiver.minus(before_recevier).should.be.bignumber.equal(TEN_TOKENS);
      before_sender.minus(after_sender).should.be.bignumber.equal(TEN_TOKENS);
      after_wallet.minus(before_wallet).should.be.bignumber.equal(0);
    });

    it('fees should be 0% if receiver has NO_FEE attribute', async function () {
      let before_sender = await token.balanceOf(sender);
      let before_recevier = await token.balanceOf(receiver);
      let system_wallet = await token.beneficiary();
      let before_wallet = await token.balanceOf(system_wallet);
      await registry.setAttribute(receiver, 4, "NO_FEE").should.be.fulfilled;
      await token.approve(owner, TEN_TOKENS, {from: sender}).should.be.fulfilled;
      await token.transferFrom(sender, receiver,TEN_TOKENS, {from:owner});

      let after_sender = await token.balanceOf(sender);
      let after_receiver = await token.balanceOf(receiver);
      let after_wallet = await token.balanceOf(system_wallet);
      after_receiver.minus(before_recevier).should.be.bignumber.equal(TEN_TOKENS);
      before_sender.minus(after_sender).should.be.bignumber.equal(TEN_TOKENS);
      after_wallet.minus(before_wallet).should.be.bignumber.equal(0);
    });

    it('fees should be transferred to system-wallet if both sender and receiver have no NO_FEE attribute', async function(){
      let before_sender = await token.balanceOf(sender);
      let before_recevier = await token.balanceOf(receiver);
      let system_wallet = await token.beneficiary();
      let before_wallet = await token.balanceOf(system_wallet);
      await token.changeFees(1, 4, { from: owner });
      await token.approve(owner, TEN_TOKENS, {from: sender}).should.be.fulfilled;
      await token.transferFrom(sender, receiver,TEN_TOKENS, {from:owner});

      let after_sender = await token.balanceOf(sender);
      let after_receiver = await token.balanceOf(receiver);
      let after_wallet = await token.balanceOf(system_wallet);
      before_sender.minus(after_sender).should.be.bignumber.equal(TEN_TOKENS);
      let fee = after_wallet.minus(before_wallet);
      fee.should.be.bignumber.equal(TEN_TOKENS*1/4);
      after_receiver.minus(before_recevier).should.be.bignumber.equal(TEN_TOKENS.minus(fee));
    });
  });
};

module.exports.check = check;
