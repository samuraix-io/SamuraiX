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
const hasNoEther = require("./HasNoEther.js");

const RegisteredUsers = artifacts.require("./RegisteredUsers.sol");
const PATToken = artifacts.require("./PATToken.sol");
const RAXToken = artifacts.require("./RAXToken.sol");
const PATSale = artifacts.require("./PATSale.sol");
const ManageListingFee = artifacts.require("./ManageListingFee.sol");
const ManageReserveFunds = artifacts.require("./ManageReserveFunds.sol");


contract('ManageListingFee and ManageReserveFunds', async function(accounts) {

  let listingFeeRate = 5;  // %
  let reserveFundsRate = 20;  // %
  let listingFeeTokens = bn.tokens(listingFeeRate * (10**6));
  let reserveFundsTokens = bn.tokens(reserveFundsRate * (10**6));
  let minCap = bn.tokens(50*(10**6));
  let maxCap = bn.tokens(75*(10**6));
  let id = 4;
  let fixedLinkDoc = 'https://drive.google.com/open?id=1JYpdAqubjvHvUuurwX7om0dDcA5ycRhc';
  let fixedHashDoc = '323202411a8393971877e50045576ed7';
  let varLinkDoc = 'https://drive.google.com/open?id=1ZaFg2XtGdTwnkvaj-Kra4cRW_ia6tvBY';
  let varHashDoc = '743f5d72288889e94c076f8b21e07168';
  let name = 'PAT_4';
  let symbol = 'PAT';
  let ethPATRate = 75000;
  let ethRAXRate = 75000;
  let owner = accounts[0];
  let manager1 = accounts[1];
  let manager2 = accounts[2];
  let wallet = accounts[3];
  let wallet1 = accounts[4];
  let wallet2 = accounts[5];
  let samuraiXWallet = accounts[6];
  let investor = accounts[7];
  let purchaser = accounts[8];
  let visitor = accounts[9];
  let managers = [manager1, manager2];
  let regUsers;
  let manageListingFee;
  let manageReserveFunds;
  let token;
  let raxToken;
  let crowdsale;
  let afterEndTime;

  before(async function() {
    //Advance to the next block to correctly read time in the solidity "now" function
    await advanceBlock()

    regUsers = await RegisteredUsers.deployed();
    regUsers.addRegisteredUser(investor, false);
    regUsers.addRegisteredUser(purchaser, false);
    regUsers.addRegisteredUser(samuraiXWallet, false);
    regUsers.addRegisteredUser(wallet1, false);
    regUsers.addRegisteredUser(wallet2, false);

    manageListingFee = await deployManageListingFee();
    manageReserveFunds = await deployManageReserveFunds();
  });

  describe('ClaimableEx', function() {
    describe('ManageListingFee', function() {
      claimableEx.check(accounts, deployManageListingFee);
    });

    describe('ManageReserveFunds', function() {
      claimableEx.check(accounts, deployManageReserveFunds);
    });
  });

  describe('HasNoEther', function() {
    describe('ManageListingFee', function() {
      hasNoEther.check(accounts, deployManageListingFee);
    });

    describe('ManageReserveFunds', function() {
      hasNoEther.check(accounts, deployManageReserveFunds);
    });
  });

  describe('distributes manageable funds', function () {
    beforeEach(async function() {
      var startTime = latestTime() + duration.minutes(1);
      var endTime = startTime + duration.hours(1);
      raxToken = await RAXToken.new(regUsers.address);
      token = await PATToken.new(regUsers.address, id, managers, name, symbol,
                                 fixedLinkDoc, fixedHashDoc, varLinkDoc, varHashDoc);
      crowdsale = await PATSale.new(regUsers.address, raxToken.address,
                                    token.address, manageListingFee.address,
                                    manageReserveFunds.address, startTime,
                                    endTime, wallet, minCap, maxCap, ethPATRate,
                                    ethRAXRate, listingFeeRate, reserveFundsRate);

      afterEndTime = endTime + duration.seconds(1);
      await token.transferOwnership(crowdsale.address);
      await crowdsale.claimTokenOwnership();
      await crowdsale.mintManagedTokens().should.be.fulfilled;
      await increaseTimeTo(startTime);
    });

    describe('distributes listing fee', function () {
      it('should be rejected when crowdsale does not end', async function() {
        await manageListingFee.distributeListingFee(token.address, {from: manager1}).should.be.rejected;
      });

      it('isLocked() should return true when crowdsale does not end', async function() {
        (await manageListingFee.isLocked(token.address)).should.be.equal(true);
      });

      it('should be succeed when crowdsale ended', async function() {
        await increaseTimeTo(afterEndTime);
        await crowdsale.finalize();
        (await manageListingFee.isLocked(token.address)).should.be.equal(false);

        var tokens1 = await token.balanceOf(samuraiXWallet);
        await manageListingFee.distributeListingFee(token.address, {from: manager1}).should.be.fulfilled;
        var tokens2 = await token.balanceOf(samuraiXWallet);
        tokens2.should.be.bignumber.equal(tokens1.plus(listingFeeTokens));
      });

      it("should log FundsDistributed event", async function () {
        await increaseTimeTo(afterEndTime);
        await crowdsale.finalize();
        (await manageListingFee.isLocked(token.address)).should.be.equal(false);

        const {logs} = await manageListingFee.distributeListingFee(token.address, {from: manager1}).should.be.fulfilled;
        const event = logs.find(e => e.event === 'FundsDistributed');
        event.should.exist;
        (event.args._token).should.equal(token.address);
        (event.args._manager).should.be.bignumber.equal(manager1);
        (event.args._beneficiary).should.be.bignumber.equal(samuraiXWallet);
        (event.args._amount).should.be.bignumber.equal(listingFeeTokens);
      });

      it('should be rejected when distributes listing fee twice', async function() {
        await increaseTimeTo(afterEndTime);
        await crowdsale.finalize();
        (await manageListingFee.isLocked(token.address)).should.be.equal(false);

        var tokens1 = await token.balanceOf(samuraiXWallet);
        await manageListingFee.distributeListingFee(token.address, {from: manager1}).should.be.fulfilled;
        await manageListingFee.distributeListingFee(token.address, {from: manager1}).should.be.rejected;
        var tokens2 = await token.balanceOf(samuraiXWallet);
        tokens2.should.be.bignumber.equal(tokens1.plus(listingFeeTokens));
      });

      it('non-manager can not distribute listing fee', async function() {
        await increaseTimeTo(afterEndTime);
        await crowdsale.finalize();
        (await manageListingFee.isLocked(token.address)).should.be.equal(false);

        await manageListingFee.distributeListingFee(token.address, {from: owner}).should.be.rejected;
        await manageListingFee.distributeListingFee(token.address, {from: visitor}).should.be.rejected;
      });
    });

    describe('distributes reverving funds', function () {
      it('should be rejected when crowdsale does not end', async function() {
        await manageReserveFunds.withdrawReserveFunds(token.address, wallet1,  bn.tokens(10**6), {from: manager1}).should.be.rejected;
      });

      it('isLocked() should return true when crowdsale does not end', async function() {
        (await manageReserveFunds.isLocked(token.address)).should.be.equal(true);
      });

      it('should be succeed when crowdsale ended', async function() {
        await increaseTimeTo(afterEndTime);
        await crowdsale.finalize();
        (await manageReserveFunds.isLocked(token.address)).should.be.equal(false);

        var amountTokens = bn.tokens(10**6);
        var tokens1 = await token.balanceOf(wallet1);
        await manageReserveFunds.withdrawReserveFunds(token.address, wallet1, amountTokens, {from: manager1}).should.be.fulfilled;
        var tokens2 = await token.balanceOf(wallet1);
        tokens2.should.be.bignumber.equal(tokens1.plus(amountTokens));
      });

      it("should log FundsDistributed event", async function () {
        await increaseTimeTo(afterEndTime);
        await crowdsale.finalize();
        (await manageReserveFunds.isLocked(token.address)).should.be.equal(false);

        var amountTokens = bn.tokens(10);
        const {logs} = await manageReserveFunds.withdrawReserveFunds(token.address, wallet1, amountTokens, {from: manager1}).should.be.fulfilled;
        const event = logs.find(e => e.event === 'FundsDistributed');
        event.should.exist;
        (event.args._token).should.equal(token.address);
        (event.args._manager).should.be.bignumber.equal(manager1);
        (event.args._beneficiary).should.be.bignumber.equal(wallet1);
        (event.args._amount).should.be.bignumber.equal(amountTokens);
      });

      it('non-manager can not withdraw reserving funds', async function() {
        await increaseTimeTo(afterEndTime);
        await crowdsale.finalize();
        (await manageReserveFunds.isLocked(token.address)).should.be.equal(false);

        var amountTokens = bn.tokens(10);
        await manageReserveFunds.withdrawReserveFunds(token.address, wallet1, amountTokens, {from: owner}).should.be.rejected;
        await manageReserveFunds.withdrawReserveFunds(token.address, wallet1, amountTokens, {from: visitor}).should.be.rejected;
      });

      it('can not withdraw an amount of tokens which exceeds the reserve rate', async function() {
        await increaseTimeTo(afterEndTime);
        await crowdsale.finalize();
        (await manageReserveFunds.isLocked(token.address)).should.be.equal(false);

        // reserve funds rate = 20% of total tokens (which will be 20*(10**6) units)
        var amountTokens1 = bn.tokens(10**6);
        var amountTokens2 = bn.tokens(20*(10**6));
        var amountTokens3 = bn.tokens(19*(10**6));
        var tokens1 = await token.balanceOf(wallet1);
        await manageReserveFunds.withdrawReserveFunds(token.address, wallet1, amountTokens1, {from: manager1}).should.be.fulfilled;
        await manageReserveFunds.withdrawReserveFunds(token.address, wallet1, amountTokens2, {from: manager1}).should.be.rejected;
        await manageReserveFunds.withdrawReserveFunds(token.address, wallet1, amountTokens3, {from: manager1}).should.be.fulfilled;
        var tokens2 = await token.balanceOf(wallet1);
        tokens2.should.be.bignumber.equal(tokens1.plus(amountTokens1.plus(amountTokens3)));
      });
    });

    describe('multiple managers', function () {
      it('each manager can control manageable tasks', async function() {
        await increaseTimeTo(afterEndTime);
        await crowdsale.finalize();
        (await manageListingFee.isLocked(token.address)).should.be.equal(false);
        (await manageReserveFunds.isLocked(token.address)).should.be.equal(false);

        var amountTokens1 = bn.tokens(10**6);
        var amountTokens2 = bn.tokens(10*(10**6));
        var tokens1 = await token.balanceOf(samuraiXWallet);
        await manageListingFee.distributeListingFee(token.address, {from: manager1}).should.be.fulfilled;
        var tokens2 = await token.balanceOf(samuraiXWallet);
        tokens2.should.be.bignumber.equal(tokens1.plus(listingFeeTokens));

        var tokens3 = await token.balanceOf(wallet1);
        await manageReserveFunds.withdrawReserveFunds(token.address, wallet1, amountTokens1, {from: manager2}).should.be.fulfilled;
        var tokens4 = await token.balanceOf(wallet1);
        tokens4.should.be.bignumber.equal(amountTokens1.plus(tokens3));
        await manageReserveFunds.withdrawReserveFunds(token.address, wallet1, amountTokens2, {from: manager1}).should.be.fulfilled;
        var tokens5 = await token.balanceOf(wallet1);
        tokens5.should.be.bignumber.equal(amountTokens2.plus(tokens4));
      });
    });

    describe('owner can change SamuraiX platform wallet', function () {
      it('should be fulfilled when the owner sets a new SamuraiX platform wallet', async function() {
        await manageListingFee.setSammuraiXWallet(wallet1, {from: owner}).should.be.fulfilled;
        var wallet = await manageListingFee.samuraiXWallet();
        wallet.should.be.equal(wallet1);
      });

      it('non-owner can not set a new SamuraiX platform wallet', async function() {
        await manageListingFee.setSammuraiXWallet(wallet2, {from: manager1}).should.be.rejected;
      });

      it('listing fee should be distributed to the newly set SamuraiX platform wallet', async function() {
        await increaseTimeTo(afterEndTime);
        await crowdsale.finalize();
        (await manageListingFee.isLocked(token.address)).should.be.equal(false);

        var tokens1 = await token.balanceOf(samuraiXWallet);
        var tokens2 = await token.balanceOf(wallet1);
        await manageListingFee.distributeListingFee(token.address, {from: manager1}).should.be.fulfilled;
        var tokens3 = await token.balanceOf(samuraiXWallet);
        var tokens4 = await token.balanceOf(wallet1);
        tokens4.should.be.bignumber.equal(tokens2.plus(listingFeeTokens));
        tokens3.should.be.bignumber.equal(tokens1);
      });
    });
  });

  async function deployManageListingFee() {
    return await ManageListingFee.new(samuraiXWallet);
  }

  async function deployManageReserveFunds() {
    return await ManageReserveFunds.new();
  }
});
