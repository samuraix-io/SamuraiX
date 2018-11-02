const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const BalanceSheet = artifacts.require("./BalanceSheet.sol");
const bn = require('../helpers/bignumber.js');

contract('BalanceSheet', function (accounts) {
  var balanceSheetContract;
  const owner = accounts[0];
  const user = accounts[1];
  const otherUser = accounts[2];
  const secondUser = accounts[3];
  const thirdUser = accounts[4];
  const fourthUser = accounts[5];

  before(async function () {
    balanceSheetContract = await BalanceSheet.deployed();
  });

  describe('balanceOf()', function() {
    it('Should allow any user to check their balance', async function() {
        let _currentBalance = await balanceSheetContract.balanceOf(user, {from : otherUser}).should.be.fulfilled;
        _currentBalance.should.be.bignumber.equal(0);
    });
  })

  describe('setBalance()', function() {
    it('Should allow owner to to set new balance for user', async function() {
      let _newBalance = bn.tokens(10);
      let _oldUserBalance = await balanceSheetContract.balanceOf(user).should.be.fulfilled;
      _oldUserBalance.should.be.bignumber.lessThan(_newBalance);

      await balanceSheetContract.setBalance(user, _newBalance, {from : owner}).should.be.fulfilled;
      let _currentUserBalance = await balanceSheetContract.balanceOf(user).should.be.fulfilled;
      _currentUserBalance.should.be.bignumber.equal(_newBalance);
    });

    it('Should reject non-owner to set new balance for user', async function() {
      let _newBalance = bn.tokens(10);
      await balanceSheetContract.setBalance(user, _newBalance, {from : otherUser}).should.be.rejected;
    });

    it('Should reject if newbalence is max uint', async function() {
      let _newBalance = bn.MAX_UINT;
      await balanceSheetContract.setBalance(user, _newBalance, {from : otherUser}).should.be.rejected;
    });

    it('Should reject if newbalence is over max uint', async function() {
      let _newBalance = bn.OVER_UINT;
      await balanceSheetContract.setBalance(user, _newBalance, {from : otherUser}).should.be.rejected;
    });
  })

  describe('addBalance()', function() {
    it('Should allow owner to add balance for user', async function() {
      let _oldUserBalance = await balanceSheetContract.balanceOf(user).should.be.fulfilled;
      let _addingBalance = bn.tokens(8);

      await balanceSheetContract.addBalance(user, _addingBalance, {from : owner}).should.be.fulfilled;
      let _currentUserBalance = await balanceSheetContract.balanceOf(user).should.be.fulfilled;
      let _total = parseInt(_oldUserBalance) + parseInt(_addingBalance);
      _currentUserBalance.should.be.bignumber.equal(_total);
    });

    it('Should reject non-owner to add balance for user', async function() {
      let _addingBalance = bn.tokens(8);
      await balanceSheetContract.addBalance(user, _addingBalance, {from : otherUser}).should.be.rejected;
    });

    it('Should reject if adding balance is max uint', async function() {
      let _addingBalance = bn.MAX_UINT;
      await balanceSheetContract.addBalance(user, _addingBalance, {from : otherUser}).should.be.rejected;
    });

    it('Should reject if adding balance is over max uint', async function() {
      let _addingBalance = bn.OVER_UINT;
      await balanceSheetContract.addBalance(user, _addingBalance, {from : otherUser}).should.be.rejected;
    });
  });

  describe('subBalance()', function() {
    it('Should allow owner to reduce balance for user', async function() {
      let _oldUserBalance = await balanceSheetContract.balanceOf(user).should.be.fulfilled;
      let _reduceBalance = bn.tokens(8);

      await balanceSheetContract.subBalance(user, _reduceBalance, {from : owner}).should.be.fulfilled;
      let _currentUserBalance = await balanceSheetContract.balanceOf(user).should.be.fulfilled;
      let _total = parseInt(_oldUserBalance) - parseInt(_reduceBalance);
      _currentUserBalance.should.be.bignumber.equal(_total);
    });

    it('Should reject non-owner to reduce balance for user', async function() {
      let _reduceBalance = bn.tokens(8);
      await balanceSheetContract.subBalance(user, _reduceBalance, {from : otherUser}).should.be.rejected;;
    });

    it('Should reject if reduceBalance greater than current balance', async function() {
      let _reduceBalance =  parseInt(await balanceSheetContract.balanceOf(user)) + parseInt(bn.tokens(8));
      await balanceSheetContract.subBalance(user, _reduceBalance, {from : user}).should.be.rejected;;
    });

  });

  describe('setBalanceBatch()', function() {
    it('Should allow owner to set balance for multiple users', async function() {
      let _firstUserBalanceBefore = await balanceSheetContract.balanceOf(user).should.be.fulfilled;
      let _secondUserBalanceBefore = await balanceSheetContract.balanceOf(secondUser).should.be.fulfilled;
      let _thirdUserBalanceBefore = await balanceSheetContract.balanceOf(thirdUser).should.be.fulfilled;
      let _fourthUserBalanceBefore = await balanceSheetContract.balanceOf(fourthUser).should.be.fulfilled

      let _listAdds = [user, secondUser, thirdUser, fourthUser];
      let _listVals = [bn.tokens(1), bn.tokens(2), bn.tokens(3), bn.tokens(4)];

      await balanceSheetContract.setBalanceBatch(_listAdds, _listVals, {from : owner}).should.be.fulfilled;
    });

    it('Should reject non-owner to reduce balance for user', async function() {
      let _firstUserBalanceBefore = await balanceSheetContract.balanceOf(user).should.be.fulfilled;
      let _secondUserBalanceBefore = await balanceSheetContract.balanceOf(secondUser).should.be.fulfilled;
      let _thirdUserBalanceBefore = await balanceSheetContract.balanceOf(thirdUser).should.be.fulfilled;
      let _fourthUserBalanceBefore = await balanceSheetContract.balanceOf(fourthUser).should.be.fulfilled

      let _listAdds = [user, secondUser, thirdUser, fourthUser];
      let _listVals = [bn.tokens(1), bn.tokens(2), bn.tokens(3), bn.tokens(4)];

      await balanceSheetContract.setBalanceBatch(_listAdds, _listVals, {from : otherUser}).should.be.rejected;
    });

    it('Should increase balace of list user', async function() {
      let _firstUserBalanceBefore = await balanceSheetContract.balanceOf(user).should.be.fulfilled;
      let _secondUserBalanceBefore = await balanceSheetContract.balanceOf(secondUser).should.be.fulfilled;
      let _thirdUserBalanceBefore = await balanceSheetContract.balanceOf(thirdUser).should.be.fulfilled;
      let _fourthUserBalanceBefore = await balanceSheetContract.balanceOf(fourthUser).should.be.fulfilled

      let _listAdds = [user, secondUser, thirdUser, fourthUser];
      let _listVals = [_firstUserBalanceBefore.plus(bn.tokens(1)),
                      _secondUserBalanceBefore.plus(bn.tokens(2)),
                      _thirdUserBalanceBefore.plus(bn.tokens(3)),
                      _fourthUserBalanceBefore.plus(bn.tokens(4))];

      await balanceSheetContract.setBalanceBatch(_listAdds, _listVals, {from : owner}).should.be.fulfilled;

      let _firstUserBalanceAfter = await balanceSheetContract.balanceOf(user).should.be.fulfilled;
      let _secondUserBalanceAfter = await balanceSheetContract.balanceOf(secondUser).should.be.fulfilled;
      let _thirdUserBalanceAfter = await balanceSheetContract.balanceOf(thirdUser).should.be.fulfilled;
      let _fourthUserBalanceAfter = await balanceSheetContract.balanceOf(fourthUser).should.be.fulfilled

      _firstUserBalanceAfter.should.be.bignumber.equal(_listVals[0]);
      _secondUserBalanceAfter.should.be.bignumber.equal(_listVals[1]);
      _thirdUserBalanceAfter.should.be.bignumber.equal(_listVals[2]);
      _fourthUserBalanceAfter.should.be.bignumber.equal(_listVals[3]);
    });
  });

  describe('getTheNumberOfHolders()', function() {
    it('Should return number of holders', async function() {
      let _firstNumHol = await balanceSheetContract.getTheNumberOfHolders();
      let _newAdds = accounts[6];
      await balanceSheetContract.setBalance(_newAdds, bn.tokens(1), {from : owner}).should.be.fulfilled;
      let _secNumHol = await balanceSheetContract.getTheNumberOfHolders().should.be.fulfilled;

      _secNumHol.should.be.bignumber.equal(_firstNumHol.plus(1));
    });
  });

  describe('getHolder()', function() {
    it('Should allow get address via index', async function() {
      let _newAdds = accounts[6];
      await balanceSheetContract.setBalance(_newAdds, bn.tokens(1), {from : owner}).should.be.fulfilled;
      let _numHol = await balanceSheetContract.getTheNumberOfHolders().should.be.fulfilled;
      let holder = await balanceSheetContract.getHolder(_numHol.minus(1)).should.be.fulfilled;
      assert.equal(holder, _newAdds);
    });
  });
})
