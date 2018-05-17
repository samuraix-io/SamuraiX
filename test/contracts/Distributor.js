import ether from './helpers/ether.js';

const BigNumber = web3.BigNumber;
const bn = require('./helpers/bignumber.js');
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

let ethRAXRate = 75000;
let ethPATRate = 75000;

function testEther(RegisteredUsers, DistributeEther, accounts, managers, deployTokenCb) {
  let token;
  let registeredUsers;
  let distributeEther;
  let owner = accounts[0];
  let registeredUser1 = accounts[3];
  let registeredUser2 = accounts[4];
  let registeredUser3 = accounts[5];
  let unregisteredUser = accounts[9];
  let holderHasNoTokens = accounts[7];
  let specialUser = accounts[6];

  before(async function () {
    registeredUsers = await RegisteredUsers.new().should.be.fulfilled;

    // Normal users
    await registeredUsers.addRegisteredUser(registeredUser1, false).should.be.fulfilled;
    await registeredUsers.addRegisteredUser(registeredUser2, false).should.be.fulfilled;
    await registeredUsers.addRegisteredUser(registeredUser3, false).should.be.fulfilled;

    await registeredUsers.addRegisteredUser(managers[0], false).should.be.fulfilled;
    await registeredUsers.addRegisteredUser(managers[1], false).should.be.fulfilled;
    await registeredUsers.addRegisteredUser(holderHasNoTokens, false).should.be.fulfilled;
    // Special users
    await registeredUsers.addRegisteredUser(specialUser, true).should.be.fulfilled;
  });

  beforeEach(async function () {
    token = await deployTokenCb(registeredUsers);
    distributeEther = await DistributeEther.new(registeredUsers.address, {overwrite: true}).should.be.fulfilled;

    await token.addHolder(registeredUser1).should.be.fulfilled;
    await token.addHolder(registeredUser2).should.be.fulfilled;
    await token.addHolder(registeredUser3).should.be.fulfilled;
  });

  it('token normal holders should receive funds \n', async function () {
    var totalProfit = ether(10**6 + 10**4 + 123);
    var tokens1 = bn.tokens(3 * 10**6);
    var tokens2 = bn.tokens(4 * 10**6 + 2018);
    var tokens3 = bn.tokens(5 * 10**6 + 2019);
    await token.mint(registeredUser1, tokens1, {from:owner}).should.be.fulfilled;
    await token.mint(registeredUser2, tokens2, {from:owner}).should.be.fulfilled;
    await token.mint(registeredUser3, tokens3, {from:owner}).should.be.fulfilled;

    var totalBalance = tokens1.plus(tokens2.plus(tokens3));
    var income1Before = await distributeEther.getIncome(registeredUser1);
    var income2Before = await distributeEther.getIncome(registeredUser2);
    var income3Before = await distributeEther.getIncome(registeredUser3);

    await distributeEther.distributeProfit(token.address, {from: managers[0], value: totalProfit}).should.be.fulfilled;

    var expectedProfit1 = bn.roundDown(totalProfit.times(tokens1).dividedBy(totalBalance));
    var expectedProfit2 = bn.roundDown(totalProfit.times(tokens2).dividedBy(totalBalance));
    var expectedProfit3 = bn.roundDown(totalProfit.times(tokens3).dividedBy(totalBalance));
    var income1After = await distributeEther.getIncome(registeredUser1);
    var income2After = await distributeEther.getIncome(registeredUser2);
    var income3After = await distributeEther.getIncome(registeredUser3);
    income1After.should.be.bignumber.equal(income1Before.plus(expectedProfit1));
    income2After.should.be.bignumber.equal(income2Before.plus(expectedProfit2));
    income3After.should.be.bignumber.equal(income3Before.plus(expectedProfit3));
  });

  it('a holder who has no tokens should receive zero funds \n', async function () {
    await token.addHolder(holderHasNoTokens).should.be.fulfilled;

    var totalProfit = ether(10**6 + 10**4 + 234567);
    var tokens1 = bn.tokens(2 * 10**6);
    var tokens2 = bn.tokens(3 * 10**5 + 201);
    var tokens3 = bn.tokens(4 * 10**4 + 103);
    await token.mint(registeredUser1, tokens1, {from:owner}).should.be.fulfilled;
    await token.mint(registeredUser2, tokens2, {from:owner}).should.be.fulfilled;
    await token.mint(registeredUser3, tokens3, {from:owner}).should.be.fulfilled;

    var totalBalance = tokens1.plus(tokens2.plus(tokens3));
    var income1Before = await distributeEther.getIncome(registeredUser1);
    var income2Before = await distributeEther.getIncome(registeredUser2);
    var income3Before = await distributeEther.getIncome(registeredUser3);
    var income4Before = await distributeEther.getIncome(holderHasNoTokens);

    await distributeEther.distributeProfit(token.address, {from: managers[1], value: totalProfit}).should.be.fulfilled;

    var expectedProfit1 = bn.roundDown(totalProfit.times(tokens1).dividedBy(totalBalance));
    var expectedProfit2 = bn.roundDown(totalProfit.times(tokens2).dividedBy(totalBalance));
    var expectedProfit3 = bn.roundDown(totalProfit.times(tokens3).dividedBy(totalBalance));
    var income1After = await distributeEther.getIncome(registeredUser1);
    var income2After = await distributeEther.getIncome(registeredUser2);
    var income3After = await distributeEther.getIncome(registeredUser3);
    var income4After = await distributeEther.getIncome(holderHasNoTokens);
    income1After.should.be.bignumber.equal(income1Before.plus(expectedProfit1));
    income2After.should.be.bignumber.equal(income2Before.plus(expectedProfit2));
    income3After.should.be.bignumber.equal(income3Before.plus(expectedProfit3));
    income4After.should.be.bignumber.equal(income4Before);
  });

  it('unregistered user should not receive profit \n', async function () {
    await token.mint(unregisteredUser, bn.tokens(10**6), {from:owner}).should.be.fulfilled;
    await token.addHolder(unregisteredUser).should.be.fulfilled;

    var totalProfit = ether(10**6 + 10**3 + 333);
    var tokens1 = bn.tokens(7 * 10**6);
    var tokens2 = bn.tokens(8 * 10**4 + 1);
    await token.mint(registeredUser1, tokens1, {from:owner}).should.be.fulfilled;
    await token.mint(registeredUser2, tokens2, {from:owner}).should.be.fulfilled;

    var totalBalance = tokens1.plus(tokens2);
    var income1Before = await distributeEther.getIncome(registeredUser1);
    var income2Before = await distributeEther.getIncome(registeredUser2);
    var income3Before = await distributeEther.getIncome(unregisteredUser);

    await distributeEther.distributeProfit(token.address, {from: managers[1], value: totalProfit}).should.be.fulfilled;

    var expectedProfit1 = bn.roundDown(totalProfit.times(tokens1).dividedBy(totalBalance));
    var expectedProfit2 = bn.roundDown(totalProfit.times(tokens2).dividedBy(totalBalance));
    var income1After = await distributeEther.getIncome(registeredUser1);
    var income2After = await distributeEther.getIncome(registeredUser2);
    var income3After = await distributeEther.getIncome(unregisteredUser);

    income1After.should.be.bignumber.equal(income1Before.plus(expectedProfit1));
    income2After.should.be.bignumber.equal(income2Before.plus(expectedProfit2));
    income3After.should.be.bignumber.equal(income3Before);
  });

  it('special user should not receive profit \n', async function () {
    await token.mint(unregisteredUser, bn.tokens(10**6), {from:owner}).should.be.fulfilled;
    await token.addHolder(unregisteredUser).should.be.fulfilled;

    await token.mint(specialUser, bn.tokens(2 * 10**6), {from:owner}).should.be.fulfilled;
    await token.addHolder(specialUser).should.be.fulfilled;

    var totalProfit = ether(10**6 + 10**3 + 333);
    var tokens1 = bn.tokens(7 * 10**6);
    var tokens2 = bn.tokens(8 * 10**4 + 1);
    await token.mint(registeredUser1, tokens1, {from:owner}).should.be.fulfilled;
    await token.mint(registeredUser2, tokens2, {from:owner}).should.be.fulfilled;

    var totalBalance = tokens1.plus(tokens2);
    var income1Before = await distributeEther.getIncome(registeredUser1);
    var income2Before = await distributeEther.getIncome(registeredUser2);
    var income3Before = await distributeEther.getIncome(unregisteredUser);
    var income4Before = await distributeEther.getIncome(specialUser);

    await distributeEther.distributeProfit(token.address, {from: managers[1], value: totalProfit}).should.be.fulfilled;

    var expectedProfit1 = bn.roundDown(totalProfit.times(tokens1).dividedBy(totalBalance));
    var expectedProfit2 = bn.roundDown(totalProfit.times(tokens2).dividedBy(totalBalance));
    var income1After = await distributeEther.getIncome(registeredUser1);
    var income2After = await distributeEther.getIncome(registeredUser2);
    var income3After = await distributeEther.getIncome(unregisteredUser);
    var income4After = await distributeEther.getIncome(specialUser);

    income1After.should.be.bignumber.equal(income1Before.plus(expectedProfit1));
    income2After.should.be.bignumber.equal(income2Before.plus(expectedProfit2));
    income3After.should.be.bignumber.equal(income3Before);
    income4After.should.be.bignumber.equal(income4Before);
  });

  it('manager should receive profit if he is also a token holder \n', async function () {
    var totalProfit = ether(10**6 + 10**4 + 309);
    var tokens1 = bn.tokens(2 * 10**7);
    var tokens2 = bn.tokens(3 * 10**5 + 102);
    var tokens3 = bn.tokens(7 * 10**4 + 105);
    var tokensOfManager = bn.tokens(30 * 10**6);
    var manager = managers[0];
    await token.mint(registeredUser1, tokens1, {from:owner}).should.be.fulfilled;
    await token.mint(registeredUser2, tokens2, {from:owner}).should.be.fulfilled;
    await token.mint(registeredUser3, tokens3, {from:owner}).should.be.fulfilled;
    await token.mint(manager, tokensOfManager, {from:owner}).should.be.fulfilled;
    await token.addHolder(manager);

    var totalBalance = tokens1.plus(tokens2.plus(tokens3.plus(tokensOfManager)));
    var income1Before = await distributeEther.getIncome(registeredUser1);
    var income2Before = await distributeEther.getIncome(registeredUser2);
    var income3Before = await distributeEther.getIncome(registeredUser3);
    var incomeManagerBefore = await distributeEther.getIncome(manager);

    await distributeEther.distributeProfit(token.address, {from: manager, value: totalProfit}).should.be.fulfilled;

    var expectedProfit1 = bn.roundDown(totalProfit.times(tokens1).dividedBy(totalBalance));
    var expectedProfit2 = bn.roundDown(totalProfit.times(tokens2).dividedBy(totalBalance));
    var expectedProfit3 = bn.roundDown(totalProfit.times(tokens3).dividedBy(totalBalance));
    var expectedProfitManager = bn.roundDown(totalProfit.times(tokensOfManager).dividedBy(totalBalance));
    var income1After = await distributeEther.getIncome(registeredUser1);
    var income2After = await distributeEther.getIncome(registeredUser2);
    var income3After = await distributeEther.getIncome(registeredUser3);
    var incomeManagerAfter = await distributeEther.getIncome(manager);
    income1After.should.be.bignumber.equal(income1Before.plus(expectedProfit1));
    income2After.should.be.bignumber.equal(income2Before.plus(expectedProfit2));
    income3After.should.be.bignumber.equal(income3Before.plus(expectedProfit3));
    incomeManagerAfter.should.be.bignumber.equal(incomeManagerBefore.plus(expectedProfitManager));
  });

  it('should log ProfitDistributed event \n', async function () {
    var totalProfit = ether(101);
    var holders = [registeredUser1, registeredUser2, registeredUser3];
    var tokens1 = bn.tokens(10**6 + 123);
    var tokens2 = bn.tokens(10**6 + 1234);
    var tokens3 = bn.tokens(10**6 + 12345);
    await token.mint(registeredUser1, tokens1, {from:owner}).should.be.fulfilled;
    await token.mint(registeredUser2, tokens2, {from:owner}).should.be.fulfilled;
    await token.mint(registeredUser3, tokens3, {from:owner}).should.be.fulfilled;

    var income1Before = await distributeEther.getIncome(registeredUser1);
    var income2Before = await distributeEther.getIncome(registeredUser2);
    var income3Before = await distributeEther.getIncome(registeredUser3);

    var res = await distributeEther.distributeProfit(token.address, {from: managers[0], value: totalProfit}).should.be.fulfilled;

    const {logs} = res;
    const event = logs.find(e => e.event === 'ProfitDistributed');
    should.exist(event);
    event.args._coinId.should.be.bignumber.equal(0);
    event.args._token.should.be.equal(token.address);
    var _holders = event.args._holders;
    var _len = _holders.length;
    for (var i = 0; i < _len; ++i) {
      _holders[i].should.be.equal(holders[i]);
    }
    var _profits = event.args._profits;
    var income1After = await distributeEther.getIncome(registeredUser1);
    var income2After = await distributeEther.getIncome(registeredUser2);
    var income3After = await distributeEther.getIncome(registeredUser3);
    income1After.minus(income1Before).should.be.bignumber.equal(new BigNumber(_profits[0]));
    income2After.minus(income2Before).should.be.bignumber.equal(new BigNumber(_profits[1]));
    income3After.minus(income3Before).should.be.bignumber.equal(new BigNumber(_profits[2]));
  });

  describe('transferring funds to holders who have profit distributed \n', function() {
    var totalProfit = ether(10**5 + 1);

    beforeEach(async function () {
      var tokens1 = bn.tokens(10**6 + 123);
      var tokens2 = bn.tokens(10**5 + 1234);
      var tokens3 = bn.tokens(10**7 + 12345);
      await token.mint(registeredUser1, tokens1, {from:owner}).should.be.fulfilled;
      await token.mint(registeredUser2, tokens2, {from:owner}).should.be.fulfilled;
      await token.mint(registeredUser3, tokens3, {from:owner}).should.be.fulfilled;

      await distributeEther.distributeProfit(token.address, {from: managers[0], value: totalProfit}).should.be.fulfilled;
    });

    it('owner can transfer funds to all holders who have incomes (doTransfer())\n', async function () {
      var income1 = await distributeEther.getIncome(registeredUser1);
      var income2 = await distributeEther.getIncome(registeredUser2);
      var income3 = await distributeEther.getIncome(registeredUser3);
      var balance1Before = await web3.eth.getBalance(registeredUser1);
      var balance2Before = await web3.eth.getBalance(registeredUser2);
      var balance3Before = await web3.eth.getBalance(registeredUser3);

      var count = await token.getTheNumberOfHolders();
      for(var i = 0; i < count; ++i) {
        var holderAddr = await token.getHolderAddress(i);
        var isNormalHolder = await token.isNormalHolder(holderAddr);
        if (!isNormalHolder) continue;
        await distributeEther.doTransfer(holderAddr, {from: owner}).should.be.fulfilled;
      }

      var balance1After = await web3.eth.getBalance(registeredUser1);
      var balance2After = await web3.eth.getBalance(registeredUser2);
      var balance3After = await web3.eth.getBalance(registeredUser3);
      balance1After.should.be.bignumber.equal(balance1Before.plus(income1));
      balance2After.should.be.bignumber.equal(balance2Before.plus(income2));
      balance3After.should.be.bignumber.equal(balance3Before.plus(income3));
    });

    it('non-owner can not transfer funds to any holders (doTransfer()) \n', async function () {
      var income1 = await distributeEther.getIncome(registeredUser1);
      income1.should.be.bignumber.gt(0);
      await distributeEther.doTransfer(registeredUser1, {from: managers[0]}).should.be.rejected;
      await distributeEther.doTransfer(registeredUser1, {from: managers[1]}).should.be.rejected;
      await distributeEther.doTransfer(registeredUser1, {from: registeredUser1}).should.be.rejected;
      await distributeEther.doTransfer(registeredUser1, {from: specialUser}).should.be.rejected;
    });

    it('can not transfer funds to any holders who have no incomes (doTransfer()) \n', async function () {
      var income = await distributeEther.getIncome(specialUser);
      income.should.be.bignumber.equal(0);
      await distributeEther.doTransfer(specialUser, {from: owner}).should.be.rejected;
    });

    it('should update income after invoke doTransfer() \n', async function () {
      var income1Before = await distributeEther.getIncome(registeredUser1);
      var balance1Before = await web3.eth.getBalance(registeredUser1);

      await distributeEther.doTransfer(registeredUser1, {from: owner}).should.be.fulfilled;

      var income1After = await distributeEther.getIncome(registeredUser1);
      var balance1After = await web3.eth.getBalance(registeredUser1);

      balance1After.should.be.bignumber.equal(balance1Before.plus(income1Before));
      income1After.should.be.bignumber.equal(0);
    });

    it('a holder who has valid funds distributed can withdraw \n', async function () {
      var income1 = await distributeEther.getIncome(registeredUser1);
      var income2 = await distributeEther.getIncome(registeredUser2);
      var income3 = await distributeEther.getIncome(registeredUser3);

      var balance1Before = await web3.eth.getBalance(registeredUser1);
      var balance2Before = await web3.eth.getBalance(registeredUser2);
      var balance3Before = await web3.eth.getBalance(registeredUser3);

      await distributeEther.withdraw(income1, {from: registeredUser1}).should.be.fulfilled;
      await distributeEther.withdraw(income2, {from: registeredUser2}).should.be.fulfilled;
      await distributeEther.withdraw(income3, {from: registeredUser3}).should.be.fulfilled;

      var balance1After = await web3.eth.getBalance(registeredUser1);
      var balance2After = await web3.eth.getBalance(registeredUser2);
      var balance3After = await web3.eth.getBalance(registeredUser3);

      balance1After.minus(balance1Before).should.be.bignumber.gt(income1.minus(ether(0.001)));  // gas fee
      balance2After.minus(balance2Before).should.be.bignumber.gt(income2.minus(ether(0.001)));  // gas fee
      balance3After.minus(balance3Before).should.be.bignumber.gt(income3.minus(ether(0.001)));  // gas fee
    });

    it('withdrawing should update income \n', async function () {
      var income1Before = await distributeEther.getIncome(registeredUser1);
      var balance1Before = await web3.eth.getBalance(registeredUser1);

      var amount = income1Before.minus(ether(10));
      await distributeEther.withdraw(amount, {from: registeredUser1}).should.be.fulfilled;

      var income1After = await distributeEther.getIncome(registeredUser1);
      var balance1After = await web3.eth.getBalance(registeredUser1);

      balance1After.should.be.bignumber.gt(balance1Before.plus(amount).minus(ether(0.001)));  // gas fee
      income1After.should.be.bignumber.equal(income1Before.minus(amount));
    });

    it('should reject withdrawing from a holder who has no income \n', async function () {
      var holder = accounts[8];
      await token.addHolder(holder).should.be.fulfilled;
      var income = await distributeEther.getIncome(holder);
      income.should.be.bignumber.equal(0);

      await distributeEther.withdraw(ether(0.1), {from: holder}).should.be.rejected;
    });

    it('should reject withdrawing an amount which is greater than income \n', async function () {
      var income1 = await distributeEther.getIncome(registeredUser1);
      await distributeEther.withdraw(income1.plus(ether(0.001)), {from: registeredUser1}).should.be.rejected;
    });
  });
}

