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
const claimableEx = require("./ClaimableEx.js");
const owningToken = require("./CrowdsaleOwnsToken.js");
const reclaimTokens = require("./CanReclaimToken.js");

const RegisteredUsers = artifacts.require("./RegisteredUsers.sol");
const PATToken = artifacts.require("./PATToken.sol");
const RAXToken = artifacts.require("./RAXToken.sol");
const PATSale = artifacts.require("./PATSale.sol");
const ManageListingFee = artifacts.require("./ManageListingFee.sol");
const ManageReserveFunds = artifacts.require("./ManageReserveFunds.sol");

contract('PATSale', async function(accounts) {
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
  let ethMinCap = bn.roundHalfUp(minCap.dividedBy(ethPATRate));
  let ethMaxCap = bn.roundHalfUp(maxCap.dividedBy(ethPATRate));
  let minAmount = finney(100);
  let owner = accounts[0];
  let manager1 = accounts[1];
  let manager2 = accounts[2];
  let managers = [manager1, manager2];
  let wallet = accounts[3];
  let newWallet = accounts[4];
  let samuraiXWallet = accounts[5];
  let investor = accounts[6];
  let purchaser = accounts[7];
  let purchaser2 = accounts[8];
  let other = accounts[9];
  let startTime;
  let endTime;
  let afterEndTime;
  let manageListingFee;
  let manageReserveFunds;
  let regUsers;
  let raxToken;
  let token;
  let crowdsale;
  let vaultAddress;

  before(async function () {
    regUsers = await RegisteredUsers.new();
    await regUsers.addRegisteredUser(investor, false);
    await regUsers.addRegisteredUser(purchaser, false);
    await regUsers.addRegisteredUser(purchaser2, false );
    await regUsers.addRegisteredUser(wallet, false);
    await regUsers.addRegisteredUser(newWallet, false);

    manageListingFee = await ManageListingFee.deployed();
    manageReserveFunds = await ManageReserveFunds.deployed();
  });

  describe('claimTokenOwnership()', function() {
    owningToken.check(accounts, deployCrowdsaleAndToken);
  });

  beforeEach(async function () {
    await advanceBlock();

    raxToken = await RAXToken.new(regUsers.address);
    crowdsale = await deployContract();
    const tokenOwner = await token.owner();
    await token.transferOwnership(crowdsale.address, {from: tokenOwner});
    await crowdsale.claimTokenOwnership();
    vaultAddress = await crowdsale.getVaultAddress();
    await regUsers.addRegisteredUser(vaultAddress, true);
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
      (await crowdsale.maxCap()).should.be.bignumber.equal(maxCap);
      (await crowdsale.tokensRemaining()).should.be.bignumber.equal(maxCap);
    });

    it('should not be self-ownable', async function() {
      await crowdsale.transferOwnership(crowdsale.address).should.be.rejected;
    });

    it('non-owner should not change ownership', async function() {
      await crowdsale.transferOwnership(investor, {from: investor}).should.be.rejected;
      await crowdsale.transferOwnership(purchaser, {from: investor}).should.be.rejected;
    });

    it('should reject non-owner to pre-mint tokens for managing purpose', async function() {
      await crowdsale.mintManagedTokens({from: investor}).should.be.rejected;
    });

    it('should allow to pre-mint tokens for managing purpose', async function() {
      await crowdsale.mintManagedTokens().should.be.fulfilled;
    });

    it('should reject pre-minting tokens twice', async function() {
      await crowdsale.mintManagedTokens().should.be.fulfilled;
      await crowdsale.mintManagedTokens().should.be.rejected;
    });

    it('should reject non-owner setting minimum purchase amount', async function() {
      await crowdsale.setMinPurchaseAmt(finney(1000), {from: investor}).should.be.rejected;
    });

    it('should allow to set minimum purchase amount', async function() {
      var minAmt = finney(1000);
      await crowdsale.setMinPurchaseAmt(minAmt).should.be.fulfilled;
      (await crowdsale.minPurchaseAmt()).should.be.bignumber.equal(minAmt);
    });

    it('should reject deploying PATSale with invalid rates parameters', async function() {
      // saleRate = maxCap / totalTokens = 75 (%)
      var _listingFeeRate = 5;
      var _reserveFundRate = 15;
      // sum = saleRate + listingFeeRate + reserveFundRate = 95 (%)
      var _startTime = latestTime() + duration.minutes(1);
      var _endTime = _startTime + duration.hours(1);
      var _raxToken = await RAXToken.new(regUsers.address);

      var _token = await PATToken.new(regUsers.address, id, managers, name,
                                      symbol, fixedLinkDoc, fixedHashDoc, varLinkDoc,
                                      varHashDoc);
      await PATSale.new(regUsers.address, raxToken.address,
                                        _token.address, manageListingFee.address,
                                        manageReserveFunds.address, _startTime,
                                        _endTime, wallet, minCap, maxCap, ethPATRate,
                                        ethRAXRate, _listingFeeRate, _reserveFundRate).should.be.rejected;
    });
  });

  describe('ClaimableEx', function() {
      claimableEx.check(accounts, deployContract);
  });

  describe('CanReclaimToken', function() {
    reclaimTokens.check(RegisteredUsers, accounts, deployContract, deployToken);
  });


  describe('time dependant', function() {
    var value = ether(10);
    var amountRAX = value.times(ethRAXRate);

    describe('before start', function () {
      it('should reject payments before start', async function () {
        await crowdsale.sendTransaction({value: value, from: investor}).should.be.rejectedWith(EVMThrow);
        await crowdsale.buyTokensUsingEther(investor, {
            from: purchaser,
            value: value
        }).should.be.rejectedWith(EVMThrow);
      });

      it('should reject payments before start (buyTokensUsingRaxApprove)', async function() {
        await raxToken.mint(purchaser, amountRAX, {from: owner}).should.be.fulfilled;
        await raxToken.approve(crowdsale.address, amountRAX, {from: purchaser}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxApprove(purchaser, {from: purchaser}).should.be.rejected;
      });

      it('should reject payments before start (buyTokensUsingRaxTransfer)', async function() {
        await raxToken.mint(crowdsale.address, amountRAX, {from: owner}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxTransfer(purchaser, amountRAX, {from: owner}).should.be.rejected;
      });

      it('should reject transfer token ownership when not ended', async function() {
          await crowdsale.tokenTransferOwnership(owner).should.be.rejected;
      });

      it('finalize should fail when not ended', async function() {
          await crowdsale.finalize().should.be.rejected;
      });

      it('should report hasClosed as false', async function() {
        (await crowdsale.hasClosed()).should.be.equal(false);
      });
    });

    describe('after start', function () {
      beforeEach(async function () {
          await increaseTimeTo(startTime);
      });

      it ('should not accept payments from unregistered user', async function () {
        await crowdsale.sendTransaction({from: other, value: value}).should.be.rejected;
      });

      it('should accept payments after start (fallback)', async function () {
        await crowdsale.sendTransaction({from: investor, value : value}).should.be.fulfilled;
      });

      it('should accept payments after start (buyTokensUsingEther)', async function () {
        await crowdsale.buyTokensUsingEther(investor, {value: value, from: purchaser}).should.be.fulfilled;
      });

      it('should accept payments after start (buyTokensUsingRaxApprove)', async function() {
        await raxToken.mint(purchaser, amountRAX, {from: owner}).should.be.fulfilled;
        await raxToken.approve(crowdsale.address, amountRAX, {from: purchaser}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxApprove(purchaser, {from: purchaser}).should.be.fulfilled;
      });

      it('should accept payments after start (buyTokensUsingRaxTransfer)', async function() {
        await raxToken.mint(crowdsale.address, amountRAX, {from: owner}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxTransfer(purchaser, amountRAX, {from: owner}).should.be.fulfilled;
      });

      it('should reject transfer token ownership when not ended', async function() {
          await crowdsale.tokenTransferOwnership(owner).should.be.rejected;
      });

      it('finalize should fail when not ended', async function() {
        await crowdsale.finalize().should.be.rejected;
      });

      it('should report hasEnded as false', async function() {
        (await crowdsale.hasClosed()).should.be.equal(false);
      });
    });

    describe('after end', function () {
      var value = ether(10);
      var option = {
        fromBlock: 0,
        toBlock: 'latest',
        address: vaultAddress,
        topics: []
      };

      beforeEach(async function () {
        await increaseTimeTo(startTime);
      });

      it('should reject payments after end (fallback)', async function () {
        await increaseTimeTo(afterEndTime);
        await crowdsale.sendTransaction({from: investor, value : value}).should.be.rejectedWith(EVMThrow);
      });

      it('should reject payments after end (buyTokensUsingEther)', async function () {
        await increaseTimeTo(afterEndTime);
        await crowdsale.buyTokensUsingEther(investor, {value: value, from: purchaser}).should.be.rejectedWith(EVMThrow);
      });

      it('should reject payments after end (buyTokensUsingRaxApprove)', async function() {
        await raxToken.mint(purchaser, amountRAX, {from: owner}).should.be.fulfilled;
        await raxToken.approve(crowdsale.address, amountRAX, {from: purchaser}).should.be.fulfilled;
        await increaseTimeTo(afterEndTime);
        await crowdsale.buyTokensUsingRaxApprove(purchaser, {from: purchaser}).should.be.rejected;
      });

      it('should reject payments after end (buyTokensUsingRaxTransfer)', async function() {
        await raxToken.mint(crowdsale.address, amountRAX, {from: owner}).should.be.fulfilled;
        await increaseTimeTo(afterEndTime);
        await crowdsale.buyTokensUsingRaxTransfer(purchaser, amountRAX, {from: owner}).should.be.rejected;
      });

      it('non-owner can not transfer token ownership', async function() {
        await crowdsale.tokenTransferOwnership(owner, {from: investor}).should.be.rejected;
        await crowdsale.tokenTransferOwnership(owner, {from: purchaser}).should.be.rejected;
      });

      it('finalize transfers token ownership', async function() {
        await increaseTimeTo(afterEndTime);
        (await token.owner()).should.be.equal(crowdsale.address);
        await crowdsale.finalize().should.be.fulfilled;
        await token.claimOwnership().should.be.fulfilled;
        (await token.owner()).should.be.equal((await crowdsale.owner()));
      });

      it('should report hasEnded as true', async function() {
        await increaseTimeTo(afterEndTime);
        (await crowdsale.hasClosed()).should.be.equal(true);
      });

      it('should refund when crowdsale fails (claimRefund)', async function() {
        await crowdsale.buyTokensUsingEther(purchaser2, {value: value, from: purchaser2});
        var balance1 = await web3.eth.getBalance(purchaser2);

        await raxToken.mint(purchaser2, amountRAX, {from: owner}).should.be.fulfilled;
        await raxToken.approve(crowdsale.address, amountRAX, {from: purchaser2}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2});
        var tokens1 = await raxToken.balanceOf(purchaser2);

        await increaseTimeTo(afterEndTime);
        await crowdsale.finalize({from: owner}).should.be.fulfilled;
        await crowdsale.claimRefund({from: purchaser2}).should.be.fulfilled;
        var balance2 = await web3.eth.getBalance(purchaser2);
        var tokens2 = await raxToken.balanceOf(purchaser2);

        balance2.should.be.bignumber.gt(balance1.plus(value.minus(ether(0.01)))); // cost gas
        tokens2.should.be.bignumber.equal(tokens1.plus(amountRAX));
      });

      it('should refund when crowdsale fails (refund)', async function() {
        await crowdsale.buyTokensUsingEther(purchaser2, {value: value, from: purchaser2});
        await raxToken.mint(purchaser2, amountRAX, {from: owner}).should.be.fulfilled;
        await raxToken.approve(crowdsale.address, amountRAX, {from: purchaser2}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2});
        var balance1 = await web3.eth.getBalance(purchaser2);
        var tokens1 = await raxToken.balanceOf(purchaser2);

        await increaseTimeTo(afterEndTime);
        await crowdsale.finalize({from: owner}).should.be.fulfilled;
        await crowdsale.refund(purchaser2, {from: owner}).should.be.fulfilled;
        var balance2 = await web3.eth.getBalance(purchaser2);
        var tokens2 = await raxToken.balanceOf(purchaser2);

        tokens2.should.be.bignumber.equal(tokens1.plus(amountRAX));
        balance2.should.be.bignumber.equal(balance1.plus(value));
      });

      it('should logs Finalized and RefundsEnabled (if necessary) events', async function() {
        await increaseTimeTo(afterEndTime);

        var res = await crowdsale.finalize({from: owner}).should.be.fulfilled;
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
        await crowdsale.buyTokensUsingEther(purchaser2, {value: value, from: purchaser2});

        await raxToken.mint(purchaser2, amountRAX, {from: owner}).should.be.fulfilled;
        await raxToken.approve(crowdsale.address, amountRAX, {from: purchaser2}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2});
        var tokens1 = await raxToken.balanceOf(purchaser2);

        await increaseTimeTo(afterEndTime);
        await crowdsale.finalize({from: owner}).should.be.fulfilled;

        var balance1 = await web3.eth.getBalance(purchaser2);
        await crowdsale.claimRefund({from: purchaser2}).should.be.fulfilled;
        var balance2 = await web3.eth.getBalance(purchaser2);
        var tokens2 = await raxToken.balanceOf(purchaser2);

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
        await crowdsale.buyTokensUsingEther(investor, {value: value, from: investor});
        var investorBalance1 = await web3.eth.getBalance(investor);
        await increaseTimeTo(afterEndTime);

        await crowdsale.finalize({from: owner}).should.be.fulfilled;

        var balance1 = await web3.eth.getBalance(purchaser2);
        await crowdsale.refund(purchaser2, {from: purchaser2}).should.be.fulfilled;
        var investorBalance2 = await web3.eth.getBalance(investor);
        var balance2 = await web3.eth.getBalance(purchaser2);

        balance2.should.be.bignumber.lt(balance1); // cost gas
        investorBalance2.should.be.bignumber.equal(investorBalance1);
      });

      it('should logs Closed event when crowdsale succeed', async function() {
        await crowdsale.buyTokensUsingEther(purchaser2, {value: ethMaxCap, from: purchaser2});
        await increaseTimeTo(afterEndTime);
        await crowdsale.finalize({from: owner}).should.be.fulfilled;

        var hashClosed = web3.sha3('Closed()');
        option.topics = [hashClosed];
        await web3.eth.filter(option).get(function (err, result) {
          var event = result[0];
          var topics = event['topics'];
          topics[0].should.be.equal(hashClosed);
        });
      });

      it('should forward funds from vault adress to wallet when crowdsale succeed', async function() {
        await crowdsale.buyTokensUsingEther(purchaser2, {value: ethMinCap, from: purchaser2});
        var balanceVault1 = await web3.eth.getBalance(vaultAddress);
        var balanceWallet1 = await web3.eth.getBalance(wallet);

        var amountRAX = ether(15).times(ethRAXRate);
        await raxToken.mint(investor, amountRAX, {from: owner}).should.be.fulfilled;
        await raxToken.approve(crowdsale.address, amountRAX, {from: investor}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxApprove(investor, {from: investor});
        var tokensVault1 = await raxToken.balanceOf(vaultAddress);
        var tokens1 = await raxToken.balanceOf(wallet);

        await increaseTimeTo(afterEndTime);
        await crowdsale.finalize({from: owner}).should.be.fulfilled;

        var balanceWallet2 = await web3.eth.getBalance(wallet);
        var balanceVault2 = await web3.eth.getBalance(vaultAddress);
        var tokensVault2 = await raxToken.balanceOf(vaultAddress);
        var tokens2 = await raxToken.balanceOf(wallet);

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
      await increaseTimeTo(startTime);
      await advanceBlock();
    });

    describe('high-level purchase (fallback)', function () {
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
        var tokens1 = await token.balanceOf(purchaser2);
        await crowdsale.sendTransaction({value: amount, from: purchaser2});
        var tokens2 = await token.balanceOf(purchaser2);
        tokens2.should.be.bignumber.equal(tokens1.plus(amount.times(ethPATRate)));
      });

      it('the investor should become a token holder after buying tokens', async function() {
        (await token.isHolder(investor)).should.be.equal(false);
        await crowdsale.sendTransaction({value: value, from: investor});
        (await token.isHolder(investor)).should.be.equal(true);
      });

      it('should reject buying tokens from unregistered user', async function () {
        (await regUsers.isUserRegistered(other)).should.be.equal(false);
        await crowdsale.sendTransaction({value: value, from: other}).should.be.rejected;
      });

      it('should reject under minimum amount (0.1 Ether)', async function() {
        var underMin = minAmount.minus(1);
        await crowdsale.sendTransaction({value: underMin, from: investor}).should.be.rejected;
      });

      it('should increase totalSupply', async function () {
        await crowdsale.sendTransaction({value: value, from: investor});
        const post = await token.totalSupply();
        post.should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should increase tokensSold', async function () {
        await crowdsale.sendTransaction({value: value, from: investor});
        const post = await crowdsale.tokensSold();
        post.should.be.bignumber.equal(expectedTokenAmount);
      });

      it('tokensRemaining should be decreased', async function () {
        await crowdsale.sendTransaction({value: value, from: investor});
        const post = await crowdsale.tokensRemaining();
        tokensRemainingBefore.minus(post).should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should assign tokens to sender', async function () {
        await crowdsale.sendTransaction({value: value, from: investor});
        const post = await token.balanceOf(investor);
        post.should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should forward funds to vault', async function () {
        var balance1 = await web3.eth.getBalance(vaultAddress);
        await crowdsale.sendTransaction({value: value, from: investor}).should.be.fulfilled;
        var balance2 = await web3.eth.getBalance(vaultAddress);
        balance2.minus(balance1).should.be.bignumber.equal(value);
      });

      it('should increase weiRaised', async function() {
        await crowdsale.sendTransaction({value: value, from: investor});
        const post = await crowdsale.weiRaised();
        post.should.be.bignumber.equal(value);
      });
    });

    describe('low-level purchase (buyTokensUsing...)', function () {

      it('should log purchase event', async function () {
        const {logs} = await crowdsale.buyTokensUsingEther(investor, {value: value, from: purchaser});
        const event = logs.find(e => e.event === 'TokenPurchase');

        should.exist(event);
        event.args.purchaser.should.equal(purchaser);
        event.args.beneficiary.should.equal(investor);
        event.args.value.should.be.bignumber.equal(value);
        event.args.amount.should.be.bignumber.equal(expectedTokenAmount);
      });

      it('buying tokens with an odd amount of ether', async function () {
        var amount = new BigNumber(1234567890000000000);
        var tokens1 = await token.balanceOf(purchaser2);
        await crowdsale.buyTokensUsingEther(purchaser2, {value: amount, from: purchaser2});
        var tokens2 = await token.balanceOf(purchaser2);
        tokens2.should.be.bignumber.equal(tokens1.plus(amount.times(ethPATRate)));
      });

      it('buy tokens by RAX (buyTokensUsingRaxApprove)', async function() {
        var tokens1 = await token.balanceOf(purchaser2);
        await raxToken.mint(purchaser2, amountRAX, {from: owner}).should.be.fulfilled;
        await raxToken.approve(crowdsale.address, amountRAX, {from: purchaser2}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.fulfilled;
        var tokens2 = await token.balanceOf(purchaser2);
        var amount = amountRAX.times(ethPATRate).dividedBy(ethRAXRate);
        tokens2.should.be.bignumber.equal(tokens1.plus(amount));
      });

      it('buy tokens by RAX (buyTokensUsingRaxTransfer)', async function() {
        await raxToken.mint(crowdsale.address, amountRAX, {from: owner}).should.be.fulfilled;
        var tokens1 = await token.balanceOf(purchaser2);
        await crowdsale.buyTokensUsingRaxTransfer(purchaser2, amountRAX, {from: owner}).should.be.fulfilled;
        var tokens2 = await token.balanceOf(purchaser2);
        var amount = amountRAX.times(ethPATRate).dividedBy(ethRAXRate);
        tokens2.should.be.bignumber.equal(tokens1.plus(amount));
      });

      it('the investor should become a token holder after buying tokens', async function() {
        // Ether
        (await token.isHolder(investor)).should.be.equal(false);
        await crowdsale.buyTokensUsingEther(investor, {value: value, from: investor}).should.be.fulfilled;
        (await token.isHolder(investor)).should.be.equal(true);
        // RAX approve
        await raxToken.mint(purchaser, amountRAX, {from: owner}).should.be.fulfilled;
        await raxToken.approve(crowdsale.address, amountRAX, {from: purchaser}).should.be.fulfilled;
        (await token.isHolder(purchaser)).should.be.equal(false);
        await crowdsale.buyTokensUsingRaxApprove(purchaser, {from: purchaser}).should.be.fulfilled;
        (await token.isHolder(purchaser)).should.be.equal(true);
        // RAX transfer
        await raxToken.mint(crowdsale.address, amountRAX, {from: owner}).should.be.fulfilled;
        (await token.isHolder(purchaser2)).should.be.equal(false);
        await crowdsale.buyTokensUsingRaxTransfer(purchaser2, amountRAX, {from: owner}).should.be.fulfilled;
        (await token.isHolder(purchaser2)).should.be.equal(true);
      });

      it('should reject buying tokens from unregistered user', async function () {
        (await regUsers.isUserRegistered(other)).should.be.equal(false);
        // Ether
        await crowdsale.buyTokensUsingEther(other, {value: value, from: other}).should.be.rejected;
        // RAX approve
        await raxToken.mint(other, amountRAX, {from: owner}).should.be.fulfilled;
        await raxToken.approve(crowdsale.address, amountRAX, {from: other}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxApprove(other, {from: other}).should.be.rejected;
        // RAX transfer
        await raxToken.mint(crowdsale.address, amountRAX, {from: owner}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxTransfer(other, amountRAX, {from: owner}).should.be.rejected;
      });

      it('should reject an amount of RAX tokens which is greater than real balance', async function() {
        await raxToken.mint(purchaser2, amountRAX, {from: owner}).should.be.fulfilled;
        await raxToken.approve(crowdsale.address, amountRAX.plus(1), {from: purchaser2}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.rejected;
      });

      it('should reject an amount of RAX tokens which equals max uint (buyTokensUsingRaxApprove)', async function() {
        await raxToken.mint(purchaser2, amountRAX, {from: owner}).should.be.fulfilled;
        await raxToken.approve(crowdsale.address, bn.MAX_UINT, {from: purchaser2}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.rejected;
      });

      it('should reject an amount of RAX tokens which exceeds max uint (buyTokensUsingRaxApprove)', async function() {
        await raxToken.mint(purchaser2, amountRAX, {from: owner}).should.be.fulfilled;
        await raxToken.approve(crowdsale.address, bn.OVER_UINT, {from: purchaser2}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.rejected;
      });

      it('should reject under minimum amount (0.1 Ether)', async function() {
        var underMin = minAmount.minus(1);
        await crowdsale.buyTokensUsingEther(investor, {value: underMin, from: investor}).should.be.rejected;

        var raxAmount = underMin.times(ethRAXRate);
        await raxToken.mint(purchaser2, raxAmount, {from: owner}).should.be.fulfilled;
        await raxToken.approve(crowdsale.address, raxAmount, {from: purchaser2}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.rejected;
        await raxToken.mint(crowdsale.address, raxAmount, {from: owner}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxTransfer(purchaser2, raxAmount, {from: owner}).should.be.rejected;
      });

      it('should increase totalSupply', async function () {
        await crowdsale.buyTokensUsingEther(investor, {value: value, from: purchaser});
        const post = await token.totalSupply();
        post.should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should increase tokensSold', async function () {
        await crowdsale.buyTokensUsingEther(investor, {value: value, from: purchaser});
        const post = await crowdsale.tokensSold();
        post.should.be.bignumber.equal(expectedTokenAmount);
      });

      it('tokensRemaining should be decreased', async function () {
        await crowdsale.buyTokensUsingEther(investor, {value: value, from: purchaser});
        const post = await crowdsale.tokensRemaining();
        tokensRemainingBefore.minus(post).should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should assign tokens to beneficiary', async function () {
        await crowdsale.buyTokensUsingEther(investor, {value: value, from: purchaser});
        const post = await token.balanceOf(investor);
        post.should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should forward funds to vault', async function () {
        var balanceBefore = await web3.eth.getBalance(vaultAddress);
        await crowdsale.buyTokensUsingEther(investor, {value: value, from: purchaser}).should.be.fulfilled;
        var balanceAfter = await web3.eth.getBalance(vaultAddress);
        balanceAfter.minus(balanceBefore).should.be.bignumber.equal(value);

        var tokens1 = await raxToken.balanceOf(vaultAddress);
        await raxToken.mint(purchaser2, amountRAX, {from: owner}).should.be.fulfilled;
        await raxToken.approve(crowdsale.address, amountRAX, {from: purchaser2}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.fulfilled;
        var tokens2 = await raxToken.balanceOf(vaultAddress);
        tokens2.should.be.bignumber.equal(tokens1.plus(amountRAX));

        var amountTransfer = bn.tokens(10**4 * 7);
        await raxToken.mint(crowdsale.address, amountTransfer, {from: owner}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxTransfer(purchaser, amountTransfer, {from: owner}).should.be.fulfilled;
        var tokens3 = await raxToken.balanceOf(vaultAddress);
        tokens3.should.be.bignumber.equal(tokens2.plus(amountTransfer));
      });

      it('should increase weiRaised', async function() {
        await crowdsale.buyTokensUsingEther(investor, {value: value, from: purchaser});
        const post = await crowdsale.weiRaised();
        post.should.be.bignumber.equal(value);
      });
    });

    describe('token max cap reached', function () {
      var amountRAX = bn.roundHalfUp((maxCap.minus(minCap)).times(ethPATRate/ethRAXRate));
      var amountRAX1 = ethRAXRate*(ether(1));
      var amountMinRAX = ethRAXRate*(ether(0.1));
      var amountETH = bn.roundHalfUp(minCap.dividedBy(ethPATRate));
      // using amountRAX + amountETH can buy maxCap tokens

      it('should return hasEnded() of true', async function() {
        await raxToken.mint(purchaser2, amountRAX.minus(amountRAX1), {from: owner}).should.be.fulfilled;
        await raxToken.approve(crowdsale.address, amountRAX.minus(amountRAX1), {from: purchaser2}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.fulfilled;
        await raxToken.mint(crowdsale.address, amountRAX1, {from: owner}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxTransfer(investor, amountRAX1, {from: owner}).should.be.fulfilled;
        await crowdsale.buyTokensUsingEther(purchaser2, {value: amountETH, from: purchaser2}).should.be.fulfilled;

        var remaining = await crowdsale.tokensRemaining();
        (await crowdsale.hasEnded()).should.be.equal(true);
        remaining.should.be.bignumber.equal(0);
      });

      it('should reject purchases that exceed max cap (Eth)', async function() {
        await crowdsale.buyTokensUsingEther(purchaser2, {value: ethMaxCap.minus(ether(1)), from: purchaser2}).should.be.fulfilled;

        await crowdsale.buyTokensUsingEther(purchaser2, {value: ether(2), from: purchaser2}).should.be.rejected;
      });

      it('should reject purchases that exceed max cap (RAX approve)', async function() {
        var amount = bn.roundHalfUp(maxCap.times(ethPATRate/ethRAXRate));
        await raxToken.mint(purchaser2, amount, {from: owner}).should.be.fulfilled;
        await raxToken.approve(crowdsale.address, amount, {from: purchaser2}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.fulfilled;

        await raxToken.mint(purchaser2, amountMinRAX, {from: owner}).should.be.fulfilled;
        await raxToken.approve(crowdsale.address, amountMinRAX, {from: purchaser2}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.rejected;
      });

      it('should reject purchases that exceed max cap (RAX transfer)', async function() {
        var amount = bn.roundHalfUp(maxCap.times(ethPATRate/ethRAXRate));
        await raxToken.mint(crowdsale.address, amount, {from: owner}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxTransfer(purchaser2, amount, {from: owner}).should.be.fulfilled;

        await raxToken.mint(crowdsale.address, amountMinRAX, {from: owner}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxTransfer(purchaser2, amountMinRAX, {from: owner}).should.be.rejected;
      });

      it('should reject purchases that exceed max cap (mixed)', async function() {
        await raxToken.mint(purchaser2, amountRAX.minus(amountRAX1), {from: owner}).should.be.fulfilled;
        await raxToken.approve(crowdsale.address, amountRAX.minus(amountRAX1), {from: purchaser2}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.fulfilled;
        await raxToken.mint(crowdsale.address, amountRAX1, {from: owner}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxTransfer(investor, amountRAX1, {from: owner}).should.be.fulfilled;
        await crowdsale.buyTokensUsingEther(purchaser2, {value: amountETH, from: purchaser2}).should.be.fulfilled;

        await crowdsale.buyTokensUsingEther(investor, {value: ether(0.1), from: investor}).should.be.rejected;

        await raxToken.mint(purchaser2, amountMinRAX, {from: owner}).should.be.fulfilled;
        await raxToken.approve(crowdsale.address, amountMinRAX, {from: purchaser2}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.rejected;
        await raxToken.mint(crowdsale.address, amountMinRAX, {from: owner}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxTransfer(purchaser2, amountMinRAX, {from: owner}).should.be.rejected;
      });

      it('should hit max cap exactly', async function() {
        await raxToken.mint(purchaser2, amountRAX.minus(amountRAX1), {from: owner}).should.be.fulfilled;
        await raxToken.approve(crowdsale.address, amountRAX.minus(amountRAX1), {from: purchaser2}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.fulfilled;
        await raxToken.mint(crowdsale.address, amountRAX1, {from: owner}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxTransfer(investor, amountRAX1, {from: owner}).should.be.fulfilled;
        await crowdsale.buyTokensUsingEther(purchaser2, {value: amountETH, from: purchaser2}).should.be.fulfilled;

        (await crowdsale.tokensRemaining()).should.be.bignumber.equal(0);
        (await crowdsale.hasEnded()).should.be.equal(true);
      });

      it('should not leave orphans', async function() {
        await raxToken.mint(purchaser2, amountRAX.minus(amountRAX1), {from: owner}).should.be.fulfilled;
        await raxToken.approve(crowdsale.address, amountRAX.minus(amountRAX1), {from: purchaser2}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.fulfilled;
        await raxToken.mint(crowdsale.address, amountRAX1, {from: owner}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxTransfer(investor, amountRAX1, {from: owner}).should.be.fulfilled;
        await crowdsale.buyTokensUsingEther(purchaser2, {value: amountETH.minus(ether(0.01)), from: purchaser2}).should.be.fulfilled;
        (await crowdsale.tokensRemaining()).should.be.bignumber.equal(0);
        (await crowdsale.hasEnded()).should.be.equal(true);
      });

      it('should not over-gift orphans', async function() {
        await raxToken.mint(purchaser2, amountRAX.minus(amountRAX1), {from: owner}).should.be.fulfilled;
        await raxToken.approve(crowdsale.address, amountRAX.minus(amountRAX1), {from: purchaser2}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.fulfilled;
        await raxToken.mint(crowdsale.address, amountRAX1, {from: owner}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxTransfer(investor, amountRAX1, {from: owner}).should.be.fulfilled;
        await crowdsale.buyTokensUsingEther(purchaser2, {value: amountETH.minus(ether(1)), from: purchaser2}).should.be.fulfilled;
        await crowdsale.buyTokensUsingEther(investor, {value: ether(0.9), from: investor}).should.be.fulfilled;
        (await crowdsale.tokensRemaining()).should.be.bignumber.gt(0);
        (await crowdsale.hasEnded()).should.be.equal(false);
      });
    });

    describe('crowdsale end time can be updated', function () {
      it('multiple managers can change endTime', async function() {
        var endTime1 = latestTime() + duration.minutes(1);
        await crowdsale.setEndTime(endTime1, {from: manager1}).should.be.fulfilled;
        var endTime2 = await crowdsale.closingTime();
        endTime2.should.be.bignumber.equal(endTime1);

        var endTime3 = latestTime() + duration.minutes(1);
        await crowdsale.setEndTime(endTime3, {from: manager2}).should.be.fulfilled;
        var endTime4 = await crowdsale.closingTime();
        endTime4.should.be.bignumber.equal(endTime3);
      });

      it('non-manager can not change endTime', async function() {
        var endTime = latestTime() + duration.minutes(1);
        await crowdsale.setEndTime(endTime, {from: investor}).should.be.rejected;
      });

      it('can buying token after change endTime', async function() {
        await increaseTimeTo(afterEndTime);
        (await crowdsale.hasEnded()).should.be.equal(true);
        // should reject buying tokens after end time
        await crowdsale.buyTokensUsingEther(investor, {value: value, from: investor}).should.be.rejected;
        await raxToken.mint(purchaser2, amountRAX, {from: owner});
        await raxToken.approve(crowdsale.address, amountRAX, {from: purchaser2});
        await crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.rejected;
        await raxToken.mint(crowdsale.address, amountRAX, {from: owner});
        await crowdsale.buyTokensUsingRaxTransfer(investor, amountRAX, {from: owner}).should.be.rejected;

        // change crowdsale endtime
        var endTime1 = latestTime() + duration.minutes(1);
        await crowdsale.setEndTime(endTime1, {from: manager1}).should.be.fulfilled;
        var endTime2 = await crowdsale.closingTime();
        endTime2.should.be.bignumber.equal(endTime1);
        // should allow to buy tokens after setting new end time
        await crowdsale.buyTokensUsingEther(investor, {value: value, from: investor}).should.be.fulfilled;
        await raxToken.mint(purchaser2, amountRAX, {from: owner});
        await raxToken.approve(crowdsale.address, amountRAX, {from: purchaser2});
        await crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.fulfilled;
        await raxToken.mint(crowdsale.address, amountRAX, {from: owner});
        await crowdsale.buyTokensUsingRaxTransfer(investor, amountRAX, {from: owner}).should.be.fulfilled;
      });
    });

    describe('pause and unpause', function () {
      it('can buy tokens when unpause', async function() {
        await crowdsale.buyTokensUsingEther(investor, {value: value, from: investor}).should.be.fulfilled;
        await raxToken.mint(purchaser2, amountRAX, {from: owner});
        await raxToken.approve(crowdsale.address, amountRAX, {from: purchaser2});
        await crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.fulfilled;
        await raxToken.mint(crowdsale.address, amountRAX, {from: owner});
        await crowdsale.buyTokensUsingRaxTransfer(investor, amountRAX, {from: owner}).should.be.fulfilled;
      });

      it('non-owner can not invoke pause()', async function() {
        await crowdsale.pause({from: manager1}).should.be.rejected;
        await crowdsale.pause({from: manager2}).should.be.rejected;
        await crowdsale.pause({from: investor}).should.be.rejected;
      });

      it('should reject buying tokens when paused', async function() {
        await crowdsale.pause({from: owner}).should.be.fulfilled;

        await crowdsale.buyTokensUsingEther(investor, {value: value, from: investor}).should.be.rejected;
        await raxToken.mint(purchaser2, amountRAX, {from: owner});
        await raxToken.approve(crowdsale.address, amountRAX, {from: purchaser2});
        await crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.rejected;
        await raxToken.mint(crowdsale.address, amountRAX, {from: owner});
        await crowdsale.buyTokensUsingRaxTransfer(investor, amountRAX, {from: owner}).should.be.rejected;
      });

      it('non-owner can not invoke unpause()', async function() {
        await crowdsale.unpause({from: manager1}).should.be.rejected;
        await crowdsale.unpause({from: manager2}).should.be.rejected;
        await crowdsale.unpause({from: investor}).should.be.rejected;
      });

      it('can unpause after paused', async function() {
        await crowdsale.pause({from: owner}).should.be.fulfilled;
        await crowdsale.buyTokensUsingEther(investor, {value: value, from: investor}).should.be.rejected;

        await crowdsale.unpause({from: owner}).should.be.fulfilled;
        await crowdsale.buyTokensUsingEther(investor, {value: value, from: investor}).should.be.fulfilled;
        await raxToken.mint(purchaser2, amountRAX, {from: owner});
        await raxToken.approve(crowdsale.address, amountRAX, {from: purchaser2});
        await crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.fulfilled;
        await raxToken.mint(crowdsale.address, amountRAX, {from: owner});
        await crowdsale.buyTokensUsingRaxTransfer(investor, amountRAX, {from: owner}).should.be.fulfilled;
      });
    });

    describe('can change crowdsale wallet', function () {
      it('multiple managers can set new wallet', async function() {
        await crowdsale.setWallet(wallet, {from: manager2}).should.be.fulfilled;
        var _wallet = await crowdsale.wallet();
        _wallet.should.be.equal(wallet);

        await crowdsale.setWallet(newWallet, {from: manager1}).should.be.fulfilled;
        var _wallet = await crowdsale.wallet();
        _wallet.should.be.equal(newWallet);
      });

      it('non-manager can not set new wallet', async function() {
        await crowdsale.setWallet(wallet, {from: owner}).should.be.rejected;
        await crowdsale.setWallet(wallet, {from: investor}).should.be.rejected;
      });

      it('funds should be forwarded to newly set wallet', async function() {
        var oldWei1 = await web3.eth.getBalance(wallet);
        var oldTokens1 = await raxToken.balanceOf(wallet);
        await crowdsale.setWallet(newWallet, {from: manager1}).should.be.fulfilled;
        var newWei1 = await web3.eth.getBalance(newWallet);
        var newTokens1 = await raxToken.balanceOf(newWallet);
        // Using Ether
        await crowdsale.buyTokensUsingEther(purchaser2, {value: ethMinCap, from: purchaser2}).should.be.fulfilled;
        // Using RAX
        var amountRAX = ether(15).times(ethRAXRate);
        await raxToken.mint(purchaser, amountRAX, {from: owner}).should.be.fulfilled;
        await raxToken.approve(crowdsale.address, amountRAX, {from: purchaser}).should.be.fulfilled;
        await crowdsale.buyTokensUsingRaxApprove(purchaser, {from: purchaser}).should.be.fulfilled;
        // Force to end crowdsale
        await increaseTimeTo(afterEndTime);
        await crowdsale.finalize({from: owner}).should.be.fulfilled;

        var oldWei2 = await web3.eth.getBalance(wallet);
        var oldTokens2 = await raxToken.balanceOf(wallet);
        var newWei2 = await web3.eth.getBalance(newWallet);
        var newTokens2 = await raxToken.balanceOf(newWallet);
        oldWei2.should.be.bignumber.equal(oldWei1);
        oldTokens2.should.be.bignumber.equal(oldTokens1);
        newWei2.should.be.bignumber.equal(newWei1.plus(ethMinCap));
        newTokens2.should.be.bignumber.equal(newTokens1.plus(amountRAX));
      });
    });
  });

  async function deployToken(regUsers) {
    return await PATToken.new(regUsers.address, id,
                              managers, name, symbol, fixedLinkDoc,
                              fixedHashDoc, varLinkDoc, varHashDoc);
  }

  async function deployContract() {
    token = await deployToken(regUsers);
    startTime = latestTime() + duration.minutes(1);
    endTime = startTime + duration.hours(1);
    afterEndTime = endTime + duration.seconds(1);

    return await PATSale.new(regUsers.address, raxToken.address,
                             token.address, manageListingFee.address,
                             manageReserveFunds.address, startTime,
                             endTime, wallet, minCap, maxCap, ethPATRate,
                             ethRAXRate, listingFeeRate, reserveFundRate);
  }

  async function deployCrowdsaleAndToken() {
    token = await deployToken(regUsers);
    startTime = latestTime() + duration.minutes(1);
    endTime = startTime + duration.hours(1);
    afterEndTime = endTime + duration.seconds(1);

    crowdsale = await PATSale.new(regUsers.address, raxToken.address,
                                  token.address, manageListingFee.address,
                                  manageReserveFunds.address, startTime,
                                  endTime, wallet, minCap, maxCap, ethPATRate,
                                  ethRAXRate, listingFeeRate, reserveFundRate);

    var ret = [crowdsale, token];
    return ret;
  }
});
