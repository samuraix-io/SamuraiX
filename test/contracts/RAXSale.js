import ether from './helpers/ether.js';
import finney from './helpers/finney.js';
import {advanceBlock} from './helpers/advanceToBlock';
import {increaseTimeTo, duration} from './helpers/increaseTime';
import latestTime from './helpers/latestTime';
import EVMThrow from './helpers/EVMThrow';

const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const bn = require('./helpers/bignumber.js');
const claimableEx = require("./ClaimableEx.js");
const owningToken = require("./CrowdsaleOwnsToken.js");
const reclaimTokens = require("./CanReclaimToken.js");

const RegisteredUsers = artifacts.require("./RegisteredUsers.sol");
const RAXToken = artifacts.require("./RAXToken.sol");
const RAXSale = artifacts.require("./RAXSale.sol");

contract('RAXSale', async function(accounts) {
  let maxCap = bn.tokens(5*(10**9)); // 5 billion tokens
  let ethRAXRate = 75000;
  let maxCapEth = bn.roundDown(maxCap.dividedBy(ethRAXRate));
  let minAmount = finney(100);
  let owner = accounts[0];
  let investor = accounts[1];
  let wallet = accounts[2];
  let purchaser = accounts[3];
  let other = accounts[4];
  let other1 = accounts[5];
  let newWallet = accounts[6];
  let startTime;
  let endTime;
  let afterEndTime;
  let regUsers;
  let token;
  let crowdsale;

  before(async function() {
    regUsers = await RegisteredUsers.deployed();
    await regUsers.addRegisteredUser(investor, false).should.be.fulfilled;
    await regUsers.addRegisteredUser(purchaser, false).should.be.fulfilled;
    await regUsers.addRegisteredUser(other, false).should.be.fulfilled;

    //Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

  beforeEach(async function () {
    crowdsale = await deployContract();
    const tokenOwner = await token.owner();
    await token.transferOwnership(crowdsale.address, {from: tokenOwner});
    await crowdsale.claimTokenOwnership();
  });

  describe('claimTokenOwnership()', function() {
    owningToken.check(accounts, deployCrowdsaleAndToken);
  });

  describe('deployment', function() {
    it('the crowdsale contract should be token owner', async function () {
      const owner = await token.owner();
      owner.should.equal(crowdsale.address);
    });

    it("should have expected initial values", async function() {
      crowdsale.should.exist;
      (await crowdsale.token()).should.be.equal(token.address);
      (await crowdsale.weiRaised()).should.be.bignumber.equal(0);
      (await crowdsale.tokensSold()).should.be.bignumber.equal(0);
      (await crowdsale.minPurchaseAmt()).should.be.bignumber.equal(minAmount);
      (await crowdsale.MAX_CAP()).should.be.bignumber.equal(maxCap);
      (await crowdsale.tokensRemaining()).should.be.bignumber.equal(maxCap);
    });

    it('should not be self-ownable', async function() {
      await crowdsale.transferOwnership(crowdsale.address).should.be.rejected;
    });

    it('non-owner should not change ownership', async function() {
      await crowdsale.transferOwnership(investor, {from: investor}).should.be.rejected;
      await crowdsale.transferOwnership(purchaser, {from: investor}).should.be.rejected;
    });

    it('should reject non-owner setting minimum purchase amount', async function() {
      await crowdsale.setMinPurchaseAmt(finney(1000), {from: investor}).should.be.rejected;
    });

    it('should allow to set minimum purchase amount', async function() {
      var minAmt = finney(1000);
      await crowdsale.setMinPurchaseAmt(minAmt).should.be.fulfilled;
      (await crowdsale.minPurchaseAmt()).should.be.bignumber.equal(minAmt);
    });
  });

  describe('ClaimableEx', function() {
      claimableEx.check(accounts, deployContract);
  });

  describe('CanReclaimToken', function() {
    reclaimTokens.check(RegisteredUsers, accounts, deployContract, deployToken);
  });

  describe('time dependant', function() {
    const value = ether(10);

    describe('before start', function () {
      it('should reject payments before start', async function () {
        await crowdsale.sendTransaction({from: investor, value: value}).should.be.rejectedWith(EVMThrow);
        await crowdsale.buyTokens(investor, {
            from: purchaser,
            value: value
        }).should.be.rejectedWith(EVMThrow);
      });

      it('should reject transfer token ownership when not ended', async function() {
          await crowdsale.tokenTransferOwnership(owner).should.be.rejected;
      });

      it('finalize should fail when not ended', async function() {
          await crowdsale.finalize().should.be.rejected;
      });

      it('should report hasEnded as false', async function() {
        (await crowdsale.hasEnded()).should.be.equal(false);
      });
    });

    describe('after start', function () {
      beforeEach(async function () {
          await increaseTimeTo(startTime);
      });

      it('should accept payments after start (fallback)', async function () {
          await crowdsale.sendTransaction({from: investor, value: value}).should.be.fulfilled;
      });

      it('should accept payments after start (buyTokens)', async function () {
          await crowdsale.buyTokens(investor, {value: value, from: purchaser}).should.be.fulfilled;
      });

      it('should reject transfer token ownership when not ended', async function() {
          await crowdsale.tokenTransferOwnership(owner).should.be.rejected;
      });

      it('finalize should fail when not ended', async function() {
          await crowdsale.finalize().should.be.rejected;
      });

      it('should report hasEnded as false', async function() {
          (await crowdsale.hasEnded()).should.be.equal(false);
      });
    });

    describe('after end', function () {
      var res;

      beforeEach(async function () {
        await increaseTimeTo(afterEndTime);
      });

      it('should reject payments after end (fallback)', async function () {
        await crowdsale.sendTransaction({from: investor, value: value}).should.be.rejectedWith(EVMThrow);
      });

      it('should reject payments after end (buyTokens)', async function () {
        await crowdsale.buyTokens(investor, {value: value, from: purchaser}).should.be.rejectedWith(EVMThrow);
      });

      it('non-owner can not transfer token ownership', async function() {
        await crowdsale.tokenTransferOwnership(owner, {from: investor}).should.be.rejected;
        await crowdsale.tokenTransferOwnership(owner, {from: purchaser}).should.be.rejected;
      });

      it('non-owner can not finalize', async function() {
        await crowdsale.finalize({from: investor}).should.be.rejected;
        await crowdsale.finalize({from: purchaser}).should.be.rejected;
      });

      it('finalize transfers token ownership', async function() {
        (await token.owner()).should.be.equal(crowdsale.address);
        res = await crowdsale.finalize();
        await token.claimOwnership().should.be.fulfilled;
        (await token.owner()).should.be.equal((await crowdsale.owner()));
      });

      it('should report hasEnded as true', async function() {
        (await crowdsale.hasEnded()).should.be.equal(true);
      });

      it('should log Closed event', async function() {
        const {logs} = res;
        const event = logs.find(e => e.event === 'Finalized');

        should.exist(event);
      });
    });
  });

  describe('during sale', function() {
    var value = ether(10);
    var expectedTokenAmount = value.times(ethRAXRate);
    var tokensRemainingBefore = maxCap;
    var pre;

    beforeEach(async function() {
      await increaseTimeTo(startTime);
      pre = {
        "totalSupply": 0,
        "tokensSold": 0,
        "investorBalance": 0,
        "weiRaised": 0,
        "walletBalance": web3.eth.getBalance(wallet)
      };
    });

    describe('high-level purchase (fallback)', function () {
      before(async function() {
        await advanceBlock();
      });

      it('should log purchase event', async function () {
        const {logs} = await crowdsale.sendTransaction({value: value, from: investor});
        const event = logs.find(e => e.event === 'TokenPurchase');

        should.exist(event);
        event.args.purchaser.should.equal(investor);
        event.args.beneficiary.should.equal(investor);
        event.args.value.should.be.bignumber.equal(value);
        event.args.amount.should.be.bignumber.equal(expectedTokenAmount);
      });

      it('buying tokens with an odd amount of ether', async function () {
        var amount = new BigNumber(1234567890000000000);
        var tokens1 = await token.balanceOf(other);
        await crowdsale.sendTransaction({value: amount, from: other});
        var tokens2 = await token.balanceOf(other);
        tokens2.should.be.bignumber.equal(tokens1.plus(amount.times(ethRAXRate)));
      });

      it('the investor should become a token holder after buying tokens', async function() {
        (await token.isHolder(investor)).should.be.equal(false);
        await crowdsale.sendTransaction({value: value, from: investor});
        (await token.isHolder(investor)).should.be.equal(true);
      });

      it('should reject buying tokens from unregistered user', async function () {
        (await regUsers.isUserRegistered(other1)).should.be.equal(false);
        await crowdsale.sendTransaction({value: value, from: other1}).should.be.rejected;
      });

      it('should reject under minimum amount (0.1 Ether)', async function() {
        var underMin = minAmount.minus(1);
        await crowdsale.sendTransaction({value: underMin, from: investor}).should.be.rejected;
      });

      it('totalSupply should be increased', async function () {
        await crowdsale.sendTransaction({value: value, from: investor});
        const post = await token.totalSupply();
        post.minus(pre.totalSupply).should.be.bignumber.equal(expectedTokenAmount);
      });

      it('tokensSold should be increased', async function () {
        await crowdsale.sendTransaction({value: value, from: investor});
        const post = await crowdsale.tokensSold();
        post.minus(pre.tokensSold).should.be.bignumber.equal(expectedTokenAmount);
      });

      it('tokensRemaining should be decreased', async function () {
        await crowdsale.sendTransaction({value: value, from: investor});
        const post = await crowdsale.tokensRemaining();
        tokensRemainingBefore.minus(post).should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should assign tokens to sender', async function () {
        await crowdsale.sendTransaction({value: value, from: investor});
        const post = await token.balanceOf(investor);
        post.minus(pre.investorBalance).should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should forward funds to wallet', async function () {
        await crowdsale.sendTransaction({value: value, from: investor});
        const post = web3.eth.getBalance(wallet);
        post.minus(pre.walletBalance).should.be.bignumber.equal(value);
      });

      it('weiRaised should be increased', async function() {
        await crowdsale.sendTransaction({value: value, from: investor});
        const post = await crowdsale.weiRaised();
        post.minus(pre.weiRaised).should.be.bignumber.equal(value);
      });
    });

    describe('low-level purchase (buyTokens)', function () {
      before(async function() {
        await advanceBlock();
      });

      it('should log purchase event', async function () {
        const {logs} = await crowdsale.buyTokens(investor, {value: value, from: purchaser});
        const event = logs.find(e => e.event === 'TokenPurchase');

        should.exist(event);
        event.args.purchaser.should.equal(purchaser);
        event.args.beneficiary.should.equal(investor);
        event.args.value.should.be.bignumber.equal(value);
        event.args.amount.should.be.bignumber.equal(expectedTokenAmount);
      });

      it('buying tokens with an odd amount of ether', async function () {
        var amount = new BigNumber(1234567890000000000);
        var tokens1 = await token.balanceOf(other);
        await crowdsale.buyTokens(other, {value: amount, from: other});
        var tokens2 = await token.balanceOf(other);
        tokens2.should.be.bignumber.equal(tokens1.plus(amount.times(ethRAXRate)));
      });

      it('the investor should become a token holder after buying tokens', async function() {
        (await token.isHolder(investor)).should.be.equal(false);
        await crowdsale.buyTokens(investor, {value: value, from: investor}).should.be.fulfilled;
        (await token.isHolder(investor)).should.be.equal(true);
      });

      it('should reject under minimum amount (0.1 Ether)', async function() {
        var underMin = minAmount.minus(1);
        await crowdsale.buyTokens(investor, {value: underMin, from: investor}).should.be.rejected;
      });

      it('should reject buying tokens from unregistered user', async function () {
        (await regUsers.isUserRegistered(other1)).should.be.equal(false);
        await crowdsale.buyTokens(other1, {value: value, from: other1}).should.be.rejected;
      });

      it('totalSupply should be increased', async function () {
        await crowdsale.buyTokens(investor, {value: value, from: purchaser})
        const post = await token.totalSupply();
        post.minus(pre.totalSupply).should.be.bignumber.equal(expectedTokenAmount);
      });

      it('tokensSold should be increased', async function () {
        await crowdsale.buyTokens(investor, {value: value, from: purchaser})
        const post = await crowdsale.tokensSold();
        post.minus(pre.tokensSold).should.be.bignumber.equal(expectedTokenAmount);
      });

      it('tokensRemaining should be decreased', async function () {
        await crowdsale.buyTokens(investor, {value: value, from: purchaser})
        const post = await crowdsale.tokensRemaining();
        tokensRemainingBefore.minus(post).should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should assign tokens to beneficiary', async function () {
        await crowdsale.buyTokens(investor, {value: value, from: purchaser})
        const post = await token.balanceOf(investor);
        post.minus(pre.investorBalance).should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should forward funds to wallet', async function () {
        await crowdsale.buyTokens(investor, {value: value, from: purchaser})
        const post = web3.eth.getBalance(wallet);
        post.minus(pre.walletBalance).should.be.bignumber.equal(value);
      });

      it('weiRaised should be increased', async function() {
        await crowdsale.buyTokens(investor, {value: value, from: purchaser})
        const post = await crowdsale.weiRaised();
        post.minus(pre.weiRaised).should.be.bignumber.equal(value);
      });
    });

    describe('token max cap reached', function () {
      it('should return hasEnded() of true', async function() {
        // Using maxCapEth ether can buy 5 billion tokens = max cap.
        await crowdsale.buyTokens(investor, {value: maxCapEth, from: investor});
        var remaining = await crowdsale.tokensRemaining();
        (await crowdsale.hasEnded()).should.be.equal(true);
        remaining.should.be.bignumber.equal(0);
      });

      it('should reject purchases that exceed max cap (buyTokens)', async function() {
        await crowdsale.buyTokens(investor, {value: maxCapEth.plus(ether(0.01)), from: investor}).should.be.rejected;

        await crowdsale.buyTokens(investor, {value: maxCapEth.minus(ether(0.1)), from: investor}).should.be.fulfilled;
        await crowdsale.buyTokens(investor, {value: ether(1), from: investor}).should.be.rejected;
      });

      it('should reject purchases that exceed max cap (fallback)', async function() {
        await crowdsale.sendTransaction({value: maxCapEth.plus(ether(0.01)), from: investor}).should.be.rejected;

        await crowdsale.sendTransaction({value: maxCapEth.minus(ether(0.1)), from: investor}).should.be.fulfilled;
        await crowdsale.sendTransaction({value: ether(1), from: investor}).should.be.rejected;
      });

      it('should hit max cap exactly', async function() {
        await crowdsale.buyTokens(investor, {value: maxCapEth.minus(ether(1)), from: investor}).should.be.fulfilled;
        await crowdsale.sendTransaction({value: ether(0.8), from: investor}).should.be.fulfilled;

        await crowdsale.sendTransaction({value: ether(0.3), from: investor}).should.be.rejected;
        await crowdsale.buyTokens(investor, {value: ether(0.3), from: investor}).should.be.rejected;

        await crowdsale.buyTokens(investor, {value: ether(0.1), from: investor}).should.be.fulfilled;
        await crowdsale.sendTransaction({value: ether(0.1), from: investor}).should.be.fulfilled;
        var remaining = await crowdsale.tokensRemaining();
        remaining.should.be.bignumber.equal(0);
      });

      it('should not leave orphans', async function() {
        // maxCapEth ether purchase should buy max cap tokens
        // and we expect the orphaned to be gifted to the last valid purchase
        await crowdsale.buyTokens(investor, {value: maxCapEth.minus(ether(0.6)), from: investor}).should.be.fulfilled;
        var remaining = await crowdsale.tokensRemaining();
        var tokens1 = await token.balanceOf(purchaser);
        await crowdsale.buyTokens(purchaser, {value: ether(0.6), from: purchaser});
        var tokens2 = await token.balanceOf(purchaser);
        tokens2.should.be.bignumber.equal(tokens1.plus(remaining));
        remaining = await crowdsale.tokensRemaining();
        remaining.should.be.bignumber.equal(0);
        (await crowdsale.hasEnded()).should.be.equal(true);
      });

      it('should not over-gift orphans', async function() {
        // last purchase should not be gifted if the remaining tokens is greater than min purchase (0.1 Ether)
        await crowdsale.buyTokens(investor, {value: maxCapEth.minus(ether(0.6)), from: investor}).should.be.fulfilled;
        await crowdsale.buyTokens(purchaser, {value: ether(0.5), from: purchaser}).should.be.fulfilled;
        (await crowdsale.tokensRemaining()).should.be.bignumber.gt(0);
        (await crowdsale.hasEnded()).should.be.equal(false);
      });
    });

    describe('pause and unpause', function () {
      it('can buy tokens when unpause', async function() {
        await crowdsale.buyTokens(purchaser, {value: value, from: purchaser}).should.be.fulfilled;
      });

      it('non-owner can not invoke pause()', async function() {
        await crowdsale.pause({from: purchaser}).should.be.rejected;
        await crowdsale.pause({from: investor}).should.be.rejected;
      });

      it('should reject buying tokens when paused', async function() {
        await crowdsale.pause({from: owner}).should.be.fulfilled;
        await crowdsale.buyTokens(purchaser, {value: value, from: purchaser}).should.be.rejected;
      });

      it('non-owner can not invoke unpause()', async function() {
        await crowdsale.unpause({from: purchaser}).should.be.rejected;
        await crowdsale.unpause({from: investor}).should.be.rejected;
      });

      it('can unpause after paused', async function() {
        await crowdsale.pause({from: owner}).should.be.fulfilled;
        await crowdsale.unpause({from: owner}).should.be.fulfilled;
        await crowdsale.buyTokens(purchaser, {value: value, from: purchaser}).should.be.fulfilled;
      });
    });

    describe('can change crowdsale wallet', function () {
      it('owner can set new wallet', async function() {
        await crowdsale.setWallet(newWallet, {from: owner}).should.be.fulfilled;
        var wallet = await crowdsale.wallet();
        wallet.should.be.equal(newWallet);
      });

      it('non-owner can not set new wallet', async function() {
        await crowdsale.setWallet(newWallet, {from: investor}).should.be.rejected;
      });

      it('funds should be forwarded to newly set wallet', async function() {
        var old1 = await web3.eth.getBalance(wallet);
        await crowdsale.setWallet(newWallet, {from: owner}).should.be.fulfilled;
        var new1 = await web3.eth.getBalance(newWallet);
        await crowdsale.buyTokens(purchaser, {value: value, from: purchaser}).should.be.fulfilled;
        var old2 = await web3.eth.getBalance(wallet);
        var new2 = await web3.eth.getBalance(newWallet);

        old2.should.be.bignumber.equal(old1);
        new2.should.be.bignumber.equal(new1.plus(value));
      });
    });
  });

  async function deployToken(registeredUsers) {
    return await RAXToken.new(registeredUsers.address);
  }

  async function deployContract() {
    token = await deployToken(regUsers);
    startTime = latestTime() + duration.minutes(1);
    endTime = startTime + duration.hours(1);
    afterEndTime = endTime + duration.seconds(1);

    return await RAXSale.new(regUsers.address, token.address, startTime, endTime, wallet, ethRAXRate);
  }

  async function deployCrowdsaleAndToken() {
    token = await deployToken(regUsers);
    startTime = latestTime() + duration.minutes(1);
    endTime = startTime + duration.hours(1);
    afterEndTime = endTime + duration.seconds(1);

    crowdsale = await RAXSale.new(regUsers.address, token.address, startTime, endTime, wallet, ethRAXRate);

    var ret = [crowdsale, token];
    return ret;
  }
});
