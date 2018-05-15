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


contract('ManageListingFee and ManageReserveFunds', async function([owner, manager1, wallet, investor, purchaser, visitor, manager2, wallet1, wallet2, samuraiXWallet]) {

  let listingFeeRate = 5;  // %
  let reserveFundsRate = 20;  // %
  let listingFeeTokens = bn.tokens(listingFeeRate * (10**6));
  let reserveFundsTokens = bn.tokens(reserveFundsRate * (10**6));
  let minCap = bn.tokens(50*(10**6));
  let maxCap = bn.tokens(75*(10**6));
  let id = 4;
  let fixedLinkDoc = 'pat_doc_4';
  let fixedHashDoc = 'pat_hash_4';
  let varLinkDoc = 'var_patDoc4';
  let varHashDoc = 'var_hashDoc4';
  let name = 'Namepat4';
  let symbol = 'Symbol4';
  let ethPATRate = 75000;
  let ethRAXRate = 75000;
  let managers = [manager1, manager2];

  before(async function() {
    //Advance to the next block to correctly read time in the solidity "now" function
    await advanceBlock()
  });

  describe('distributes manageable funds', function () {
    before(async function() {
      this.registeredUser = await RegisteredUsers.deployed();
      this.registeredUser.addRegisteredUser(investor, false);
      this.registeredUser.addRegisteredUser(purchaser, false);
      this.registeredUser.addRegisteredUser(samuraiXWallet, false);
      this.registeredUser.addRegisteredUser(wallet1, false);
      this.registeredUser.addRegisteredUser(wallet2, false);
    });

    beforeEach(async function() {
      this.startTime = latestTime() + duration.minutes(1);
      this.endTime = this.startTime + duration.hours(1);
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
                                        ethRAXRate, listingFeeRate, reserveFundsRate);

      this.afterEndTime = this.endTime + duration.seconds(1);
      const token_owner = await this.token.owner();
      await this.token.transferOwnership(this.crowdsale.address, {from: token_owner});
      await this.crowdsale.mintManagedTokens({from: owner}).should.be.fulfilled;
      await increaseTimeTo(this.startTime);
    });

    describe('distributes listing fee', function () {
      it('should be rejected when crowdsale does not end', async function() {
        await this.manageListingFee.distributeListingFee(this.token.address, {from: manager1}).should.be.rejected;
      });

      it('isLocked() should return true when crowdsale does not end', async function() {
        (await this.manageListingFee.isLocked(this.token.address)).should.be.equal(true);
      });

      it('should be succeed when crowdsale ended', async function() {
        await increaseTimeTo(this.afterEndTime);
        await this.crowdsale.finalize();
        (await this.manageListingFee.isLocked(this.token.address)).should.be.equal(false);

        var tokens1 = await this.token.balanceOf(samuraiXWallet);
        await this.manageListingFee.distributeListingFee(this.token.address, {from: manager1}).should.be.fulfilled;
        var tokens2 = await this.token.balanceOf(samuraiXWallet);
        tokens2.should.be.bignumber.equal(tokens1.plus(listingFeeTokens));
      });

      it("should log FundsDistributed event", async function () {
        await increaseTimeTo(this.afterEndTime);
        await this.crowdsale.finalize();
        (await this.manageListingFee.isLocked(this.token.address)).should.be.equal(false);

        const {logs} = await this.manageListingFee.distributeListingFee(this.token.address, {from: manager1}).should.be.fulfilled;
        const event = logs.find(e => e.event === 'FundsDistributed');
        event.should.exist;
        (event.args._token).should.equal(this.token.address);
        (event.args._manager).should.be.bignumber.equal(manager1);
        (event.args._beneficiary).should.be.bignumber.equal(samuraiXWallet);
        (event.args._amount).should.be.bignumber.equal(listingFeeTokens);
      });

      it('should be rejected when distributes listing fee twice', async function() {
        await increaseTimeTo(this.afterEndTime);
        await this.crowdsale.finalize();
        (await this.manageListingFee.isLocked(this.token.address)).should.be.equal(false);

        var tokens1 = await this.token.balanceOf(samuraiXWallet);
        await this.manageListingFee.distributeListingFee(this.token.address, {from: manager1}).should.be.fulfilled;
        await this.manageListingFee.distributeListingFee(this.token.address, {from: manager1}).should.be.rejected;
        var tokens2 = await this.token.balanceOf(samuraiXWallet);
        tokens2.should.be.bignumber.equal(tokens1.plus(listingFeeTokens));
      });

      it('non-manager can not distribute listing fee', async function() {
        await increaseTimeTo(this.afterEndTime);
        await this.crowdsale.finalize();
        (await this.manageListingFee.isLocked(this.token.address)).should.be.equal(false);

        await this.manageListingFee.distributeListingFee(this.token.address, {from: owner}).should.be.rejected;
        await this.manageListingFee.distributeListingFee(this.token.address, {from: visitor}).should.be.rejected;
      });
    });

    describe('distributes reverving funds', function () {
      it('should be rejected when crowdsale does not end', async function() {
        await this.manageReserveFunds.withdrawReserveFunds(this.token.address, wallet1,  bn.tokens(10**6), {from: manager1}).should.be.rejected;
      });

      it('isLocked() should return true when crowdsale does not end', async function() {
        (await this.manageReserveFunds.isLocked(this.token.address)).should.be.equal(true);
      });

      it('should be succeed when crowdsale ended', async function() {
        await increaseTimeTo(this.afterEndTime);
        await this.crowdsale.finalize();
        (await this.manageReserveFunds.isLocked(this.token.address)).should.be.equal(false);

        var amountTokens = bn.tokens(10**6);
        var tokens1 = await this.token.balanceOf(wallet1);
        await this.manageReserveFunds.withdrawReserveFunds(this.token.address, wallet1, amountTokens, {from: manager1}).should.be.fulfilled;
        var tokens2 = await this.token.balanceOf(wallet1);
        tokens2.should.be.bignumber.equal(tokens1.plus(amountTokens));
      });

      it("should log FundsDistributed event", async function () {
        await increaseTimeTo(this.afterEndTime);
        await this.crowdsale.finalize();
        (await this.manageReserveFunds.isLocked(this.token.address)).should.be.equal(false);

        var amountTokens = bn.tokens(10);
        const {logs} = await this.manageReserveFunds.withdrawReserveFunds(this.token.address, wallet1, amountTokens, {from: manager1}).should.be.fulfilled;
        const event = logs.find(e => e.event === 'FundsDistributed');
        event.should.exist;
        (event.args._token).should.equal(this.token.address);
        (event.args._manager).should.be.bignumber.equal(manager1);
        (event.args._beneficiary).should.be.bignumber.equal(wallet1);
        (event.args._amount).should.be.bignumber.equal(amountTokens);
      });

      it('non-manager can not withdraw reserving funds', async function() {
        await increaseTimeTo(this.afterEndTime);
        await this.crowdsale.finalize();
        (await this.manageReserveFunds.isLocked(this.token.address)).should.be.equal(false);

        var amountTokens = bn.tokens(10);
        await this.manageReserveFunds.withdrawReserveFunds(this.token.address, wallet1, amountTokens, {from: owner}).should.be.rejected;
        await this.manageReserveFunds.withdrawReserveFunds(this.token.address, wallet1, amountTokens, {from: visitor}).should.be.rejected;
      });

      it('can not withdraw an amount of tokens which exceeds the reserve rate', async function() {
        await increaseTimeTo(this.afterEndTime);
        await this.crowdsale.finalize();
        (await this.manageReserveFunds.isLocked(this.token.address)).should.be.equal(false);

        // reserve funds rate = 20% of total tokens (which will be 20*(10**6) units)
        var amountTokens1 = bn.tokens(10**6);
        var amountTokens2 = bn.tokens(20*(10**6));
        var amountTokens3 = bn.tokens(19*(10**6));
        var tokens1 = await this.token.balanceOf(wallet1);
        await this.manageReserveFunds.withdrawReserveFunds(this.token.address, wallet1, amountTokens1, {from: manager1}).should.be.fulfilled;
        await this.manageReserveFunds.withdrawReserveFunds(this.token.address, wallet1, amountTokens2, {from: manager1}).should.be.rejected;
        await this.manageReserveFunds.withdrawReserveFunds(this.token.address, wallet1, amountTokens3, {from: manager1}).should.be.fulfilled;
        var tokens2 = await this.token.balanceOf(wallet1);
        tokens2.should.be.bignumber.equal(tokens1.plus(amountTokens1.plus(amountTokens3)));
      });
    });

    describe('multiple managers', function () {
      it('each manager can control manageable tasks', async function() {
        await increaseTimeTo(this.afterEndTime);
        await this.crowdsale.finalize();
        (await this.manageListingFee.isLocked(this.token.address)).should.be.equal(false);
        (await this.manageReserveFunds.isLocked(this.token.address)).should.be.equal(false);

        var amountTokens1 = bn.tokens(10**6);
        var amountTokens2 = bn.tokens(10*(10**6));
        var tokens1 = await this.token.balanceOf(samuraiXWallet);
        await this.manageListingFee.distributeListingFee(this.token.address, {from: manager1}).should.be.fulfilled;
        var tokens2 = await this.token.balanceOf(samuraiXWallet);
        tokens2.should.be.bignumber.equal(tokens1.plus(listingFeeTokens));

        var tokens3 = await this.token.balanceOf(wallet1);
        await this.manageReserveFunds.withdrawReserveFunds(this.token.address, wallet1, amountTokens1, {from: manager2}).should.be.fulfilled;
        var tokens4 = await this.token.balanceOf(wallet1);
        tokens4.should.be.bignumber.equal(amountTokens1.plus(tokens3));
        await this.manageReserveFunds.withdrawReserveFunds(this.token.address, wallet1, amountTokens2, {from: manager1}).should.be.fulfilled;
        var tokens5 = await this.token.balanceOf(wallet1);
        tokens5.should.be.bignumber.equal(amountTokens2.plus(tokens4));
      });
    });

    describe('owner can change SamuraiX platform wallet', function () {
      it('should be fulfilled when the owner sets a new SamuraiX platform wallet', async function() {
        await this.manageListingFee.setSammuraiXWallet(wallet1, {from: owner}).should.be.fulfilled;
        var wallet = await this.manageListingFee.samuraiXWallet();
        wallet.should.be.equal(wallet1);
      });

      it('non-owner can not set a new SamuraiX platform wallet', async function() {
        await this.manageListingFee.setSammuraiXWallet(wallet2, {from: manager1}).should.be.rejected;
      });

      it('listing fee should be distributed to the newly set SamuraiX platform wallet', async function() {
        await increaseTimeTo(this.afterEndTime);
        await this.crowdsale.finalize();
        (await this.manageListingFee.isLocked(this.token.address)).should.be.equal(false);

        var tokens1 = await this.token.balanceOf(samuraiXWallet);
        var tokens2 = await this.token.balanceOf(wallet1);
        await this.manageListingFee.distributeListingFee(this.token.address, {from: manager1}).should.be.fulfilled;
        var tokens3 = await this.token.balanceOf(samuraiXWallet);
        var tokens4 = await this.token.balanceOf(wallet1);
        tokens4.should.be.bignumber.equal(tokens2.plus(listingFeeTokens));
        tokens3.should.be.bignumber.equal(tokens1);
      });
    });
  });
});
