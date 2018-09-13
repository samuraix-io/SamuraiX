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
    it("Should allow if manager changes Wallet to valid wallet", async function(){
      await token.changeWallet(wallet, {from: manager});
      let system_wallet = await token.beneficiary();
      assert.equal(system_wallet, wallet);
    });

    it("should be rejected if caller is not manager", async function(){
      let account7 = accounts[7];
      await token.changeWallet(wallet, {from: account7}).should.be.rejected;
    });

    it("Multiple manager should changes fees", async function(){ // 2 user hava role as manager can change wallet add
      await token.changeWallet(wallet, {from: manager});
      let system_wallet = await token.beneficiary();
      assert.equal(system_wallet, wallet);
      await token.changeWallet(wallet, {from: manager1});
      let system_wallets = await token.beneficiary();
      assert.equal(system_wallets, wallet);
    })

    it("should be rejected when changes to invalid wallet", async function(){
      await token.changeWallet(0x0, {from: manager}).should.be.rejected;
    });

    it("Catch event log", async function() {
      let olderWallet = await token.beneficiary();
      const { logs } = await token.changeWallet(wallet, {from: manager});
      const event = expectEvent.inLogs(logs, 'ChangeWallet')
      assert.notEqual(wallet, olderWallet);
    });
  });

  describe('changeFees', function () {
    it('should allow if manager changes fee', async function () {
      await token.changeFees(1,2, {from: manager1})
      const transferFeeNumerator = await token.transferFeeNumerator()
      assert.equal(transferFeeNumerator, 1)
      const transferFeeDenominator = await token.transferFeeDenominator()
      assert.equal(transferFeeDenominator, 2)
    });

    it('should be rejected when manager set fees equal to 100%', async function () {
      await token.changeFees(1, 1, {from: manager}).should.be.rejected;
    });

    it('should be rejected when manager set fees greater than 100%', async function () {
      await token.changeFees(2, 1, {from: manager}).should.be.rejected;
    });

    it('should be rejected when caller is not manager', async function () {
      await token.changeFees(1, 2,  { from: accounts[7] }).should.be.rejected; // acount 7 dont have  attribute as
    });

    it('emits an event', async function () {
      const { logs } = await token.changeFees(1, 2, {from: manager1})
      assert.equal(logs.length, 1)
      assert.equal(logs[0].event, 'ChangeFees')
    });
  });

  describe('checkTransferFee()', function(){
    const amount = bn.tokens(48);
    it ('should check transfer fees', async function(){
      await token.changeFees(1,2, { from: owner})
      let contractTransferFee = await token.checkTransferFee(amount, { from: owner });
      assert.equal(contractTransferFee, amount*1/2);
    });
  });

  describe('transfer()', function(){
    beforeEach(async function() {
      await registry.setAttribute(sender, 3, "set_att HAS_PASSED_KYC_AML : ON").should.be.fulfilled;
      await registry.setAttribute(receiver, 3, "set_att HAS_PASSED_KYC_AML : ON").should.be.fulfilled;
      await token.approve(sender, TEN_TOKENS, {from: receiver}).should.be.fulfilled;
      let val = await token.allowance(sender, receiver);
      (await registry.hasAttribute(sender, 3)).should.equal(true);
      await token.mint(sender, TEN_TOKENS, {from : owner}).should.be.fulfilled;
      await token.changeFees(1, 4, {from: manager1});
    });

    it('should allow if sender and receiver have NO_FEE attribute', async function () {
      let before_sender = await token.balanceOf(sender);
      let before_recevier = await token.balanceOf(receiver);
      let system_wallet = await token.beneficiary();
      await registry.setAttribute(sender, 4, "NO_FEE").should.be.fulfilled;
      await registry.setAttribute(receiver, 4, "NO_FEE").should.be.fulfilled;
      await token.transfer(receiver,TEN_TOKENS , {from: sender});
      let after_sender = await token.balanceOf(sender);
      let after_receiver = await token.balanceOf(receiver);
      after_receiver.minus(before_recevier).should.be.bignumber.equal(TEN_TOKENS);
      before_sender.minus(after_sender).should.be.bignumber.equal(TEN_TOKENS);
      (await token.balanceOf(sender)).should.be.bignumber.equal(0);
      (await token.balanceOf(receiver)).should.be. bignumber.equal(TEN_TOKENS);
      (await token.balanceOf(system_wallet)).should.be.bignumber.equal(0);
    });
    it('should allow if sender and receiver have not NO_FEE attribute', async function(){
      let before_sender = await token.balanceOf(sender);
      let before_recevier = await token.balanceOf(receiver);
      let system_wallet = await token.beneficiary();
      await token.changeFees(1, 8, { from: owner });
      await token.transfer(receiver,TEN_TOKENS , {from: sender}).should.be.fulfilled;
      let after_sender = await token.balanceOf(sender);
      let after_receiver = await token.balanceOf(receiver);
      after_receiver.minus(before_recevier).should.be.bignumber.equal(TEN_TOKENS*7/8);
      before_sender.minus(after_sender).should.be.bignumber.equal(TEN_TOKENS);
      (await token.balanceOf(system_wallet)).should.be.bignumber.equal(TEN_TOKENS*1/8);
    });
    it('should allow if sender has attribute NO FEE to normal accounts', async function(){
      let before_sender = await token.balanceOf(sender);
      let before_recevier = await token.balanceOf(receiver);
      let system_wallet = await token.beneficiary();
      await token.changeFees(1, 8, { from: owner }).should.be.fulfilled;
      await registry.setAttribute(sender, 4, "NO_FEE").should.be.fulfilled;
      await token.transfer(receiver,TEN_TOKENS , {from: sender}).should.be.fulfilled;
      let after_sender = await token.balanceOf(sender);
      let after_receiver = await token.balanceOf(receiver);
      after_receiver.minus(before_recevier).should.be.bignumber.equal(TEN_TOKENS);
      before_sender.minus(after_sender).should.be.bignumber.equal(TEN_TOKENS);
      (await token.balanceOf(sender)).should.be.bignumber.equal(0);
      (await token.balanceOf(receiver)).should.be.bignumber.equal(TEN_TOKENS);
      (await token.balanceOf(system_wallet)).should.be.bignumber.equal(0);
    });
    it('should allow if sender has not attribute NO FEE to receiver that has attribute NO FEE account', async function(){
      let before_sender = await token.balanceOf(sender);
      let before_recevier = await token.balanceOf(receiver);
      let system_wallet = await token.beneficiary();
      await token.changeFees(1, 8, { from: owner });
      await registry.setAttribute(receiver, 4, "NO_FEE").should.be.fulfilled;
      await token.transfer(receiver,TEN_TOKENS , {from: sender});
      let after_sender = await token.balanceOf(sender);
      let after_receiver = await token.balanceOf(receiver);
      after_receiver.minus(before_recevier).should.be.bignumber.equal(TEN_TOKENS);
      before_sender.minus(after_sender).should.be.bignumber.equal(TEN_TOKENS);
      (await token.balanceOf(sender)).should.be.bignumber.equal(0);
      (await token.balanceOf(receiver)).should.be. bignumber.equal(TEN_TOKENS);
      (await token.balanceOf(system_wallet)).should.be.bignumber.equal(0);
    });
    it('should be reject when sender transfer MAX_UINT', async function(){
      let system_wallet = await token.beneficiary();
      await token.mint(sender, bn.MAX_UINT, {from : owner}).should.be.rejected;
      await token.transfer(receiver,bn.MAX_UINT , {from: sender}).should.be.rejected;
    });
    it('should be allows when sender transfer OVER_UINT', async function(){
      let system_wallet = await token.beneficiary();
      await token.mint(sender, bn.OVER_UINT, {from : owner}).should.be.fulfilled;
      await token.transfer(receiver,bn.OVER_UINT , {from: sender}).should.be.fulfilled;
      (await token.balanceOf(receiver)).should.be. bignumber.equal(0);
      (await token.balanceOf(system_wallet)).should.be.bignumber.equal(0);
    });
  });

  describe('transferFrom()', function() {
    beforeEach(async function() {
      await registry.setAttribute(sender, 3, "set_att HAS_PASSED_KYC_AML : ON").should.be.fulfilled;
      await registry.setAttribute(receiver, 3, "set_att HAS_PASSED_KYC_AML : ON").should.be.fulfilled;
      await registry.setAttribute(owner, 3, "set_att HAS_PASSED_KYC_AML : ON").should.be.fulfilled;
      await token.approve(sender, TEN_TOKENS, {from: receiver}).should.be.fulfilled;
      let val = await token.allowance(sender, receiver);
      (await registry.hasAttribute(sender, 3)).should.equal(true);
      await token.mint(sender, TEN_TOKENS, {from : owner}).should.be.fulfilled;
    });

    it('should allow if sender and receiver have NO_FEE attribute', async function(){
      let before_sender = await token.balanceOf(sender);
      let before_recevier = await token.balanceOf(receiver);
      let system_wallet = await token.beneficiary();
      await registry.setAttribute(owner, 4, "NO_FEE").should.be.fulfilled;
      await registry.setAttribute(receiver, 4, "NO_FEE").should.be.fulfilled;
      await registry.setAttribute(sender, 3, "set_att HAS_PASSED_KYC_AML : ON").should.be.fulfilled;
      await registry.setAttribute(receiver, 3, "set_att HAS_PASSED_KYC_AML : ON").should.be.fulfilled;
      await token.approve(owner, TEN_TOKENS, {from: sender}).should.be.fulfilled;
      await token.transferFrom(sender, receiver ,TEN_TOKENS , {from:owner});
      let after_sender = await token.balanceOf(sender);
      let after_receiver = await token.balanceOf(receiver);
      after_receiver.minus(before_recevier).should.be.bignumber.equal(TEN_TOKENS);
      before_sender.minus(after_sender).should.be.bignumber.equal(TEN_TOKENS);
      (await token.balanceOf(system_wallet)).should.be.bignumber.equal(0);
    });

    it('should allow if sender has not attribute NO FEE to receiver that has attribute NO FEE account', async function(){
      let before_sender = await token.balanceOf(sender);
      let before_recevier = await token.balanceOf(receiver);
      let system_wallet = await token.beneficiary();
      await registry.setAttribute(owner, 4, "NO_FEE").should.be.fulfilled;
      await registry.setAttribute(sender, 3, "set_att HAS_PASSED_KYC_AML : ON").should.be.fulfilled;
      await registry.setAttribute(receiver, 3, "set_att HAS_PASSED_KYC_AML : ON").should.be.fulfilled;
      await token.approve(owner, TEN_TOKENS, {from: sender}).should.be.fulfilled;
      await token.transferFrom(sender, receiver ,TEN_TOKENS , {from:owner});
      let before = await token.balanceOf(sender);
      let after_sender = await token.balanceOf(sender);
      let after_receiver = await token.balanceOf(receiver);
      after_receiver.minus(before_recevier).should.be.bignumber.equal(TEN_TOKENS);
      before_sender.minus(after_sender).should.be.bignumber.equal(TEN_TOKENS);
      (await token.balanceOf(system_wallet)).should.be.bignumber.equal(0);
    });

    it('should allow if sender and receiver have not NO_FEE attribute', async function(){
      let before_sender = await token.balanceOf(sender);
      let before_recevier = await token.balanceOf(receiver);
      let system_wallet = await token.beneficiary();
      await token.changeFees(1, 8, { from: owner });
      await registry.setAttribute(sender, 3, "set_att HAS_PASSED_KYC_AML : ON").should.be.fulfilled;
      await registry.setAttribute(receiver, 3, "set_att HAS_PASSED_KYC_AML : ON").should.be.fulfilled;
      await token.approve(owner, TEN_TOKENS, {from: sender}).should.be.fulfilled;
      await token.transferFrom(sender, receiver ,TEN_TOKENS , {from:owner});
      let before = await token.balanceOf(sender);
      let after_sender = await token.balanceOf(sender);
      let after_receiver = await token.balanceOf(receiver);
      after_receiver.minus(before_recevier).should.be.bignumber.equal(TEN_TOKENS*7/8);
      before_sender.minus(after_sender).should.be.bignumber.equal(TEN_TOKENS);
      (await token.balanceOf(system_wallet)).should.be.bignumber.equal(TEN_TOKENS*1/8);
    });

    it('transfer form with OVER_UINT ',async function(){
      let system_wallet = await token.beneficiary();
      await token.changeFees(1, 2, { from: owner })
      await registry.setAttribute(sender, 4, "NO_FEE").should.be.fulfilled;
      await registry.setAttribute(receiver, 4, "NO_FEE").should.be.fulfilled;
      await token.mint(sender, bn.OVER_UINT, {from : sender}).should.be.fulfilled;
      await token.approve(owner,  bn.OVER_UINT, {from: sender}).should.be.fulfilled;
      await token.transferFrom(sender, receiver , bn.OVER_UINT , {from:owner}).should.be.fulfilled;
    });

    it('should reject when sender transfer MAX_UINT', async function(){
      await token.changeFees(1,2, {from: manager1});
      await registry.setAttribute(sender, 4, "NO_FEE").should.be.fulfilled;
      await registry.setAttribute(receiver, 4, "NO_FEE").should.be.fulfilled;
      await token.mint(sender, bn.MAX_UINT, {from : owner}).should.be.rejected;
      await token.approve(owner,  bn.MAX_UINT, {from: sender}).should.be.fulfilled;
      await token.transferFrom(sender, receiver , bn.MAX_UINT , {from:owner}).should.be.rejected;
    });
  });
};


module.exports.check = check;
