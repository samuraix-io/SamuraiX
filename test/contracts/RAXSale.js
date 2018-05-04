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
//const PreSaleMock = artifacts.require('./helpers/PreSaleMock.sol');

contract('RAXSale', async function([_, investor, wallet, purchaser, other]) {
  before(async function() {
    //Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock()
  });

  describe('deployment', function() {
    before(async function() {
      this.token = await RAXToken.deployed();
      this.crowdsale = await RAXSale.deployed();
    });
    it('should be token owner', async function () {
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
    //const value = ether(100);
    const value = ether(10);

    before(async function () {
      let rate = 75000;
      this.startTime = latestTime() + duration.minutes(1);
      this.endTime = this.startTime + duration.hours(1);
      this.registered_user = await RegisteredUsers.deployed();
      this.token = await RAXToken.new(this.registered_user.address);
      this.crowdsale = await RAXSale.new(this.registered_user.address, this.token.address, this.startTime, this.endTime, wallet, rate);
      this.afterEndTime = this.endTime + duration.seconds(1);
      const token_owner = await this.token.owner();
      await this.token.transferOwnership(this.crowdsale.address, {from: token_owner});
      await this.registered_user.addRegisteredUser(investor).should.be.fulfilled;
      await this.registered_user.addRegisteredUser(purchaser).should.be.fulfilled;
    });

    describe('before start', function () {
      it('should reject payments before start', async function () {
        //console.log("before send(value) = " + value);
        await this.crowdsale.send(value).should.be.rejectedWith(EVMThrow);
        //console.log("before buyTokens");
        await this.crowdsale.buyTokens(investor, {
            from: purchaser,
            value: value
        }).should.be.rejectedWith(EVMThrow);
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
      it('finalize should raise when not ended', async function() {
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
    //const value = ether(100);
    const value = ether(10);
    //const expectedTokenAmount = value.times(280); // lowest exchange rate from white paper for 100 eth purchase
    const expectedTokenAmount = value.times(75000); // lowest exchange rate from white paper for 10 eth purchase

    beforeEach(async function() {
      let rate = 75000;
      this.startTime = latestTime() + duration.minutes(1);
      this.endTime = this.startTime + duration.hours(1);
      this.registered_user = await RegisteredUsers.deployed();
      this.token = await RAXToken.new(this.registered_user.address);
      this.crowdsale = await RAXSale.new(this.registered_user.address, this.token.address,
                                    this.startTime, this.endTime, wallet, rate);
      this.afterEndTime = this.endTime + duration.seconds(1);
      const token_owner = await this.token.owner();
      await this.token.transferOwnership(this.crowdsale.address, {from: token_owner});
      await this.registered_user.addRegisteredUser(investor).should.be.fulfilled;
      await this.registered_user.addRegisteredUser(purchaser).should.be.fulfilled;
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
        this.tx_result = await this.crowdsale.sendTransaction({value: value, from: investor});
        await advanceBlock();
      });

      it('should log purchase', async function () {
        const {logs} = this.tx_result;

        const event = logs.find(e => e.event === 'TokenPurchase');

        should.exist(event);
        event.args.purchaser.should.equal(investor);
        event.args.beneficiary.should.equal(investor);
        event.args.value.should.be.bignumber.equal(value);
        event.args.amount.should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should reject buy tokens when not user registed', async function () {
        await this.crowdsale.sendTransaction({value: value, from: other}).should.be.rejected;
      });

      it('should increase totalSupply', async function () {
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

      it('should increase weiRaised', async function() {
        const post = await this.crowdsale.weiRaised();
        post.minus(this.pre.weiRaised).should.be.bignumber.equal(value);
      });
    });

    describe('low-level purchase (buyTokens)', function () {
      var eth = ether(0.1);
      const expectedTokenAmount = value.times(750); // 0.1 ether
      beforeEach(async function() {
        var eth = ether(0.1);
        this.tx_result = await this.crowdsale.buyTokens(investor, {value: eth, from: purchaser});
        await advanceBlock();
      });

      it('should log purchase', async function () {
          const {logs} = this.tx_result;

        const event = logs.find(e => e.event === 'TokenPurchase');

        should.exist(event);
        event.args.purchaser.should.equal(purchaser);
        event.args.beneficiary.should.equal(investor);
        event.args.value.should.be.bignumber.equal(eth);
        event.args.amount.should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should fulfille buyTokens with amount ether odd', async function () {
        var purchaser2 = "0x28a8746e75304c0780e011bed21c72cd78cd535e";
        await this.registered_user.addRegisteredUser(purchaser2).should.be.fulfilled;
        var amount = 123456789000000000;
        var rate = 75000;
        await this.crowdsale.buyTokens(purchaser2, {value: amount, from: purchaser2});
        var patTokens = await this.token.balanceOf(purchaser2);
        (Number(patTokens)).should.be.equal(Number(amount*rate));
      });

      it('should increase totalSupply', async function () {
        const post = await this.token.totalSupply();
        post.minus(this.pre.totalSupply).should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should assign tokens to beneficiary', async function () {
        const post = await this.token.balanceOf(investor);
        post.minus(this.pre.investorBalance).should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should forward funds to wallet', async function () {
        const post = web3.eth.getBalance(wallet);
        post.minus(this.pre.walletBalance).should.be.bignumber.equal(eth);
      });

      it('should increase weiRaised', async function() {
        const post = await this.crowdsale.weiRaised();
        post.minus(this.pre.weiRaised).should.be.bignumber.equal(eth);
      });
    });

    describe('variable token exchange rates', function() {
      const validateRate = async function(crowdsale, value, expectedRate) {
        const expectedTokenAmount = value.times(expectedRate);
        let {logs} = await crowdsale.buyTokens(investor, {value: value, from: investor});
        // console.dir(logs, {depth: 5});
        const event = logs.find(e => e.event === 'TokenPurchase');
        should.exist(event);
        event.args.value.should.be.bignumber.equal(value);
        event.args.amount.should.be.bignumber.equal(expectedTokenAmount);
      };
      it('should be rate 75000', async function() {
        // 780..26,000 tokens
        const rate = 75000;
        await validateRate(this.crowdsale, ether(10).minus(1), rate);
      });
      it('should reject when under 0.1 Ether', async function() {
        const value = finney(100).minus(1);
        await this.crowdsale.buyTokens(investor, {value: value, from: investor}).should.be.rejected;
      });
    });

    describe('token cap reached', function () {
      it('should return hasEnded() of true', async function() {
        let amountETH = ether(66666.666);
        await this.crowdsale.buyTokens(investor, {value: amountETH, from: investor});
        var tokens = await this.token.balanceOf(investor);
        var remaining = await this.crowdsale.tokensRemaining();
        (await this.crowdsale.hasEnded()).should.be.equal(true);
        remaining.should.be.bignumber.equal(0);
      });

      it('should reject purchases that exceed cap', async function() {
        let amountETH = ether(66666);
        var remaining = await this.crowdsale.tokensRemaining();
        await this.crowdsale.buyTokens(investor, {value: amountETH, from: investor});
        await this.crowdsale.buyTokens(investor, {value: ether(1), from: investor}).should.be.rejected;
      });

      it('should hit cap exactly', async function() {
        let amountETH = ether(66666);
        var remaining = await this.crowdsale.tokensRemaining();
        await this.crowdsale.buyTokens(investor, {value: amountETH, from: investor});
        await this.crowdsale.buyTokens(investor, {value: ether(1), from: investor}).should.be.rejected;
        await this.crowdsale.buyTokens(investor, {value: ether(0.666), from: investor}).should.be.fulfilled;
        var remaining = await this.crowdsale.tokensRemaining();
        remaining.should.be.bignumber.equal(0);
      });

      it('should not leave orphans', async function() {
        // 1 ether purchase should buy 75000 tokens
        // and we expect the orphaned 7000 to be gifted to this purchase
        let amountETH = ether(66665);
        await this.crowdsale.buyTokens(investor, {value: amountETH, from: investor});
        await this.crowdsale.buyTokens(purchaser, {value: ether(1.6), from: purchaser});
        var tokens = await this.token.balanceOf(investor);
        var remaining = await this.crowdsale.tokensRemaining();
        (await this.crowdsale.hasEnded()).should.be.equal(true);
        remaining.should.be.bignumber.equal(0);
      });

      it('should not over-gift orphans', async function() {
        // 0.1 ether purchase should buy only 7500 tokens
        let amountETH = ether(66665);
        await this.crowdsale.buyTokens(investor, {value: amountETH, from: investor});
        await this.crowdsale.buyTokens(purchaser, {value: ether(1), from: purchaser});
        (await this.crowdsale.hasEnded()).should.be.equal(false);
      });
    });

    describe('pause and unpause', function () {
      var owner = '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1';
      const valueETH = ether(10);
      it('should fulfille buy tokens when unpause', async function() {
        await this.crowdsale.buyTokens(purchaser, {value: valueETH, from: purchaser}).should.be.fulfilled;
      });

      it('should reject buy tokens when pause', async function() {
        await this.crowdsale.pause({from: owner}).should.be.fulfilled;
        await this.crowdsale.buyTokens(purchaser, {value: valueETH, from: purchaser}).should.be.rejected;
      });

      it('should can unpause Token after pause', async function() {
        await this.crowdsale.pause({from: owner}).should.be.fulfilled;
        await this.crowdsale.unpause({from: owner}).should.be.fulfilled;
        await this.crowdsale.buyTokens(purchaser, {value: valueETH, from: purchaser}).should.be.fulfilled;
      });
    });

    describe('change wallet', function () {
      var owner = '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1';
      var newWallet = '0x3e5e9111ae8eb78fe1cc3bb8915d5d461f3ef9a9';
      it('should fulfille when owner set new wallet', async function() {
        await this.crowdsale.setWallet(newWallet, {from: owner}).should.be.fulfilled;
        var wallet = await this.crowdsale.wallet();
        wallet.should.be.equal(newWallet);
      });

      it('should rejecte when not owner set new wallet', async function() {
        await this.crowdsale.setWallet(newWallet, {from: investor}).should.be.rejected;
      });
    });
  });
});