function testRAX(RegisteredUsers, DistributeRAX, accounts, managers, deployToken, deployRAXToken) {
  let token;
  let raxToken;
  let registeredUsers;
  let distributeRAX;
  let owner = accounts[0];
  let amountTokens = ethToPAT(200);
  let totalProfit = ethToRAX(10**4);
  let registeredUser1 = accounts[3];
  let registeredUser2 = accounts[4];
  let registeredUser3 = accounts[5];
  let unregisteredUser = accounts[9];
  let holderHasNoTokens = accounts[7];
  let specialUser = accounts[6];
  let targetIsRAXHolders = false;

  before(async function () {
    registeredUsers = await RegisteredUsers.new().should.be.fulfilled;

    // Normal users
    await registeredUsers.addRegisteredUser(registeredUser1, false).should.be.fulfilled;
    await registeredUsers.addRegisteredUser(registeredUser2, false).should.be.fulfilled;
    await registeredUsers.addRegisteredUser(registeredUser3, false).should.be.fulfilled;

    await registeredUsers.addRegisteredUser(managers[0], false).should.be.fulfilled;
    await registeredUsers.addRegisteredUser(managers[1], false).should.be.fulfilled;
    await registeredUsers.addRegisteredUser(holderHasNoTokens, false).should.be.fulfilled;
    // Special users
    await registeredUsers.addRegisteredUser(specialUser, true).should.be.fulfilled;
  });

  beforeEach(async function () {
    token = await deployToken(registeredUsers);
    if (deployRAXToken !== undefined) {
      raxToken = await deployRAXToken(registeredUsers);
    } else {
      raxToken = token;
      targetIsRAXHolders = true;
    }

    await token.addHolder(registeredUser1).should.be.fulfilled;
    await token.addHolder(registeredUser2).should.be.fulfilled;
    await token.addHolder(registeredUser3).should.be.fulfilled;

    distributeRAX = await DistributeRAX.new(registeredUsers.address, raxToken.address, {overwrite: true}).should.be.fulfilled;
  });

  it('token normal holders should receive funds \n', async function () {
    var manager = managers[0];
    var tokens1 = amountTokens;
    var tokens2 = amountTokens;
    var tokens3 = amountTokens.times(2);
    await token.mint(registeredUser1, tokens1, {from:owner}).should.be.fulfilled;
    await token.mint(registeredUser2, tokens2, {from:owner}).should.be.fulfilled;
    await token.mint(registeredUser3, tokens3, {from:owner}).should.be.fulfilled;

    var tokensOfManager = totalProfit.times(2);
    await raxToken.mint(manager, tokensOfManager, {from:owner}).should.be.fulfilled;
    await raxToken.addHolder(manager);
    var totalBalance = tokens1.plus(tokens2.plus(tokens3));
    if (targetIsRAXHolders) totalBalance = totalBalance.plus(tokensOfManager);
    var raxTokens1Before = await raxToken.balanceOf(registeredUser1);
    var raxTokens2Before = await raxToken.balanceOf(registeredUser2);
    var raxTokens3Before = await raxToken.balanceOf(registeredUser3);

    await raxToken.approve(distributeRAX.address, totalProfit, {from: manager}).should.be.fulfilled;
    await distributeRAX.distributeProfit(token.address, {from: manager}).should.be.fulfilled;

    var expectedProfit1 = bn.roundDown(totalProfit.times(tokens1).dividedBy(totalBalance));
    var expectedProfit2 = bn.roundDown(totalProfit.times(tokens2).dividedBy(totalBalance));
    var expectedProfit3 = bn.roundDown(totalProfit.times(tokens3).dividedBy(totalBalance));
    var raxTokens1After = await raxToken.balanceOf(registeredUser1);
    var raxTokens2After = await raxToken.balanceOf(registeredUser2);
    var raxTokens3After = await raxToken.balanceOf(registeredUser3);

    raxTokens1After.should.be.bignumber.equal(raxTokens1Before.plus(expectedProfit1));
    raxTokens2After.should.be.bignumber.equal(raxTokens2Before.plus(expectedProfit2));
    raxTokens3After.should.be.bignumber.equal(raxTokens3Before.plus(expectedProfit3));
  });

  it('A holder who has no tokens should receive zero funds \n', async function () {
    await token.addHolder(holderHasNoTokens).should.be.fulfilled;

    var manager = managers[1];
    var tokens1 = amountTokens;
    var tokens2 = amountTokens.plus(bn.tokens(103));
    var tokens3 = amountTokens.plus(bn.tokens(201));

    await token.mint(registeredUser1, tokens1, {from:owner}).should.be.fulfilled;
    await token.mint(registeredUser2, tokens2, {from:owner}).should.be.fulfilled;
    await token.mint(registeredUser3, tokens3, {from:owner}).should.be.fulfilled;

    var tokensOfManager = totalProfit.plus(bn.tokens(2018));
    await raxToken.mint(manager, tokensOfManager, {from:owner}).should.be.fulfilled;
    await raxToken.addHolder(manager);
    var totalBalance = tokens1.plus(tokens2.plus(tokens3));
    if (targetIsRAXHolders) totalBalance = totalBalance.plus(tokensOfManager);

    var raxTokens1Before = await raxToken.balanceOf(registeredUser1);
    var raxTokens2Before = await raxToken.balanceOf(registeredUser2);
    var raxTokens3Before = await raxToken.balanceOf(registeredUser3);
    var raxTokens4Before = await raxToken.balanceOf(holderHasNoTokens);

    await raxToken.approve(distributeRAX.address, totalProfit, {from: manager}).should.be.fulfilled;
    await distributeRAX.distributeProfit(token.address, {from: manager}).should.be.fulfilled;

    var expectedProfit1 = bn.roundDown(totalProfit.times(tokens1).dividedBy(totalBalance));
    var expectedProfit2 = bn.roundDown(totalProfit.times(tokens2).dividedBy(totalBalance));
    var expectedProfit3 = bn.roundDown(totalProfit.times(tokens3).dividedBy(totalBalance));
    var raxTokens1After = await raxToken.balanceOf(registeredUser1);
    var raxTokens2After = await raxToken.balanceOf(registeredUser2);
    var raxTokens3After = await raxToken.balanceOf(registeredUser3);
    var raxTokens4After = await raxToken.balanceOf(holderHasNoTokens);

    raxTokens1After.should.be.bignumber.equal(raxTokens1Before.plus(expectedProfit1));
    raxTokens2After.should.be.bignumber.equal(raxTokens2Before.plus(expectedProfit2));
    raxTokens3After.should.be.bignumber.equal(raxTokens3Before.plus(expectedProfit3));
    raxTokens4After.should.be.bignumber.equal(raxTokens4Before);
  });

  it('manager should receive profit if he is distributing to RAX holders \n', async function () {
    var totalProfit = ethToRAX(100000);
    var tokens1 = amountTokens;
    var tokens2 = amountTokens;
    var tokens3 = amountTokens;
    await token.mint(registeredUser1, tokens1, {from:owner}).should.be.fulfilled;
    await token.mint(registeredUser2, tokens2, {from:owner}).should.be.fulfilled;
    await token.mint(registeredUser3, tokens3, {from:owner}).should.be.fulfilled;

    var manager = managers[0];
    var tokensOfManager = totalProfit.plus(bn.tokens(2018));
    await raxToken.mint(manager, tokensOfManager, {from:owner}).should.be.fulfilled;
    await raxToken.addHolder(manager).should.be.fulfilled;
    var totalBalance = tokens1.plus(tokens2.plus(tokens3));
    if (targetIsRAXHolders) totalBalance = totalBalance.plus(tokensOfManager);
    var raxTokens1Before = await raxToken.balanceOf(registeredUser1);
    var raxTokens2Before = await raxToken.balanceOf(registeredUser2);
    var raxTokens3Before = await raxToken.balanceOf(registeredUser3);

    await raxToken.approve(distributeRAX.address, totalProfit, {from: manager}).should.be.fulfilled;
    await distributeRAX.distributeProfit(token.address, {from: manager}).should.be.fulfilled;

    var expectedProfit1 = bn.roundDown(totalProfit.times(tokens1).dividedBy(totalBalance));
    var expectedProfit2 = bn.roundDown(totalProfit.times(tokens2).dividedBy(totalBalance));
    var expectedProfit3 = bn.roundDown(totalProfit.times(tokens3).dividedBy(totalBalance));
    var expectedProfitOfManager = new BigNumber(0);
    if (targetIsRAXHolders) expectedProfitOfManager = bn.roundDown(totalProfit.times(tokensOfManager).dividedBy(totalBalance));
    var totalShare = expectedProfit1.plus(expectedProfit2).plus(expectedProfit3.plus(expectedProfitOfManager));

    var raxTokens1After = await raxToken.balanceOf(registeredUser1);
    var raxTokens2After = await raxToken.balanceOf(registeredUser2);
    var raxTokens3After = await raxToken.balanceOf(registeredUser3);
    var raxTokensOfManagerAfter = await raxToken.balanceOf(manager);

    raxTokens1After.should.be.bignumber.equal(raxTokens1Before.plus(expectedProfit1));
    raxTokens2After.should.be.bignumber.equal(raxTokens2Before.plus(expectedProfit2));
    raxTokens3After.should.be.bignumber.equal(raxTokens3Before.plus(expectedProfit3));
    raxTokensOfManagerAfter.should.be.bignumber.equal(tokensOfManager.minus(totalShare).plus(expectedProfitOfManager));
    totalProfit.should.be.bignumber.gte(totalShare);
  });

  it('unregistered user should not receive profit \n', async function () {
    await token.mint(unregisteredUser, amountTokens.minus(bn.tokens(1234)), {from:owner}).should.be.fulfilled;
    await token.addHolder(unregisteredUser).should.be.fulfilled;

    var manager = managers[1];
    var tokens1 = amountTokens;
    var tokens2 = amountTokens.plus(bn.tokens(101));
    await token.mint(registeredUser1, tokens1, {from:owner}).should.be.fulfilled;
    await token.mint(registeredUser2, tokens2, {from:owner}).should.be.fulfilled;

    var tokensOfManager = totalProfit.times(3);
    await raxToken.mint(manager, tokensOfManager, {from:owner}).should.be.fulfilled;
    await raxToken.addHolder(manager);
    var totalBalance = tokens1.plus(tokens2);
    if (targetIsRAXHolders) totalBalance = totalBalance.plus(tokensOfManager);

    var raxTokens1Before = await raxToken.balanceOf(registeredUser1);
    var raxTokens2Before = await raxToken.balanceOf(registeredUser2);
    var raxTokens3Before = await raxToken.balanceOf(unregisteredUser);

    await raxToken.approve(distributeRAX.address, totalProfit, {from: manager}).should.be.fulfilled;
    await distributeRAX.distributeProfit(token.address, {from: manager}).should.be.fulfilled;

    var expectedProfit1 = bn.roundDown(totalProfit.times(tokens1).dividedBy(totalBalance));
    var expectedProfit2 = bn.roundDown(totalProfit.times(tokens2).dividedBy(totalBalance));

    var raxTokens1After = await raxToken.balanceOf(registeredUser1);
    var raxTokens2After = await raxToken.balanceOf(registeredUser2);
    var raxTokens3After = await raxToken.balanceOf(unregisteredUser);
    raxTokens1After.should.be.bignumber.equal(raxTokens1Before.plus(expectedProfit1));
    raxTokens2After.should.be.bignumber.equal(raxTokens2Before.plus(expectedProfit2));
    raxTokens3After.should.be.bignumber.equal(raxTokens3Before);
  });

  it('special user should not receive profit \n', async function () {
    await token.mint(unregisteredUser, amountTokens.minus(bn.tokens(123)), {from:owner}).should.be.fulfilled;
    await token.addHolder(unregisteredUser).should.be.fulfilled;

    await token.mint(specialUser, amountTokens.plus(bn.tokens(1239)), {from:owner}).should.be.fulfilled;
    await token.addHolder(specialUser).should.be.fulfilled;

    var manager = managers[0];
    var tokens1 = amountTokens.minus(bn.tokens(203));
    var tokens2 = amountTokens.plus(bn.tokens(9101));
    await token.mint(registeredUser1, tokens1, {from:owner}).should.be.fulfilled;
    await token.mint(registeredUser2, tokens2, {from:owner}).should.be.fulfilled;

    var tokensOfManager = totalProfit.plus(bn.tokens(9009));
    await raxToken.mint(manager, tokensOfManager, {from:owner}).should.be.fulfilled;
    await raxToken.addHolder(manager);
    var totalBalance = tokens1.plus(tokens2);
    if (targetIsRAXHolders) totalBalance = totalBalance.plus(tokensOfManager);

    var raxTokens1Before = await raxToken.balanceOf(registeredUser1);
    var raxTokens2Before = await raxToken.balanceOf(registeredUser2);
    var raxTokens3Before = await raxToken.balanceOf(unregisteredUser);
    var raxTokens4Before = await raxToken.balanceOf(specialUser);

    await raxToken.approve(distributeRAX.address, totalProfit, {from: manager}).should.be.fulfilled;
    await distributeRAX.distributeProfit(token.address, {from: manager}).should.be.fulfilled;

    var expectedProfit1 = bn.roundDown(totalProfit.times(tokens1).dividedBy(totalBalance));
    var expectedProfit2 = bn.roundDown(totalProfit.times(tokens2).dividedBy(totalBalance));

    var raxTokens1After = await raxToken.balanceOf(registeredUser1);
    var raxTokens2After = await raxToken.balanceOf(registeredUser2);
    var raxTokens3After = await raxToken.balanceOf(unregisteredUser);
    var raxTokens4After = await raxToken.balanceOf(specialUser);
    raxTokens1After.should.be.bignumber.equal(raxTokens1Before.plus(expectedProfit1));
    raxTokens2After.should.be.bignumber.equal(raxTokens2Before.plus(expectedProfit2));
    raxTokens3After.should.be.bignumber.equal(raxTokens3Before);
    raxTokens4After.should.be.bignumber.equal(raxTokens4Before);
  });

  it('should log ProfitDistributed event \n', async function () {
    var manager = managers[0];
    var holders = [registeredUser1, registeredUser2, registeredUser3, manager];

    await token.mint(registeredUser1, amountTokens, {from:owner}).should.be.fulfilled;
    await token.mint(registeredUser2, amountTokens, {from:owner}).should.be.fulfilled;
    await token.mint(registeredUser3, amountTokens.times(3), {from:owner}).should.be.fulfilled;

    var raxTokens1Before = await raxToken.balanceOf(registeredUser1);
    var raxTokens2Before = await raxToken.balanceOf(registeredUser2);
    var raxTokens3Before = await raxToken.balanceOf(registeredUser3);

    var tokensOfManager = totalProfit.plus(bn.tokens(107));
    await raxToken.mint(manager, tokensOfManager, {from:owner}).should.be.fulfilled;
    await raxToken.addHolder(manager);

    await raxToken.approve(distributeRAX.address, totalProfit, {from: manager}).should.be.fulfilled;
    var res = await distributeRAX.distributeProfit(token.address, {from: manager}).should.be.fulfilled;

    const {logs} = res;
    const event = logs.find(e => e.event === 'ProfitDistributed');
    event.args._coinId.should.be.bignumber.equal(1);
    event.args._token.should.be.equal(token.address);
    var _holders = event.args._holders;
    var _len = _holders.length;
    for (var i = 0; i < _len; ++i) {
      _holders[i].should.be.equal(holders[i]);
    }

    var _profits = event.args._profits;
    var raxTokens1After = await raxToken.balanceOf(registeredUser1);
    var raxTokens2After = await raxToken.balanceOf(registeredUser2);
    var raxTokens3After = await raxToken.balanceOf(registeredUser3);
    raxTokens1After.minus(raxTokens1Before).should.be.bignumber.equal(new BigNumber(_profits[0]));
    raxTokens2After.minus(raxTokens2Before).should.be.bignumber.equal(new BigNumber(_profits[1]));
    raxTokens3After.minus(raxTokens3Before).should.be.bignumber.equal(new BigNumber(_profits[2]));
  });

  it('should reject an amount of tokens which is greater than balance \n', async function () {
    await token.mint(registeredUser1, amountTokens, {from:owner}).should.be.fulfilled;
    await token.mint(registeredUser2, amountTokens, {from:owner}).should.be.fulfilled;
    await token.mint(registeredUser3, amountTokens, {from:owner}).should.be.fulfilled;

    var manager = managers[0];
    await raxToken.mint(manager, totalProfit, {from:owner}).should.be.fulfilled;
    await raxToken.addHolder(manager);
    await raxToken.approve(distributeRAX.address, totalProfit.plus(bn.tokens(1)), {from: manager}).should.be.fulfilled;
    await distributeRAX.distributeProfit(token.address, {from: manager}).should.be.rejected;
  });

  it('should reject an amount of tokens which equals max uint256 \n', async function () {
    await token.mint(registeredUser1, amountTokens, {from:owner}).should.be.fulfilled;
    await token.mint(registeredUser2, amountTokens, {from:owner}).should.be.fulfilled;
    await token.mint(registeredUser3, amountTokens, {from:owner}).should.be.fulfilled;

    var manager = managers[0];
    await raxToken.mint(manager, totalProfit, {from:owner}).should.be.fulfilled;
    await raxToken.addHolder(manager);
    await raxToken.approve(distributeRAX.address, bn.MAX_UINT, {from: manager}).should.be.fulfilled;
    await distributeRAX.distributeProfit(token.address, {from: manager}).should.be.rejected;
  });

  it('should reject an amount of tokens which exceeds max uint \n', async function () {
    await token.mint(registeredUser1, amountTokens, {from:owner}).should.be.fulfilled;
    await token.mint(registeredUser2, amountTokens, {from:owner}).should.be.fulfilled;
    await token.mint(registeredUser3, amountTokens, {from:owner}).should.be.fulfilled;

    var manager = managers[0];
    await raxToken.mint(manager, totalProfit, {from:owner}).should.be.fulfilled;
    await raxToken.addHolder(manager);
    await raxToken.approve(distributeRAX.address, bn.OVER_UINT, {from: manager}).should.be.fulfilled;
    await distributeRAX.distributeProfit(token.address, {from: manager}).should.be.rejected;
  });
}

function ethToRAX(amount) {
  return ether(amount).times(ethRAXRate);
}

function ethToPAT(amount) {
  return ether(amount).times(ethPATRate);
}

module.exports.testEther = testEther;
module.exports.testRAX = testRAX;
