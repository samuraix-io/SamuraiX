import ether from './helpers/ether.js';

const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const bn = require('./helpers/bignumber.js');

function check(RegisteredUsers, accounts, deployTokenCb) {
  var token;
  var registeredUsers;
  var owner = accounts[0];
  var investor = accounts[1];
  var purchaser = accounts[2];
  var beneficiary1 = accounts[3];
  var beneficiary2 = accounts[4];
  var specialUser = accounts[5];
  var unregisteredUser = accounts[6];

  beforeEach(async function () {
    registeredUsers = await RegisteredUsers.new();
    await registeredUsers.addRegisteredUser(investor, false);
    await registeredUsers.addRegisteredUser(purchaser, false);
    await registeredUsers.addRegisteredUser(beneficiary1, false);
    await registeredUsers.addRegisteredUser(beneficiary2, false);
    await registeredUsers.addRegisteredUser(specialUser, true);

    token = await deployTokenCb(registeredUsers);
  });

  describe('totalBalanceOfNormalHolders()', function() {
    it('should have expected initial value', async function() {
      (await token.totalBalanceOfNormalHolders({from: investor})).should.be.bignumber.equal(0);
    });

    it('when there are some normal holders', async function() {
      var holder1Balance = bn.tokens(10**6);
      var holder2Balance = bn.tokens(10**5 + 6543);
      var holder3Balance = bn.tokens(10**4 + 201);
      var expectedTotal = holder1Balance.plus(holder2Balance).plus(holder3Balance);

      await token.mint(investor, holder1Balance);
      await token.addHolder(investor);
      await token.mint(purchaser, holder2Balance);
      await token.addHolder(purchaser);
      await token.mint(beneficiary1, holder3Balance);
      await token.addHolder(beneficiary1);

      var total = await token.totalBalanceOfNormalHolders({from: investor}).should.be.fulfilled;
      total.should.be.bignumber.equal(expectedTotal);
    });

    it('should not include balance of special users', async function() {
      var holder1Balance = bn.tokens(10**7);
      var holder2Balance = bn.tokens(10**5 + 8**3 + 1);
      var holder3Balance = bn.tokens(10**4 + 9**4 + 3);
      var specialHolderBalance = bn.tokens(10**6 + 222);
      var expectedTotal = holder1Balance.plus(holder2Balance).plus(holder3Balance);

      await token.mint(investor, holder1Balance);
      await token.addHolder(investor);
      await token.mint(purchaser, holder2Balance);
      await token.addHolder(purchaser);
      await token.mint(beneficiary1, holder3Balance);
      await token.addHolder(beneficiary1);
      await token.mint(specialUser, specialHolderBalance);
      await token.addHolder(specialUser);

      var total = await token.totalBalanceOfNormalHolders({from: investor}).should.be.fulfilled;
      total.should.be.bignumber.equal(expectedTotal);
    });
  });

  describe('calculateProfit()', function() {
    it('should reject invalid parameters', async function() {
      var investorBalance = bn.tokens(10**4);
      var totalProfit = bn.tokens(10**6 * 50);
      var totalBalance = bn.tokens(100 * (10**6));

      await token.mint(investor, investorBalance);
      // investor address is not in the holders list
      await token.calculateProfit(totalProfit, totalBalance, investor).should.be.rejected;

      await token.addHolder(investor);
      totalBalance = bn.tokens(0);
      // totalBalance equals 0
      await token.calculateProfit(totalProfit, totalBalance, investor).should.be.rejected;
      totalProfit = bn.tokens(0);
      // totalProfit equals 0
      await token.calculateProfit(totalProfit, totalBalance, investor).should.be.rejected;
    });

    it('profit in Ether', async function() {
      var investorBalance = bn.tokens(10**5);
      var totalProfit = ether(10);
      var totalBalance = bn.tokens(100 * (10**6));
      var expectedProfit = bn.roundDown(totalProfit.times(investorBalance).dividedBy(totalBalance));

      await token.mint(investor, investorBalance);
      await token.addHolder(investor);

      var profit = await token.calculateProfit(totalProfit, totalBalance, investor);
      profit.should.be.bignumber.equal(expectedProfit);
    });

    it('profit in Ether (odd)', async function() {
      var investorBalance = bn.tokens(10**5 + 1);
      var totalProfit = ether(10.1111);
      var totalBalance = bn.tokens(101 * (10**6) + 10**4 + 303);
      var expectedProfit = bn.roundDown(totalProfit.times(investorBalance).dividedBy(totalBalance));

      await token.mint(investor, investorBalance);
      await token.addHolder(investor);

      var profit = await token.calculateProfit(totalProfit, totalBalance, investor);
      profit.should.be.bignumber.equal(expectedProfit);
    });

    it('profit in RAX', async function() {
      var investorBalance = bn.tokens(10**5 * 2);
      var totalProfit = bn.tokens(10**6 * 50);
      var totalBalance = bn.tokens(100 * (10**6));
      var expectedProfit = bn.roundDown(totalProfit.times(investorBalance).dividedBy(totalBalance));

      await token.mint(investor, investorBalance);
      await token.addHolder(investor);

      var profit = await token.calculateProfit(totalProfit, totalBalance, investor);
      profit.should.be.bignumber.equal(expectedProfit);
    });

    it('profit in RAX (odd)', async function() {
      var investorBalance = bn.tokens(10**5 * 2 + 121);
      var totalProfit = bn.tokens(10**6 * 50 + 9**5 + 707);
      var totalBalance = bn.tokens(100 * (10**6) + 8**5 + 909);
      var expectedProfit = bn.roundDown(totalProfit.times(investorBalance).dividedBy(totalBalance));

      await token.mint(investor, investorBalance);
      await token.addHolder(investor);

      var profit = await token.calculateProfit(totalProfit, totalBalance, investor);
      profit.should.be.bignumber.equal(expectedProfit);
    });

    it('investor has 0 remaining tokens', async function() {
      var investorBalance = bn.tokens(0);
      var totalProfit = ether(1000);
      var totalBalance = bn.tokens(100 * (10**6));
      var expectedProfit = 0;

      await token.addHolder(investor);

      var profit = await token.calculateProfit(totalProfit, totalBalance, investor);
      profit.should.be.bignumber.equal(0);
    });

    it('total profit equals max uint256', async function() {
      var investorBalance = bn.tokens(10**5 * 2);
      var totalProfit = bn.MAX_UINT;
      var totalBalance = bn.tokens(100 * (10**6));
      var expectedProfit = 0;

      await token.mint(investor, investorBalance);
      await token.addHolder(investor);

      await token.calculateProfit(totalProfit, totalBalance, investor).should.be.rejected;
    });

    it('total profit exceeds max uint256', async function() {
      var investorBalance = bn.tokens(10**5 * 2);
      var totalProfit = bn.OVER_UINT;
      var totalBalance = bn.tokens(100 * (10**6));
      var expectedProfit = 0;

      await token.mint(investor, investorBalance);
      await token.addHolder(investor);

      var profit = await token.calculateProfit(totalProfit, totalBalance, investor);
      profit.should.be.bignumber.equal(0);
    });
  });

  describe('transfer()', function() {
    it('should allow to transfer tokens to a registered user', async function() {
      var amount = bn.tokens(100);
      await token.mint(investor, amount).should.be.fulfilled;
      (await registeredUsers.isUserRegistered(purchaser)).should.be.equal(true);
      await token.transfer(purchaser, amount, {from: investor}).should.be.fulfilled;
    });

    it('should reject transferring tokens to any unregistered users', async function() {
      var amount = bn.tokens(100);
      await token.mint(investor, amount).should.be.fulfilled;
      (await registeredUsers.isUserRegistered(unregisteredUser)).should.be.equal(false);
      await token.transfer(unregisteredUser, amount, {from: investor}).should.be.rejected;
    });

    it('should add beneficiary address to the holders list', async function () {
      var amount = bn.tokens(100);
      await token.mint(investor, amount);
      (await token.isHolder(beneficiary1)).should.be.equal(false);

      await token.transfer(beneficiary1, amount, {from: investor}).should.be.fulfilled;
      (await token.isHolder(beneficiary1)).should.be.equal(true);
    });

  });

  describe('transferFrom()', function() {
    it('should allow to transfer tokens to a registered user', async function() {
      var amount = bn.tokens(100);
      await token.mint(investor, amount).should.be.fulfilled;
      (await registeredUsers.isUserRegistered(beneficiary2)).should.be.equal(true);
      await token.approve(beneficiary1, amount, {from: investor}).should.be.fulfilled;
      await token.transferFrom(investor, beneficiary2, amount, {from: beneficiary1}).should.be.fulfilled;
    });

    it('should reject transferring tokens to any unregistered users', async function() {
      var amount = bn.tokens(100);
      await token.mint(investor, amount).should.be.fulfilled;
      (await registeredUsers.isUserRegistered(unregisteredUser)).should.be.equal(false);
      await token.approve(beneficiary1, amount, {from: investor}).should.be.fulfilled;
      await token.transferFrom(investor, unregisteredUser, amount, {from: beneficiary1}).should.be.rejected;
    });

    it('should add beneficiary address to the holders list', async function () {
      var amount = bn.tokens(100);
      await token.mint(investor, amount);
      (await token.isHolder(beneficiary2)).should.be.equal(false);

      await token.approve(beneficiary1, amount, {from: investor}).should.be.fulfilled;
      await token.transferFrom(investor, beneficiary2, amount, {from: beneficiary1}).should.be.fulfilled;
      (await token.isHolder(beneficiary2)).should.be.equal(true);
    });
  });
}

module.exports.check = check;
