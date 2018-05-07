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

const RegisteredUsers = artifacts.require("./RegisteredUsers.sol");
const RAXToken = artifacts.require("./RAXToken.sol");
const RAXSale = artifacts.require("./RAXSale.sol");

contract('RAXSale', async function([owner, investor, wallet, purchaser, other, newWallet]) {
  before(async function() {
    //Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

  describe('deployment', function() {
    before(async function() {
      this.token = await RAXToken.deployed();
      this.crowdsale = await RAXSale.deployed();
    });

    it('the crowdsale contract should be token owner', async function () {
      const owner = await this.token.owner();
      owner.should.equal(this.crowdsale.address);
    });

    it("should have expected initial values", async function() {
      this.crowdsale.should.exist;
      (await this.crowdsale.token()).should.be.equal(this.token.address);
      (await this.crowdsale.weiRaised()).should.be.bignumber.equal(0);
    });

    it('should not be self-ownable', async function() {
      await this.crowdsale.transferOwnership(this.crowdsale.address).should.be.rejected;
    });
  });

  describe('time dependant', function() {
    const value = ether(10);

    before(async function () {
      let rate = 75000;
      this.startTime = latestTime() + duration.minutes(1);
      this.endTime = this.startTime + duration.hours(1);
      this.registeredUser = await RegisteredUsers.deployed();
      this.token = await RAXToken.new(this.registeredUser.address);
      this.crowdsale = await RAXSale.new(this.registeredUser.address, this.token.address, this.startTime, this.endTime, wallet, rate);
      this.afterEndTime = this.endTime + duration.seconds(1);
      const tokenOwner = await this.token.owner();
      await this.token.transferOwnership(this.crowdsale.address, {from: tokenOwner});
      await this.registeredUser.addRegisteredUser(investor).should.be.fulfilled;
      await this.registeredUser.addRegisteredUser(purchaser).should.be.fulfilled;
    });

    describe('before start', function () {
      it('should reject payments before start', async function () {
        await this.crowdsale.sendTransaction({from: investor, value: value}).should.be.rejectedWith(EVMThrow);
        await this.crowdsale.buyTokens(investor, {
            from: purchaser,
            value: value
        }).should.be.rejectedWith(EVMThrow);
      });

      it('finalize should fail when not ended', async function() {
          await this.crowdsale.finalize().should.be.rejected;
      });

      it('should report hasEnded as false', async function() {
        (await this.crowdsale.hasEnded()).should.be.equal(false);
      });
    });

    describe('after start', function () {
      before(async function () {
          await increaseTimeTo(this.startTime);
      });

      it('should accept payments after start (fallback)', async function () {
          await this.crowdsale.sendTransaction({from: investor, value: value}).should.be.fulfilled;
      });

      it('should accept payments after start (buyTokens)', async function () {
          await this.crowdsale.buyTokens(investor, {value: value, from: purchaser}).should.be.fulfilled;
      });

      it('finalize should fail when not ended', async function() {
          await this.crowdsale.finalize().should.be.rejected;
      });

      it('should report hasEnded as false', async function() {
          (await this.crowdsale.hasEnded()).should.be.equal(false);
      });
    });

    describe('after end', function () {
      before(async function () {
        await increaseTimeTo(this.afterEndTime);
      });

      it('should reject payments after end (fallback)', async function () {
        await this.crowdsale.sendTransaction({from: investor, value: value}).should.be.rejectedWith(EVMThrow);
      });

      it('should reject payments after end (buyTokens)', async function () {
        await this.crowdsale.buyTokens(investor, {value: value, from: purchaser}).should.be.rejectedWith(EVMThrow);
      });

      it('finalize transfers token ownership', async function() {
        (await this.token.owner()).should.be.equal(this.crowdsale.address);
        await this.crowdsale.finalize();
        (await this.token.owner()).should.be.equal((await this.crowdsale.owner()));
      });

      it('should report hasEnded as true', async function() {
        (await this.crowdsale.hasEnded()).should.be.equal(true);
      });
    });
  });

  describe('during sale', function() {
    const value = ether(10);
    const rate = 75000;
    var expectedTokenAmount = value.times(rate);

    beforeEach(async function() {
      this.startTime = latestTime() + duration.minutes(1);
      this.endTime = this.startTime + duration.hours(1);
      this.registeredUser = await RegisteredUsers.deployed();
      this.token = await RAXToken.new(this.registeredUser.address);
      this.crowdsale = await RAXSale.new(this.registeredUser.address, this.token.address,
                                    this.startTime, this.endTime, wallet, rate);
      this.afterEndTime = this.endTime + duration.seconds(1);
      const tokenOwner = await this.token.owner();
      await this.token.transferOwnership(this.crowdsale.address, {from: tokenOwner});
      await this.registeredUser.addRegisteredUser(investor).should.be.fulfilled;
      await this.registeredUser.addRegisteredUser(purchaser).should.be.fulfilled;
      await increaseTimeTo(this.startTime);
      this.pre = {
        "totalSupply": 0,
        "investorBalance": 0,
        "weiRaised": 0,
        "walletBalance": web3.eth.getBalance(wallet)
      };
    });

    describe('high-level purchase (fallback)', function () {
      beforeEach(async function() {
        this.txResult = await this.crowdsale.sendTransaction({value: value, from: investor});
        await advanceBlock();
      });

      it('should log purchase event', async function () {
        const {logs} = this.txResult;
        const event = logs.find(e => e.event === 'TokenPurchase');

        should.exist(event);
        event.args.purchaser.should.equal(investor);
        event.args.beneficiary.should.equal(investor);
        event.args.value.should.be.bignumber.equal(value);
        event.args.amount.should.be.bignumber.equal(expectedTokenAmount);
      });

      it('the investor should become a token holder after buying tokens', async function() {
        (await this.token.isHolder(investor)).should.be.equal(true);
      });

      it('should reject buying tokens from unregistered user', async function () {
        (await this.registeredUser.isUserRegistered(other)).should.be.equal(false);
        await this.crowdsale.sendTransaction({value: value, from: other}).should.be.rejected;
      });

      it('should reject under minimum amount (0.1 Ether)', async function() {
        var underMin = finney(100).minus(1);
        await this.crowdsale.sendTransaction({value: underMin, from: investor}).should.be.rejected;
      });

      it('totalSupply should be increased', async function () {
        const post = await this.token.totalSupply();
        post.minus(this.pre.totalSupply).should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should assign tokens to sender', async function () {
        const post = await this.token.balanceOf(investor);
        post.minus(this.pre.investorBalance).should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should forward funds to wallet', async function () {
        const post = web3.eth.getBalance(wallet);
        post.minus(this.pre.walletBalance).should.be.bignumber.equal(value);
      });

      it('weiRaised should be increased', async function() {
        const post = await this.crowdsale.weiRaised();
        post.minus(this.pre.weiRaised).should.be.bignumber.equal(value);
      });
    });

    describe('low-level purchase (buyTokens)', function () {
      beforeEach(async function() {
        this.txResult = await this.crowdsale.buyTokens(investor, {value: value, from: purchaser});
        await advanceBlock();
      });

      it('should log purchase event', async function () {
        const {logs} = this.txResult;
        const event = logs.find(e => e.event === 'TokenPurchase');

        should.exist(event);
        event.args.purchaser.should.equal(purchaser);
        event.args.beneficiary.should.equal(investor);
        event.args.value.should.be.bignumber.equal(value);
        event.args.amount.should.be.bignumber.equal(expectedTokenAmount);
      });

      it('buying tokens with an odd wei amount', async function () {
        await this.registeredUser.addRegisteredUser(other).should.be.fulfilled;
        var amount = 123456789000000000;
        await this.crowdsale.buyTokens(other, {value: amount, from: other});
        var tokens = await this.token.balanceOf(other);
        (Number(tokens)).should.be.equal(Number(amount*rate));
      });

      it('should reject under minimum amount (0.1 Ether)', async function() {
        var underMin = finney(100).minus(1);
        await this.crowdsale.buyTokens(investor, {value: underMin, from: investor}).should.be.rejected;
      });

      it('totalSupply should be increased', async function () {
        const post = await this.token.totalSupply();
        post.minus(this.pre.totalSupply).should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should assign tokens to beneficiary', async function () {
        const post = await this.token.balanceOf(investor);
        post.minus(this.pre.investorBalance).should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should forward funds to wallet', async function () {
        const post = web3.eth.getBalance(wallet);
        post.minus(this.pre.walletBalance).should.be.bignumber.equal(value);
      });

      it('weiRaised should be increased', async function() {
        const post = await this.crowdsale.weiRaised();
        post.minus(this.pre.weiRaised).should.be.bignumber.equal(value);
      });
    });

    describe('token max cap reached', function () {
      it('should return hasEnded() of true', async function() {
        // Using 66666.666 ether can buy 5 billion tokens = max cap.
        var amountETH = ether(66666.666);
        await this.crowdsale.buyTokens(investor, {value: amountETH, from: investor});
        var tokens = await this.token.balanceOf(investor);
        var remaining = await this.crowdsale.tokensRemaining();
        (await this.crowdsale.hasEnded()).should.be.equal(true);
        remaining.should.be.bignumber.equal(0);
      });

      it('should reject purchases that exceed max cap', async function() {
        var amountETH = ether(66666);
        await this.crowdsale.buyTokens(investor, {value: amountETH, from: investor}).should.be.fulfilled;
        await this.crowdsale.buyTokens(investor, {value: ether(1), from: investor}).should.be.rejected;
      });

      it('should hit max cap exactly', async function() {
        var amountETH = ether(66666);
        var remaining = await this.crowdsale.tokensRemaining();
        await this.crowdsale.buyTokens(investor, {value: amountETH, from: investor}).should.be.fulfilled;
        await this.crowdsale.buyTokens(investor, {value: ether(1), from: investor}).should.be.rejected;
        await this.crowdsale.buyTokens(investor, {value: ether(0.666), from: investor}).should.be.fulfilled;
        var remaining = await this.crowdsale.tokensRemaining();
        remaining.should.be.bignumber.equal(0);
      });

      it('should not leave orphans', async function() {
        // 66666.666 ether purchase should buy max cap tokens
        // and we expect the orphaned to be gifted to the last valid purchase
        var amountETH = ether(66666);
        await this.crowdsale.buyTokens(investor, {value: amountETH, from: investor}).should.be.fulfilled;
        var remaining = await this.crowdsale.tokensRemaining();
        var tokens1 = await this.token.balanceOf(purchaser);
        await this.crowdsale.buyTokens(purchaser, {value: ether(0.6), from: purchaser});
        var tokens2 = await this.token.balanceOf(purchaser);
        tokens2.should.be.bignumber.equal(tokens1.plus(remaining));
        remaining = await this.crowdsale.tokensRemaining();
        remaining.should.be.bignumber.equal(0);
        (await this.crowdsale.hasEnded()).should.be.equal(true);
      });

      it('should not over-gift orphans', async function() {
        // last purchase should not be gifted if the remaining tokens is greater than min purchase (0.1 Ether)
        var amountETH = ether(66666);
        await this.crowdsale.buyTokens(investor, {value: amountETH, from: investor}).should.be.fulfilled;
        await this.crowdsale.buyTokens(purchaser, {value: ether(0.5), from: purchaser}).should.be.fulfilled;
        (await this.crowdsale.hasEnded()).should.be.equal(false);
      });
    });

    describe('pause and unpause', function () {
      it('can buy tokens when unpause', async function() {
        await this.crowdsale.buyTokens(purchaser, {value: value, from: purchaser}).should.be.fulfilled;
      });

      it('should reject buying tokens when paused', async function() {
        await this.crowdsale.pause({from: owner}).should.be.fulfilled;
        await this.crowdsale.buyTokens(purchaser, {value: value, from: purchaser}).should.be.rejected;
      });

      it('can unpause after paused', async function() {
        await this.crowdsale.pause({from: owner}).should.be.fulfilled;
        await this.crowdsale.unpause({from: owner}).should.be.fulfilled;
        await this.crowdsale.buyTokens(purchaser, {value: value, from: purchaser}).should.be.fulfilled;
      });
    });

    describe('can change crowdsale wallet', function () {
      it('owner can set new wallet', async function() {
        await this.crowdsale.setWallet(newWallet, {from: owner}).should.be.fulfilled;
        var wallet = await this.crowdsale.wallet();
        wallet.should.be.equal(newWallet);
      });

      it('non-owner can not set new wallet', async function() {
        await this.crowdsale.setWallet(newWallet, {from: investor}).should.be.rejected;
      });

      it('funds should be forwarded to newly set wallet', async function() {
        var old1 = await web3.eth.getBalance(wallet);
        await this.crowdsale.setWallet(newWallet, {from: owner}).should.be.fulfilled;
        var new1 = await web3.eth.getBalance(newWallet);
        await this.crowdsale.buyTokens(purchaser, {value: value, from: purchaser}).should.be.fulfilled;
        var old2 = await web3.eth.getBalance(wallet);
        var new2 = await web3.eth.getBalance(newWallet);

        old2.should.be.bignumber.equal(old1);
        new2.should.be.bignumber.equal(new1.plus(value));
      });
    });
  });
});
