import ether from './helpers/ether.js';
import finney from './helpers/finney.js';
import {advanceBlock} from './helpers/advanceToBlock';
import {increaseTimeTo, duration} from './helpers/increaseTime';
import latestTime from './helpers/latestTime';
import EVMThrow from './helpers/EVMThrow';

const sleep = require('system-sleep');
const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const bn = require('./helpers/bignumber.js');

const RegisteredUsers = artifacts.require("./RegisteredUsers.sol");
const PATToken = artifacts.require("./PATToken.sol");
const RAXToken = artifacts.require("./RAXToken.sol");
const PATSale = artifacts.require("./PATSale.sol");
const ManageListingFee = artifacts.require("./ManageListingFee.sol");
const ManageReserveFunds = artifacts.require("./ManageReserveFunds.sol");

contract('PATSale', async function([owner, manager1, wallet, investor, purchaser, other, manager2, purchaser2, newWallet, samuraiXWallet]) {
  const id = 4;
  let fixedLinkDoc = 'https://drive.google.com/open?id=1JYpdAqubjvHvUuurwX7om0dDcA5ycRhc';
  let fixedHashDoc = '323202411a8393971877e50045576ed7';
  let varLinkDoc = 'https://drive.google.com/open?id=1ZaFg2XtGdTwnkvaj-Kra4cRW_ia6tvBY';
  let varHashDoc = '743f5d72288889e94c076f8b21e07168';
  let listingFeeRate = 5;  // %
  let reserveFundRate = 20;  // %
  let name = 'PAT_4';
  let symbol = 'PAT';
  let minCap = bn.tokens(50*(10**6));
  let maxCap = bn.tokens(75*(10**6));
  let ethPATRate = 75000;
  let ethRAXRate = 75000;
  let managers = [manager1, manager2];
  let ethMinCap = minCap.dividedBy(ethPATRate).round(0, BigNumber.ROUND_HALF_UP);
  let ethMaxCap = maxCap.dividedBy(ethPATRate).round(0, BigNumber.ROUND_HALF_UP);
  let minAmount = finney(100);

  beforeEach(async function () {
    await advanceBlock();

    this.startTime = latestTime() + duration.minutes(1);
    this.endTime = this.startTime + duration.hours(1);
    this.registeredUser = await RegisteredUsers.new();
    this.manageListingFee = await ManageListingFee.deployed();
    this.manageReserveFunds = await ManageReserveFunds.deployed();
    this.raxToken = await RAXToken.new(this.registeredUser.address);
    await this.registeredUser.addRegisteredUser(investor, false);
    await this.registeredUser.addRegisteredUser(purchaser, false);
    await this.registeredUser.addRegisteredUser(purchaser2, false );
    await this.registeredUser.addRegisteredUser(wallet, false);
    await this.registeredUser.addRegisteredUser(newWallet, false);

    this.token = await PATToken.new(this.registeredUser.address, id,
                                managers, name, symbol, fixedLinkDoc,
                                fixedHashDoc, varLinkDoc, varHashDoc);
    this.crowdsale = await PATSale.new(this.registeredUser.address, this.raxToken.address,
                                      this.token.address, this.manageListingFee.address,
                                      this.manageReserveFunds.address, this.startTime,
                                      this.endTime, wallet, minCap, maxCap, ethPATRate,
                                      ethRAXRate, listingFeeRate, reserveFundRate);

    this.afterEndTime = this.endTime + duration.seconds(1);
    const tokenOwner = await this.token.owner();
    await this.token.transferOwnership(this.crowdsale.address, {from: tokenOwner});
    this.vaultAddress = await this.crowdsale.getVaultAddress();
    await this.registeredUser.addRegisteredUser(this.vaultAddress, true);
  });

  describe('deployment', function() {
    before(async function() {
      this.token = await PATToken.deployed();
      this.crowdsale = await PATSale.deployed();
    });

    it('the crowdsale contract should be token owner', async function () {
      const owner = await this.token.owner();
      owner.should.equal(this.crowdsale.address);
    });

    it("should have expected initial values", async function() {
      this.crowdsale.should.exist;
      (await this.crowdsale.token()).should.be.equal(this.token.address);
      (await this.crowdsale.weiRaised()).should.be.bignumber.equal(0);
      (await this.crowdsale.tokensSold()).should.be.bignumber.equal(0);
      (await this.crowdsale.minPurchaseAmt()).should.be.bignumber.equal(minAmount);
      (await this.crowdsale.maxCap()).should.be.bignumber.equal(maxCap);
      (await this.crowdsale.tokensRemaining()).should.be.bignumber.equal(maxCap);
  });

    it('should not be self-ownable', async function() {
      await this.crowdsale.transferOwnership(this.crowdsale.address).should.be.rejected;
    });

    it('should reject deploying PATSale with invalid rates parameters', async function() {
      // saleRate = maxCap / totalTokens = 75 (%)
      var _listingFeeRate = 5;
      var _reserveFundRate = 15;
      // sum = saleRate + listingFeeRate + reserveFundRate = 95 (%)
      this.startTime = latestTime() + duration.minutes(1);
      this.endTime = this.startTime + duration.hours(1);
      this.registeredUser = await RegisteredUsers.deployed();
      this.manageListingFee = await ManageListingFee.deployed();
      this.manageReserveFunds = await ManageReserveFunds.deployed();
      this.raxToken = await RAXToken.new(this.registeredUser.address);

      this.token = await PATToken.new(this.registeredUser.address, id, managers, name,
                                      symbol, fixedLinkDoc, fixedHashDoc, varLinkDoc,
                                      varHashDoc);
      this.crowdsale = await PATSale.new(this.registeredUser.address, this.raxToken.address,
                                        this.token.address, this.manageListingFee.address,
                                        this.manageReserveFunds.address, this.startTime,
                                        this.endTime, wallet, minCap, maxCap, ethPATRate,
                                        ethRAXRate, _listingFeeRate, _reserveFundRate).should.be.rejected;
    });
  });

  describe('time dependant', function() {
    var value = ether(10);
    var amountRAX = value.times(ethRAXRate);

    describe('before start', function () {
      it('should reject payments before start', async function () {
        await this.crowdsale.sendTransaction({value: value, from: investor}).should.be.rejectedWith(EVMThrow);
        await this.crowdsale.buyTokensUsingEther(investor, {
            from: purchaser,
            value: value
        }).should.be.rejectedWith(EVMThrow);
      });

      it('should reject payments before start (buyTokensUsingRaxApprove)', async function() {
        await this.raxToken.mint(purchaser, amountRAX, {from: owner}).should.be.fulfilled;
        await this.raxToken.approve(this.crowdsale.address, amountRAX, {from: purchaser}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser, {from: purchaser}).should.be.rejected;
      });

      it('should reject payments before start (buyTokensUsingRaxTransfer)', async function() {
        await this.raxToken.mint(this.crowdsale.address, amountRAX, {from: owner}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxTransfer(purchaser, amountRAX, {from: owner}).should.be.rejected;
      });

      it('finalize should fail when not ended', async function() {
          await this.crowdsale.finalize().should.be.rejected;
      });

      it('should report hasClosed as false', async function() {
        (await this.crowdsale.hasClosed()).should.be.equal(false);
      });
    });

    describe('after start', function () {
      beforeEach(async function () {
          await increaseTimeTo(this.startTime);
      });

      it ('should not accept payments from unregistered user', async function () {
        await this.crowdsale.sendTransaction({from: other, value: value}).should.be.rejected;
      });

      it('should accept payments after start (fallback)', async function () {
        await this.crowdsale.sendTransaction({from: investor, value : value}).should.be.fulfilled;
      });

      it('should accept payments after start (buyTokensUsingEther)', async function () {
        await this.crowdsale.buyTokensUsingEther(investor, {value: value, from: purchaser}).should.be.fulfilled;
      });

      it('should accept payments after start (buyTokensUsingRaxApprove)', async function() {
        await this.raxToken.mint(purchaser, amountRAX, {from: owner}).should.be.fulfilled;
        await this.raxToken.approve(this.crowdsale.address, amountRAX, {from: purchaser}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser, {from: purchaser}).should.be.fulfilled;
      });

      it('should accept payments after start (buyTokensUsingRaxTransfer)', async function() {
        await this.raxToken.mint(this.crowdsale.address, amountRAX, {from: owner}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxTransfer(purchaser, amountRAX, {from: owner}).should.be.fulfilled;
      });

      it('finalize should fail when not ended', async function() {
        await this.crowdsale.finalize().should.be.rejected;
      });

      it('should report hasEnded as false', async function() {
        (await this.crowdsale.hasClosed()).should.be.equal(false);
      });
    });

    describe('after end', function () {
      var value = ether(10);
      var option = {
        fromBlock: 0,
        toBlock: 'latest',
        address: this.vaultAddress,
        topics: []
      };

      beforeEach(async function () {
        await increaseTimeTo(this.startTime);
      });

      it('should reject payments after end (fallback)', async function () {
        await increaseTimeTo(this.afterEndTime);
        await this.crowdsale.sendTransaction({from: investor, value : value}).should.be.rejectedWith(EVMThrow);
      });

      it('should reject payments after end (buyTokensUsingEther)', async function () {
        await increaseTimeTo(this.afterEndTime);
        await this.crowdsale.buyTokensUsingEther(investor, {value: value, from: purchaser}).should.be.rejectedWith(EVMThrow);
      });

      it('should reject payments after end (buyTokensUsingRaxApprove)', async function() {
        await this.raxToken.mint(purchaser, amountRAX, {from: owner}).should.be.fulfilled;
        await this.raxToken.approve(this.crowdsale.address, amountRAX, {from: purchaser}).should.be.fulfilled;
        await increaseTimeTo(this.afterEndTime);
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser, {from: purchaser}).should.be.rejected;
      });

      it('should reject payments after end (buyTokensUsingRaxTransfer)', async function() {
        await this.raxToken.mint(this.crowdsale.address, amountRAX, {from: owner}).should.be.fulfilled;
        await increaseTimeTo(this.afterEndTime);
        await this.crowdsale.buyTokensUsingRaxTransfer(purchaser, amountRAX, {from: owner}).should.be.rejected;
      });

      it('finalize transfers token ownership', async function() {
        await increaseTimeTo(this.afterEndTime);
        (await this.token.owner()).should.be.equal(this.crowdsale.address);
        await this.crowdsale.finalize().should.be.fulfilled;
        (await this.token.owner()).should.be.equal((await this.crowdsale.owner()));
      });

      it('should report hasEnded as true', async function() {
        await increaseTimeTo(this.afterEndTime);
        (await this.crowdsale.hasClosed()).should.be.equal(true);
      });

      it('should refund when crowdsale fails (claimRefund)', async function() {
        await this.crowdsale.buyTokensUsingEther(purchaser2, {value: value, from: purchaser2});
        var balance1 = await web3.eth.getBalance(purchaser2);

        await this.raxToken.mint(purchaser2, amountRAX, {from: owner}).should.be.fulfilled;
        await this.raxToken.approve(this.crowdsale.address, amountRAX, {from: purchaser2}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2});
        var tokens1 = await this.raxToken.balanceOf(purchaser2);

        await increaseTimeTo(this.afterEndTime);
        await this.crowdsale.finalize({from: owner}).should.be.fulfilled;
        await this.crowdsale.claimRefund({from: purchaser2}).should.be.fulfilled;
        var balance2 = await web3.eth.getBalance(purchaser2);
        var tokens2 = await this.raxToken.balanceOf(purchaser2);

        balance2.should.be.bignumber.gt(balance1.plus(value.minus(ether(0.01)))); // cost gas
        tokens2.should.be.bignumber.equal(tokens1.plus(amountRAX));
      });

      it('should refund when crowdsale fails (refund)', async function() {
        await this.crowdsale.buyTokensUsingEther(purchaser2, {value: value, from: purchaser2});
        await this.raxToken.mint(purchaser2, amountRAX, {from: owner}).should.be.fulfilled;
        await this.raxToken.approve(this.crowdsale.address, amountRAX, {from: purchaser2}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2});
        var balance1 = await web3.eth.getBalance(purchaser2);
        var tokens1 = await this.raxToken.balanceOf(purchaser2);

        await increaseTimeTo(this.afterEndTime);
        await this.crowdsale.finalize({from: owner}).should.be.fulfilled;
        await this.crowdsale.refund(purchaser2, {from: owner}).should.be.fulfilled;
        var balance2 = await web3.eth.getBalance(purchaser2);
        var tokens2 = await this.raxToken.balanceOf(purchaser2);

        tokens2.should.be.bignumber.equal(tokens1.plus(amountRAX));
        balance2.should.be.bignumber.equal(balance1.plus(value));
      });

      it('should logs Finalized and RefundsEnabled (if necessary) events', async function() {
        await increaseTimeTo(this.afterEndTime);

        var res = await this.crowdsale.finalize({from: owner}).should.be.fulfilled;
        const {logs} = res;
        const event = logs.find(e => e.event === 'Finalized');
        should.exist(event);

        var hashRefundsEnabled = web3.sha3('RefundsEnabled()');
        option.topics = [hashRefundsEnabled];
        await web3.eth.filter(option).get(function (err, result) {
          var event = result[0];
          var topics = event['topics'];
          topics[0].should.be.equal(hashRefundsEnabled);
        });
      });

      it('should logs Refunded and RAXRefunded event', async function() {
        await this.crowdsale.buyTokensUsingEther(purchaser2, {value: value, from: purchaser2});

        await this.raxToken.mint(purchaser2, amountRAX, {from: owner}).should.be.fulfilled;
        await this.raxToken.approve(this.crowdsale.address, amountRAX, {from: purchaser2}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2});
        var tokens1 = await this.raxToken.balanceOf(purchaser2);

        await increaseTimeTo(this.afterEndTime);
        await this.crowdsale.finalize({from: owner}).should.be.fulfilled;

        var balance1 = await web3.eth.getBalance(purchaser2);
        await this.crowdsale.claimRefund({from: purchaser2}).should.be.fulfilled;
        var balance2 = await web3.eth.getBalance(purchaser2);
        var tokens2 = await this.raxToken.balanceOf(purchaser2);

        balance2.should.be.bignumber.gt(balance1.plus(value.minus(ether(0.01)))); // cost gas
        tokens2.should.be.bignumber.equal(tokens1.plus(amountRAX));

        var hashRefunded = web3.sha3('Refunded(address,uint256)');
        var hashRAXRefunded = web3.sha3('RAXRefunded(address,uint256)');
        option.topics = [hashRefunded];
        await web3.eth.filter(option).get(function (err, result) {
          var event = result[0];
          var topics = event['topics'];
          topics[0].should.be.equal(hashRefunded);
        });

        option.topics = [hashRAXRefunded];
        await web3.eth.filter(option).get(function (err, result) {
          var event = result[0];
          var topics = event['topics'];
          topics[0].should.be.equal(hashRAXRefunded);
        });
      });

      it('non-investor can not earn money when calling refund', async function() {
        await this.crowdsale.buyTokensUsingEther(investor, {value: value, from: investor});
        var investorBalance1 = await web3.eth.getBalance(investor);
        await increaseTimeTo(this.afterEndTime);

        await this.crowdsale.finalize({from: owner}).should.be.fulfilled;

        var balance1 = await web3.eth.getBalance(purchaser2);
        await this.crowdsale.refund(purchaser2, {from: purchaser2}).should.be.fulfilled;
        var investorBalance2 = await web3.eth.getBalance(investor);
        var balance2 = await web3.eth.getBalance(purchaser2);

        balance2.should.be.bignumber.lt(balance1); // cost gas
        investorBalance2.should.be.bignumber.equal(investorBalance1);
      });

      it('should logs Closed event when crowdsale succeed', async function() {
        await this.crowdsale.buyTokensUsingEther(purchaser2, {value: ethMaxCap, from: purchaser2});
        await increaseTimeTo(this.afterEndTime);
        await this.crowdsale.finalize({from: owner}).should.be.fulfilled;

        var hashClosed = web3.sha3('Closed()');
        option.topics = [hashClosed];
        await web3.eth.filter(option).get(function (err, result) {
          var event = result[0];
          var topics = event['topics'];
          topics[0].should.be.equal(hashClosed);
        });
      });

      it('should forward Ether from vault adress to wallet when crowdsale succeed', async function() {
        await this.crowdsale.buyTokensUsingEther(purchaser2, {value: ethMinCap, from: purchaser2});
        var balanceVault1 = await web3.eth.getBalance(this.vaultAddress);
        var balanceWallet1 = await web3.eth.getBalance(wallet);

        var amountRAX = ether(15).times(ethRAXRate);
        await this.raxToken.mint(investor, amountRAX, {from: owner}).should.be.fulfilled;
        await this.raxToken.approve(this.crowdsale.address, amountRAX, {from: investor}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxApprove(investor, {from: investor});
        var tokensVault1 = await this.raxToken.balanceOf(this.vaultAddress);
        var tokens1 = await this.raxToken.balanceOf(wallet);

        await increaseTimeTo(this.afterEndTime);
        await this.crowdsale.finalize({from: owner}).should.be.fulfilled;

        var balanceWallet2 = await web3.eth.getBalance(wallet);
        var balanceVault2 = await web3.eth.getBalance(this.vaultAddress);
        var tokensVault2 = await this.raxToken.balanceOf(this.vaultAddress);
        var tokens2 = await this.raxToken.balanceOf(wallet);

        balanceWallet2.should.be.bignumber.equal(balanceWallet1.plus(balanceVault1));
        balanceVault2.should.be.bignumber.equal(0);
        tokens2.should.be.bignumber.equal(tokens1.plus(tokensVault1));
        tokensVault2.should.be.bignumber.equal(0);
      });
    });
  });

  describe('during sale', function() {
    var value = ether(10);
    var expectedTokenAmount = value.times(ethPATRate);
    var amountRAX = value.times(ethRAXRate);
    var tokensRemainingBefore = maxCap;

    beforeEach(async function() {
      await increaseTimeTo(this.startTime);
      await advanceBlock();
    });

    describe('high-level purchase (fallback)', function () {
      beforeEach(async function() {
        this.txResult = await this.crowdsale.sendTransaction({value: value, from: investor});
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

      it('buying tokens with an odd wei amount', async function () {
        var amount = new BigNumber(123456789000000000);
        var tokens1 = await this.token.balanceOf(purchaser2);
        await this.crowdsale.sendTransaction({value: amount, from: purchaser2});
        var tokens2 = await this.token.balanceOf(purchaser2);
        tokens2.should.be.bignumber.equal(tokens1.plus(amount.times(ethPATRate)));
      });

      it('the investor should become a token holder after buying tokens', async function() {
        (await this.token.isHolder(investor)).should.be.equal(true);
      });

      it('should reject buying tokens from unregistered user', async function () {
        (await this.registeredUser.isUserRegistered(other)).should.be.equal(false);
        await this.crowdsale.sendTransaction({value: value, from: other}).should.be.rejected;
      });

      it('should reject under minimum amount (0.1 Ether)', async function() {
        var underMin = minAmount.minus(1);
        await this.crowdsale.sendTransaction({value: underMin, from: investor}).should.be.rejected;
      });

      it('should increase totalSupply', async function () {
        const post = await this.token.totalSupply();
        post.should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should increase tokensSold', async function () {
        const post = await this.crowdsale.tokensSold();
        post.should.be.bignumber.equal(expectedTokenAmount);
      });

      it('tokensRemaining should be decreased', async function () {
        const post = await this.crowdsale.tokensRemaining();
        tokensRemainingBefore.minus(post).should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should assign tokens to sender', async function () {
        const post = await this.token.balanceOf(investor);
        post.should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should forward funds to vault', async function () {
        var balance1 = await web3.eth.getBalance(this.vaultAddress);
        await this.crowdsale.sendTransaction({value: value, from: investor}).should.be.fulfilled;
        var balance2 = await web3.eth.getBalance(this.vaultAddress);
        balance2.minus(balance1).should.be.bignumber.equal(value);
      });

      it('should increase weiRaised', async function() {
        const post = await this.crowdsale.weiRaised();
        post.should.be.bignumber.equal(value);
      });
    });

    describe('low-level purchase (buyTokensUsingEther)', function () {
      beforeEach(async function() {
        this.txResult = await this.crowdsale.buyTokensUsingEther(investor, {value: value, from: purchaser});
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
        var amount = new BigNumber(123456789000000000);
        var tokens1 = await this.token.balanceOf(purchaser2);
        await this.crowdsale.buyTokensUsingEther(purchaser2, {value: amount, from: purchaser2});
        var tokens2 = await this.token.balanceOf(purchaser2);
        tokens2.should.be.bignumber.equal(tokens1.plus(amount.times(ethPATRate)));
      });

      it('buy tokens by RAX (buyTokensUsingRaxApprove)', async function() {
        var tokens1 = await this.token.balanceOf(purchaser2);
        await this.raxToken.mint(purchaser2, amountRAX, {from: owner}).should.be.fulfilled;
        await this.raxToken.approve(this.crowdsale.address, amountRAX, {from: purchaser2}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.fulfilled;
        var tokens2 = await this.token.balanceOf(purchaser2);
        var amount = amountRAX.times(ethPATRate).dividedBy(ethRAXRate);
        tokens2.should.be.bignumber.equal(tokens1.plus(amount));
      });

      it('buy tokens by RAX (buyTokensUsingRaxTransfer)', async function() {
        await this.raxToken.mint(this.crowdsale.address, amountRAX, {from: owner}).should.be.fulfilled;
        var tokens1 = await this.token.balanceOf(purchaser2);
        await this.crowdsale.buyTokensUsingRaxTransfer(purchaser2, amountRAX, {from: owner}).should.be.fulfilled;
        var tokens2 = await this.token.balanceOf(purchaser2);
        var amount = amountRAX.times(ethPATRate).dividedBy(ethRAXRate);
        tokens2.should.be.bignumber.equal(tokens1.plus(amount));
      });

      it('should reject an amount of RAX tokens which is greater than real balance', async function() {
        await this.raxToken.mint(purchaser2, amountRAX, {from: owner}).should.be.fulfilled;
        await this.raxToken.approve(this.crowdsale.address, amountRAX.plus(1), {from: purchaser2}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.rejected;
      });

      it('should reject an amount of RAX tokens which equals max uint (buyTokensUsingRaxApprove)', async function() {
        await this.raxToken.mint(purchaser2, amountRAX, {from: owner}).should.be.fulfilled;
        await this.raxToken.approve(this.crowdsale.address, bn.MAX_UINT, {from: purchaser2}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.rejected;
      });

      it('should reject an amount of RAX tokens which exceeds max uint (buyTokensUsingRaxApprove)', async function() {
        await this.raxToken.mint(purchaser2, amountRAX, {from: owner}).should.be.fulfilled;
        await this.raxToken.approve(this.crowdsale.address, bn.OVER_UINT, {from: purchaser2}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.rejected;
      });

      it('should reject under minimum amount (0.1 Ether)', async function() {
        var underMin = minAmount.minus(1);
        await this.crowdsale.buyTokensUsingEther(investor, {value: underMin, from: investor}).should.be.rejected;

        var raxAmount = underMin.times(ethRAXRate);
        await this.raxToken.mint(purchaser2, raxAmount, {from: owner}).should.be.fulfilled;
        await this.raxToken.approve(this.crowdsale.address, raxAmount, {from: purchaser2}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.rejected;
        await this.raxToken.mint(this.crowdsale.address, raxAmount, {from: owner}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxTransfer(purchaser2, raxAmount, {from: owner}).should.be.rejected;
      });

      it('should increase totalSupply', async function () {
        const post = await this.token.totalSupply();
        post.should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should increase tokensSold', async function () {
        const post = await this.crowdsale.tokensSold();
        post.should.be.bignumber.equal(expectedTokenAmount);
      });

      it('tokensRemaining should be decreased', async function () {
        const post = await this.crowdsale.tokensRemaining();
        tokensRemainingBefore.minus(post).should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should assign tokens to beneficiary', async function () {
        const post = await this.token.balanceOf(investor);
        post.should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should forward funds to vault', async function () {
        var balanceBefore = await web3.eth.getBalance(this.vaultAddress);
        await this.crowdsale.buyTokensUsingEther(investor, {value: value, from: purchaser}).should.be.fulfilled;
        var balanceAfter = await web3.eth.getBalance(this.vaultAddress);
        balanceAfter.minus(balanceBefore).should.be.bignumber.equal(value);

        var tokens1 = await this.raxToken.balanceOf(this.vaultAddress);
        await this.raxToken.mint(purchaser2, amountRAX, {from: owner}).should.be.fulfilled;
        await this.raxToken.approve(this.crowdsale.address, amountRAX, {from: purchaser2}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.fulfilled;
        var tokens2 = await this.raxToken.balanceOf(this.vaultAddress);
        tokens2.should.be.bignumber.equal(tokens1.plus(amountRAX));
      });

      it('should increase weiRaised', async function() {
        const post = await this.crowdsale.weiRaised();
        post.should.be.bignumber.equal(value);
      });
    });

    describe('token max cap reached', function () {
      var amountRAX = (maxCap.minus(minCap)).times(ethPATRate/ethRAXRate).round(0, BigNumber.ROUND_HALF_UP);
      var amountRAX1 = ethRAXRate*(ether(1));
      var amountMinRAX = ethRAXRate*(ether(0.1));
      var amountETH = minCap.dividedBy(ethPATRate).round(0, BigNumber.ROUND_HALF_UP);
      // using amountRAX + amountETH can buy maxCap tokens

      it('should return hasEnded() of true', async function() {
        await this.raxToken.mint(purchaser2, amountRAX.minus(amountRAX1), {from: owner}).should.be.fulfilled;
        await this.raxToken.approve(this.crowdsale.address, amountRAX.minus(amountRAX1), {from: purchaser2}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.fulfilled;
        await this.raxToken.mint(this.crowdsale.address, amountRAX1, {from: owner}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxTransfer(investor, amountRAX1, {from: owner}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingEther(purchaser2, {value: amountETH, from: purchaser2}).should.be.fulfilled;

        var remaining = await this.crowdsale.tokensRemaining();
        (await this.crowdsale.hasEnded()).should.be.equal(true);
        remaining.should.be.bignumber.equal(0);
      });

      it('should reject purchases that exceed max cap (Eth)', async function() {
        await this.crowdsale.buyTokensUsingEther(purchaser2, {value: ethMaxCap.minus(ether(1)), from: purchaser2}).should.be.fulfilled;

        await this.crowdsale.buyTokensUsingEther(purchaser2, {value: ether(2), from: purchaser2}).should.be.rejected;
      });

      it('should reject purchases that exceed max cap (RAX approve)', async function() {
        var amount = maxCap.times(ethPATRate/ethRAXRate).round(0, BigNumber.ROUND_HALF_UP);
        await this.raxToken.mint(purchaser2, amount, {from: owner}).should.be.fulfilled;
        await this.raxToken.approve(this.crowdsale.address, amount, {from: purchaser2}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.fulfilled;

        await this.raxToken.mint(purchaser2, amountMinRAX, {from: owner}).should.be.fulfilled;
        await this.raxToken.approve(this.crowdsale.address, amountMinRAX, {from: purchaser2}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.rejected;
      });

      it('should reject purchases that exceed max cap (RAX transfer)', async function() {
        var amount = maxCap.times(ethPATRate/ethRAXRate).round(0, BigNumber.ROUND_HALF_UP);
        await this.raxToken.mint(this.crowdsale.address, amount, {from: owner}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxTransfer(purchaser2, amount, {from: owner}).should.be.fulfilled;

        await this.raxToken.mint(this.crowdsale.address, amountMinRAX, {from: owner}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxTransfer(purchaser2, amountMinRAX, {from: owner}).should.be.rejected;
      });

      it('should reject purchases that exceed max cap (mixed)', async function() {
        await this.raxToken.mint(purchaser2, amountRAX.minus(amountRAX1), {from: owner}).should.be.fulfilled;
        await this.raxToken.approve(this.crowdsale.address, amountRAX.minus(amountRAX1), {from: purchaser2}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.fulfilled;
        await this.raxToken.mint(this.crowdsale.address, amountRAX1, {from: owner}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxTransfer(investor, amountRAX1, {from: owner}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingEther(purchaser2, {value: amountETH, from: purchaser2}).should.be.fulfilled;

        await this.crowdsale.buyTokensUsingEther(investor, {value: ether(0.1), from: investor}).should.be.rejected;

        await this.raxToken.mint(purchaser2, amountMinRAX, {from: owner}).should.be.fulfilled;
        await this.raxToken.approve(this.crowdsale.address, amountMinRAX, {from: purchaser2}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.rejected;
        await this.raxToken.mint(this.crowdsale.address, amountMinRAX, {from: owner}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxTransfer(purchaser2, amountMinRAX, {from: owner}).should.be.rejected;
      });

      it('should hit max cap exactly', async function() {
        await this.raxToken.mint(purchaser2, amountRAX.minus(amountRAX1), {from: owner}).should.be.fulfilled;
        await this.raxToken.approve(this.crowdsale.address, amountRAX.minus(amountRAX1), {from: purchaser2}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.fulfilled;
        await this.raxToken.mint(this.crowdsale.address, amountRAX1, {from: owner}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxTransfer(investor, amountRAX1, {from: owner}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingEther(purchaser2, {value: amountETH, from: purchaser2}).should.be.fulfilled;

        (await this.crowdsale.tokensRemaining()).should.be.bignumber.equal(0);
        (await this.crowdsale.hasEnded()).should.be.equal(true);
      });

      it('should not leave orphans', async function() {
        await this.raxToken.mint(purchaser2, amountRAX.minus(amountRAX1), {from: owner}).should.be.fulfilled;
        await this.raxToken.approve(this.crowdsale.address, amountRAX.minus(amountRAX1), {from: purchaser2}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.fulfilled;
        await this.raxToken.mint(this.crowdsale.address, amountRAX1, {from: owner}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxTransfer(investor, amountRAX1, {from: owner}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingEther(purchaser2, {value: amountETH.minus(ether(0.01)), from: purchaser2}).should.be.fulfilled;
        (await this.crowdsale.tokensRemaining()).should.be.bignumber.equal(0);
        (await this.crowdsale.hasEnded()).should.be.equal(true);
      });

      it('should not over-gift orphans', async function() {
        await this.raxToken.mint(purchaser2, amountRAX.minus(amountRAX1), {from: owner}).should.be.fulfilled;
        await this.raxToken.approve(this.crowdsale.address, amountRAX.minus(amountRAX1), {from: purchaser2}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.fulfilled;
        await this.raxToken.mint(this.crowdsale.address, amountRAX1, {from: owner}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxTransfer(investor, amountRAX1, {from: owner}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingEther(purchaser2, {value: amountETH.minus(ether(1)), from: purchaser2}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingEther(investor, {value: ether(0.9), from: investor}).should.be.fulfilled;
        (await this.crowdsale.tokensRemaining()).should.be.bignumber.gt(0);
        (await this.crowdsale.hasEnded()).should.be.equal(false);
      });
    });

    describe('crowdsale end time can be updated', function () {
      it('manager can change endTime', async function() {
        var endTime1 = latestTime() + duration.minutes(1);
        await this.crowdsale.setEndTime(endTime1, {from: manager1}).should.be.fulfilled;
        var endTime2 = await this.crowdsale.closingTime();
        endTime2.should.be.bignumber.equal(endTime1);
      });

      it('non-manager can not change endTime', async function() {
        var endTime = latestTime() + duration.minutes(1);
        await this.crowdsale.setEndTime(endTime, {from: investor}).should.be.rejected;
      });

      it('can buying token after change endTime', async function() {
        await increaseTimeTo(this.afterEndTime);
        (await this.crowdsale.hasEnded()).should.be.equal(true);
        // should reject buying tokens after end time
        await this.crowdsale.buyTokensUsingEther(investor, {value: value, from: investor}).should.be.rejected;
        await this.raxToken.mint(purchaser2, amountRAX, {from: owner});
        await this.raxToken.approve(this.crowdsale.address, amountRAX, {from: purchaser2});
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.rejected;
        await this.raxToken.mint(this.crowdsale.address, amountRAX, {from: owner});
        await this.crowdsale.buyTokensUsingRaxTransfer(investor, amountRAX, {from: owner}).should.be.rejected;

        // change crowdsale endtime
        var endTime1 = latestTime() + duration.minutes(1);
        await this.crowdsale.setEndTime(endTime1, {from: manager1}).should.be.fulfilled;
        var endTime2 = await this.crowdsale.closingTime();
        endTime2.should.be.bignumber.equal(endTime1);
        // should allow to buy tokens after setting new end time
        await this.crowdsale.buyTokensUsingEther(investor, {value: value, from: investor}).should.be.fulfilled;
        await this.raxToken.mint(purchaser2, amountRAX, {from: owner});
        await this.raxToken.approve(this.crowdsale.address, amountRAX, {from: purchaser2});
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.fulfilled;
        await this.raxToken.mint(this.crowdsale.address, amountRAX, {from: owner});
        await this.crowdsale.buyTokensUsingRaxTransfer(investor, amountRAX, {from: owner}).should.be.fulfilled;
      });
    });

    describe('pause and unpause', function () {
      it('can buy tokens when unpause', async function() {
        await this.crowdsale.buyTokensUsingEther(investor, {value: value, from: investor}).should.be.fulfilled;
        await this.raxToken.mint(purchaser2, amountRAX, {from: owner});
        await this.raxToken.approve(this.crowdsale.address, amountRAX, {from: purchaser2});
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.fulfilled;
        await this.raxToken.mint(this.crowdsale.address, amountRAX, {from: owner});
        await this.crowdsale.buyTokensUsingRaxTransfer(investor, amountRAX, {from: owner}).should.be.fulfilled;
      });

      it('should reject buying tokens when paused', async function() {
        await this.crowdsale.pause({from: owner}).should.be.fulfilled;

        await this.crowdsale.buyTokensUsingEther(investor, {value: value, from: investor}).should.be.rejected;
        await this.raxToken.mint(purchaser2, amountRAX, {from: owner});
        await this.raxToken.approve(this.crowdsale.address, amountRAX, {from: purchaser2});
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.rejected;
        await this.raxToken.mint(this.crowdsale.address, amountRAX, {from: owner});
        await this.crowdsale.buyTokensUsingRaxTransfer(investor, amountRAX, {from: owner}).should.be.rejected;
      });

      it('can unpause after paused', async function() {
        await this.crowdsale.pause({from: owner}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingEther(investor, {value: value, from: investor}).should.be.rejected;

        await this.crowdsale.unpause({from: owner}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingEther(investor, {value: value, from: investor}).should.be.fulfilled;
        await this.raxToken.mint(purchaser2, amountRAX, {from: owner});
        await this.raxToken.approve(this.crowdsale.address, amountRAX, {from: purchaser2});
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.fulfilled;
        await this.raxToken.mint(this.crowdsale.address, amountRAX, {from: owner});
        await this.crowdsale.buyTokensUsingRaxTransfer(investor, amountRAX, {from: owner}).should.be.fulfilled;
      });
    });

    describe('can change crowdsale wallet', function () {
      it('manager can set new wallet', async function() {
        await this.crowdsale.setWallet(newWallet, {from: manager1}).should.be.fulfilled;
        var wallet = await this.crowdsale.wallet();
        wallet.should.be.equal(newWallet);
      });

      it('non-manager can not set new wallet', async function() {
        await this.crowdsale.setWallet(newWallet, {from: owner}).should.be.rejected;
      });

      it('funds should be forwarded to newly set wallet', async function() {
        var oldWei1 = await web3.eth.getBalance(wallet);
        var oldTokens1 = await this.raxToken.balanceOf(wallet);
        await this.crowdsale.setWallet(newWallet, {from: manager1}).should.be.fulfilled;
        var newWei1 = await web3.eth.getBalance(newWallet);
        var newTokens1 = await this.raxToken.balanceOf(newWallet);
        // Using Ether
        await this.crowdsale.buyTokensUsingEther(purchaser2, {value: ethMinCap, from: purchaser2}).should.be.fulfilled;
        // Using RAX
        var amountRAX = ether(15).times(ethRAXRate);
        await this.raxToken.mint(purchaser, amountRAX, {from: owner}).should.be.fulfilled;
        await this.raxToken.approve(this.crowdsale.address, amountRAX, {from: purchaser}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser, {from: purchaser}).should.be.fulfilled;
        // Force to end crowdsale
        await increaseTimeTo(this.afterEndTime);
        await this.crowdsale.finalize({from: owner}).should.be.fulfilled;

        var oldWei2 = await web3.eth.getBalance(wallet);
        var oldTokens2 = await this.raxToken.balanceOf(wallet);
        var newWei2 = await web3.eth.getBalance(newWallet);
        var newTokens2 = await this.raxToken.balanceOf(newWallet);
        oldWei2.should.be.bignumber.equal(oldWei1);
        oldTokens2.should.be.bignumber.equal(oldTokens1);
        newWei2.should.be.bignumber.equal(newWei1.plus(ethMinCap));
        newTokens2.should.be.bignumber.equal(newTokens1.plus(amountRAX));
      });
    });
  });
});
