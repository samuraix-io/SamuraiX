const BigNumber = web3.BigNumber;
const DelegateToken = artifacts.require('./delegate/DelegateToken.sol');
const BalanceSheet = artifacts.require("./BalanceSheet.sol");
const Registry = artifacts.require('./Registry.sol');
const PATTokenMock = artifacts.require("./PATTokenMock.sol");

const Should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();
const bn = require('../helpers/bignumber.js');
const regAtt = require('../helpers/registryAttributeConst.js');

function check(accounts, deployTokenCb) {
  var newToken;
  var oldToken;
  var registry;
  var balanceSheet;

  var owner = accounts[0];
  var otherUser = accounts[2];
  var purchaser = accounts[3];
  var investor = accounts[4];

  var balanceOldToken = bn.tokens(90);
  var balanceNewToken = bn.tokens(100);

  var systemWallet = accounts[7]
  var tokenName = "PATTokenMock";
  var tokenSymbol = "PATMock";
  var linkDoc = 'https://drive.google.com/open?id=1ZaFg2XtGdTwnkvaj-Kra4cRW_ia6tvBY';
  var fixedLinkDoc = 'https://drive.google.com/open?id=1JYpdAqubjvHvUuurwX7om0dDcA5ycRhc';

  beforeEach(async function () {
    oldToken = await deployTokenCb();

    balanceSheet = await BalanceSheet.new({from:owner });
    registry = await Registry.new({from:owner });

    await balanceSheet.transferOwnership(oldToken.address).should.be.fulfilled;
    await registry.setAttribute(purchaser, regAtt.HAS_PASSED_KYC_AML, "Set HAS_PASSED_KYC_AML ON").should.be.fulfilled;
    await registry.setAttribute(investor, regAtt.HAS_PASSED_KYC_AML, "Set HAS_PASSED_KYC_AML ON").should.be.fulfilled;

    await oldToken.setBalanceSheet(balanceSheet.address).should.be.fulfilled;
    await oldToken.setRegistry(registry.address, {from : owner}).should.be.fulfilled;

//    await token.mint(purchaser, balanceToken).should.be.fulfilled;
//    await otherToken.mint(purchaser, balanceOtherToken).should.be.fulfilled;

  });

  describe('delegateToNewContract()', function() {
    beforeEach(async function () {
      let _newTotalSupply = await oldToken.totalSupply();
      newToken = await PATTokenMock.new(tokenName, tokenSymbol, fixedLinkDoc, linkDoc, systemWallet, _newTotalSupply);
    });

    it ('Should allow owner to delegate', async function() {
      await oldToken.delegateToNewContract(newToken.address, {from:owner}).should.be.fulfilled;
      let _delegatingContract = await oldToken.delegate();
      assert.equal(newToken.address, _delegatingContract);
    });

    it ('Should allow owner to undelegate by delegating to null address', async function() {
      let _nullAdds = '0x0000000000000000000000000000000000000000';
      await oldToken.delegateToNewContract(_nullAdds, {from:owner}).should.be.fulfilled;
    });

    it ('Should reject non-owner to delegate', async function() {
      await oldToken.delegateToNewContract(newToken.address, {from:otherUser}).should.be.rejected;
    });

    it ('Should log event', async function() {
      const {logs} = await oldToken.delegateToNewContract(newToken.address, {from:owner}).should.be.fulfilled;
      const delegateEvent = logs.find(e => e.event === 'DelegateToNewContract');
      delegateEvent.should.exist;
      (delegateEvent.args.newContract).should.equal(newToken.address);
    });
  });

  describe('When not delegated', function() {
    it('totalSupply() should return oldToken \'s totalSupply_', async function() {
      await oldToken.mint(purchaser, balanceOldToken).should.be.fulfilled;
      let _totalSupply = await oldToken.totalSupply().should.be.fulfilled;
      _totalSupply.should.be.bignumber.equal(balanceOldToken);
    });

    it('balanceOf() should return balance of oldToken \'s user', async function() {
      await oldToken.mint(purchaser, balanceOldToken).should.be.fulfilled;
      let _purchaserBalance = await oldToken.balanceOf(purchaser).should.be.fulfilled;
      _purchaserBalance.should.be.bignumber.equal(balanceOldToken);
    });

    it('approve() should update allowance of oldToken', async function() {
      let _amount = bn.tokens(100);
      await oldToken.approve(purchaser, _amount, {from: investor}).should.be.fulfilled;
      let _allowanceToken = await oldToken.allowance(investor, purchaser, {from: purchaser}).should.be.fulfilled;
      _allowanceToken.should.be.bignumber.equal(_amount);
    });

    it('increaseApproval() should update allowance of oldToken', async function() {
      let _amount = bn.tokens(100);
      await oldToken.approve(purchaser, _amount, {from: investor}).should.be.fulfilled;
      await oldToken.increaseApproval(purchaser, _amount, {from: investor}).should.be.fulfilled;
      let _allowance = await oldToken.allowance(investor, purchaser, {from: purchaser}).should.be.fulfilled;
      _allowance.should.be.bignumber.equal(_amount.times(2));
    });

    it('decreaseApproval() should update allowance of oldToken', async function() {
      let _amount = bn.tokens(100);
      let _subtractedValue = bn.tokens(1);
      await oldToken.approve(purchaser, _amount.plus(_subtractedValue), {from: investor}).should.be.fulfilled;
      await oldToken.decreaseApproval(purchaser, _subtractedValue, {from: investor}).should.be.fulfilled;
      let _allowance = await oldToken.allowance(investor, purchaser, {from: purchaser}).should.be.fulfilled;
      _allowance.should.be.bignumber.equal(_amount);
    });

    it('transfer() should update balance of oldToken \'s user', async function() {
      await oldToken.mint(purchaser, balanceOldToken).should.be.fulfilled;

      let _balance1OldTokenBefore = await oldToken.balanceOf(investor);
      let _balance2OldTokenBefore = await oldToken.balanceOf(purchaser);

      let _amount = bn.tokens(5);
      await oldToken.transfer(investor, _amount, {from: purchaser}).should.be.fulfilled;

      let _balance1OldTokenAfter = await oldToken.balanceOf(investor);
      let _balance2OldTokenAfter = await oldToken.balanceOf(purchaser);

      _balance1OldTokenAfter.should.be.bignumber.equal(_balance1OldTokenBefore.plus(_amount));
      _balance2OldTokenAfter.should.be.bignumber.equal(_balance2OldTokenBefore.minus(_amount));
    });

    it('transferFrom() should update balance of oldToken \'s user', async function() {
      await oldToken.mint(purchaser, balanceOldToken).should.be.fulfilled;
      let _balance1OldTokenBefore = await oldToken.balanceOf(investor);
      let _balance2OldTokenBefore = await oldToken.balanceOf(purchaser);

      let _amount = bn.tokens(5);
      await oldToken.approve(investor, _amount, {from: purchaser}).should.be.fulfilled;
      await oldToken.transferFrom(purchaser, investor, _amount, {from: investor}).should.be.fulfilled;

      let _balance1OldTokenAfter = await oldToken.balanceOf(investor);
      let _balance2OldTokenAfter = await oldToken.balanceOf(purchaser);

      _balance1OldTokenAfter.should.be.bignumber.equal(_balance1OldTokenBefore.plus(_amount));
      _balance2OldTokenAfter.should.be.bignumber.equal(_balance2OldTokenBefore.minus(_amount));
    });

    it('allowance() should return allowance of oldToken', async function() {
      let _amount = bn.tokens(100);
      await oldToken.approve(purchaser, _amount, {from: investor}).should.be.fulfilled;
      let _allowanceOldToken = await oldToken.allowance(investor, purchaser, {from: purchaser}).should.be.fulfilled;
      _allowanceOldToken.should.be.bignumber.equal(_amount);
    });

    it('burn() should burn token of oldToken \'s user', async function() {
      await oldToken.mint(purchaser, balanceOldToken).should.be.fulfilled;
      let _purchaserBalanceTokenBefore = await oldToken.balanceOf(purchaser);
      let _burningAmount = _purchaserBalanceTokenBefore - bn.tokens(1);
      await oldToken.burn(_burningAmount, 'not delegate', {from : purchaser}).should.be.fulfilled;
      let _purchaserBalanceTokenAfter = await oldToken.balanceOf(purchaser);
      _purchaserBalanceTokenBefore.minus(_burningAmount).should.be.bignumber.equal(_purchaserBalanceTokenAfter);
    });
  });

  describe('When delegated', function() {
    beforeEach(async function () {
      await oldToken.mint(purchaser, balanceOldToken).should.be.fulfilled;
      let _newTotalSupply = await oldToken.totalSupply();
      newToken = await PATTokenMock.new(tokenName, tokenSymbol, fixedLinkDoc, linkDoc, systemWallet, _newTotalSupply);

      await oldToken.reclaimContract(balanceSheet.address, {from : owner});
      await balanceSheet.claimOwnership({from : owner}).should.be.fulfilled;
      await balanceSheet.transferOwnership(newToken.address, {from : owner}).should.be.fulfilled;
      await newToken.setBalanceSheet(balanceSheet.address).should.be.fulfilled;
      await newToken.setRegistry(registry.address, {from : owner}).should.be.fulfilled;
//      await newToken.mint(purchaser, balanceNewToken).should.be.fulfilled;
      await oldToken.delegateToNewContract(newToken.address, {from:owner}).should.be.fulfilled;
      await newToken.setDelegatedFrom(oldToken.address, {from:owner}).should.be.fulfilled;

    });

    it('totalSupply() should return newToken \'s totalSupply_', async function() {
      await newToken.mint(purchaser, balanceNewToken).should.be.fulfilled;
      let _totalSupply1 = await newToken.totalSupply().should.be.fulfilled;

      let _totalSupply2 = await oldToken.totalSupply().should.be.fulfilled;
      _totalSupply2.should.be.bignumber.equal(_totalSupply1);
    });

    it('balanceOf() should return balance of newToken \'s user', async function() {
      await newToken.mint(purchaser, balanceNewToken).should.be.fulfilled;

      let _purchaserBalance = await oldToken.balanceOf(purchaser).should.be.fulfilled;
      _purchaserBalance.should.be.bignumber.equal(balanceNewToken.plus(balanceOldToken));
    });

    it('approval() should update allowance of newToken', async function() {
      let _amount = bn.tokens(100);
      await oldToken.approve(purchaser, _amount, {from: investor}).should.be.fulfilled;
      let _allowanceNewToken = await newToken.allowance(investor, purchaser, {from: purchaser}).should.be.fulfilled;
      _allowanceNewToken.should.be.bignumber.equal(_amount);
    });

    it('increaseApproval() should update allowance of newToken', async function() {
      let _amount = bn.tokens(100);
      await newToken.approve(purchaser, _amount, {from: investor}).should.be.fulfilled;
      await oldToken.increaseApproval(purchaser, _amount, {from: investor}).should.be.fulfilled;
      let _allowanceNewToken = await newToken.allowance(investor, purchaser, {from: purchaser}).should.be.fulfilled;
      _allowanceNewToken.should.be.bignumber.equal(_amount.times(2));
    });

    it('decreaseApproval() should update allowance of newToken', async function() {
      let _amount = bn.tokens(100);
      let _subtractedValue = bn.tokens(1);
      await newToken.approve(purchaser, _amount.plus(_subtractedValue), {from: investor}).should.be.fulfilled;
      await oldToken.decreaseApproval(purchaser, _subtractedValue, {from: investor}).should.be.fulfilled;
      let _allowance = await newToken.allowance(investor, purchaser, {from: purchaser}).should.be.fulfilled;
      _allowance.should.be.bignumber.equal(_amount);
    });

    it('transfer() should update balance of newToken \'s user', async function() {
      await newToken.mint(purchaser, balanceNewToken).should.be.fulfilled;

      let _balance1NewTokenBefore = await newToken.balanceOf(investor);
      let _balance2NewTokenBefore = await newToken.balanceOf(purchaser);

      let _amount = bn.tokens(5);
      await oldToken.transfer(investor, _amount, {from: purchaser}).should.be.fulfilled;

      let _balance1NewTokenAfter = await newToken.balanceOf(investor);
      let _balance2NewTokenAfter = await newToken.balanceOf(purchaser);

      _balance1NewTokenAfter.should.be.bignumber.equal(_balance1NewTokenBefore.plus(_amount));
      _balance2NewTokenAfter.should.be.bignumber.equal(_balance2NewTokenBefore.minus(_amount));
    });

    it('transferFrom() should update balance of newToken \'s user', async function() {
      await newToken.mint(purchaser, balanceNewToken).should.be.fulfilled;
      let _balance1NewTokenBefore = await oldToken.balanceOf(investor);
      let _balance2NewTokenBefore = await oldToken.balanceOf(purchaser);

      let _amount = bn.tokens(5);
      await newToken.approve(investor, _amount, {from: purchaser}).should.be.fulfilled;
      await oldToken.transferFrom(purchaser, investor, _amount, {from: investor}).should.be.fulfilled;

      let _balance1NewTokenAfter = await newToken.balanceOf(investor);
      let _balance2NewTokenAfter = await newToken.balanceOf(purchaser);

      _balance1NewTokenAfter.should.be.bignumber.equal(_balance1NewTokenBefore.plus(_amount));
      _balance2NewTokenAfter.should.be.bignumber.equal(_balance2NewTokenBefore.minus(_amount));
    });

    it('allowance() should return allowance of newToken', async function() {
      let _amount = bn.tokens(100);
      await newToken.approve(purchaser, _amount, {from: investor}).should.be.fulfilled;
      let _allowanceNewToken = await oldToken.allowance(investor, purchaser, {from: purchaser}).should.be.fulfilled;
      _allowanceNewToken.should.be.bignumber.equal(_amount);
    });

    it('burn() should burn token of newToken \'s user', async function() {
      await newToken.mint(purchaser, balanceNewToken).should.be.fulfilled;
      let _purchaserBalanceTokenBefore = await newToken.balanceOf(purchaser);
      let _burningAmount = _purchaserBalanceTokenBefore - bn.tokens(1);
      await oldToken.burn(_burningAmount, 'delegated', {from : purchaser}).should.be.fulfilled;
      let _purchaserBalanceTokenAfter = await newToken.balanceOf(purchaser);
      _purchaserBalanceTokenBefore.minus(_burningAmount).should.be.bignumber.equal(_purchaserBalanceTokenAfter);
    });
  });
}
module.exports.check = check;
