import ether from './helpers/ether.js';

const BigNumber = web3.BigNumber;
const bn = require('./helpers/bignumber.js');
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

let ethRAXRate = 75000;
let ethPATRate = 75000;

function testRAX(RegisteredUsers, DistributeRAX, accounts, managers, deployToken, deployRAXToken) {
  let token;
  let raxToken;
  let registeredUsers;
  let distributeRAX;
  let overwrite = true;
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

    distributeRAX = await DistributeRAX.new(registeredUsers.address, raxToken.address, {overwrite: overwrite}).should.be.fulfilled;
  });

  describe('distribute profit \n', function() {
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
  });
}

function ethToRAX(amount) {
  return ether(amount).times(ethRAXRate);
}

function ethToPAT(amount) {
  return ether(amount).times(ethPATRate);
}

//module.exports.testEther = testEther;
module.exports.testRAX = testRAX;
