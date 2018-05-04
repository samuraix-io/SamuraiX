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

const RegisteredUsers = artifacts.require("./RegisteredUsers.sol");
const PATToken = artifacts.require("./PATToken.sol");
const RAXToken = artifacts.require("./RAXToken.sol");
const PATSale = artifacts.require("./PATSale.sol");
const ManageListingFee = artifacts.require("./ManageListingFee.sol");
const ManageReserveFunds = artifacts.require("./ManageReserveFunds.sol");


contract('ManageListingFee and ManageReserveFunds', async function([dump, manager, wallet, investor, purchaser, visitor]) {

  before(async function() {
    //Advance to the next block to correctly read time in the solidity "now" function
    await advanceBlock()
  });

  describe('distribute', function () {
    beforeEach(async function() {
      this.startTime = latestTime() + duration.minutes(1);
      this.endTime = this.startTime + duration.hours(1);
      const id = 4
      let fixed_linkDoc = 'pat_doc_4';
      let fixed_hashDoc = 'pat_hash_4';
      let var_linkDoc = 'var_patDoc4';
      let var_hashDoc = 'var_hashDoc4';
      let listingFeeRate = 5;
      let reserveFundRate = 20;
      let name = 'Namepat4';
      let symbol = 'Symbol4';
      let minCap = 50*(10**6)*(10**18);
      let maxCap = 75*(10**6)*(10**18);
      let ethPATRate = 75000;
      let ethRAXRate = 75000;
      let managers = [manager];
      let samuraiXWallet = "0x1df62f291b2e969fb0849d99d9ce41e2f137006e";
      let purchaser2 = "0x28a8746e75304c0780e011bed21c72cd78cd535e";
      this.registered_user = await RegisteredUsers.deployed();
      this.manageListingFee = await ManageListingFee.deployed();
      this.manageReserveFunds = await ManageReserveFunds.deployed();
      this.raxToken = await RAXToken.new(this.registered_user.address);
      this.registered_user.addRegisteredUser(investor);
      this.registered_user.addRegisteredUser(purchaser);
      this.registered_user.addRegisteredUser(purchaser2);

      this.token = await PATToken.new(this.registered_user.address, id, managers, name,
                                      symbol, fixed_linkDoc, fixed_hashDoc, var_linkDoc,
                                      var_hashDoc);
      this.crowdsale = await PATSale.new(this.registered_user.address, this.raxToken.address,
                                        this.token.address, this.manageListingFee.address,
                                        this.manageReserveFunds.address, this.startTime,
                                        this.endTime, wallet, minCap, maxCap, ethPATRate,
                                        ethRAXRate, listingFeeRate, reserveFundRate);

      this.afterEndTime = this.endTime + duration.seconds(1);
      const token_owner = await this.token.owner();
      await this.token.transferOwnership(this.crowdsale.address, {from: token_owner});
      const owner = await this.crowdsale.owner();
      await this.crowdsale.mintManagedTokens({from: owner}).should.be.fulfilled;
      await increaseTimeTo(this.startTime);
    });

    describe('distribute listing fee', function () {
      var listtingFeeTokens = new BigNumber(5*(10**6)*(10**18));
      let purchaser2 = "0x28a8746e75304c0780e011bed21c72cd78cd535e";
      it('should distribute listing fee to samuraiXWallet', async function() {
        var samuraiXWallet = "0x1df62f291b2e969fb0849d99d9ce41e2f137006e";
        await this.registered_user.addRegisteredUser(samuraiXWallet);
        await this.manageListingFee.distributeListingFee(this.token.address, {from: manager}).should.be.fulfilled;
        var tokensAfter = await this.token.balanceOf(samuraiXWallet);
        tokensAfter.should.be.bignumber.equal(listtingFeeTokens);
      });

      it('should reject distribute listing fee to samuraiXWallet twice', async function() {
        var samuraiXWallet = "0x1df62f291b2e969fb0849d99d9ce41e2f137006e";
        await this.registered_user.addRegisteredUser(samuraiXWallet);
        await this.manageListingFee.distributeListingFee(this.token.address, {from: manager}).should.be.fulfilled;
        await this.manageListingFee.distributeListingFee(this.token.address, {from: manager}).should.be.rejected;
        var tokensAfter = await this.token.balanceOf(samuraiXWallet);
        tokensAfter.should.be.bignumber.equal(listtingFeeTokens);
      });
    });

    describe('distribute reverve fund', function () {
      let purchaser2 = "0x28a8746e75304c0780e011bed21c72cd78cd535e";
      it('should distribute reserve fund to other address', async function() {
        var tokensBefore = await this.token.balanceOf(purchaser2);
        var amountTokens = (10**6)*(10**18);
        await this.manageReserveFunds.withdrawReserveFunds(this.token.address, purchaser2, amountTokens, {from: manager}).should.be.fulfilled;
        var tokensAfter = await this.token.balanceOf(purchaser2);
        tokensAfter.should.be.bignumber.equal(amountTokens);
      });

      it('should distribute reserve fund amount equal amount seted', async function() {
        // amount reserveFund = 20% total tokens = 20*(10**6)*(10**18)
        var tokensBefore = await this.token.balanceOf(purchaser2);
        var amountTokens1 = (10**6)*(10**18);
        var amountTokens2 = 20*(10**6)*(10**18);
        var amountTokens3 = 19*(10**6)*(10**18);
        await this.manageReserveFunds.withdrawReserveFunds(this.token.address, purchaser2, amountTokens1, {from: manager}).should.be.fulfilled;
        await this.manageReserveFunds.withdrawReserveFunds(this.token.address, purchaser2, amountTokens2, {from: manager}).should.be.rejected;
        await this.manageReserveFunds.withdrawReserveFunds(this.token.address, purchaser2, amountTokens3, {from: manager}).should.be.fulfilled;
        var tokensAfter = await this.token.balanceOf(purchaser2);
        tokensAfter.should.be.bignumber.equal(amountTokens2);
      });
    });
  });

  describe('distribute listingfee and reserve fund odd', function () {
    beforeEach(async function() {
      this.startTime = latestTime() + duration.minutes(1);
      this.endTime = this.startTime + duration.hours(1);
      const id = 4
      let fixed_linkDoc = 'pat_doc_4';
      let fixed_hashDoc = 'pat_hash_4';
      let var_linkDoc = 'var_patDoc4';
      let var_hashDoc = 'var_hashDoc4';
      let listingFeeRate = 7;
      let reserveFundRate = 13;
      let name = 'Namepat4';
      let symbol = 'Symbol4';
      let minCap = 50*(10**6)*(10**18);
      let maxCap = 80*(10**6)*(10**18);
      let ethPATRate = 75000;
      let ethRAXRate = 75000;
      let managers = [manager];
      let samuraiXWallet = "0x1df62f291b2e969fb0849d99d9ce41e2f137006e";
      let purchaser2 = "0x28a8746e75304c0780e011bed21c72cd78cd535e";
      this.registered_user = await RegisteredUsers.deployed();
      this.manageListingFee = await ManageListingFee.deployed();
      this.manageReserveFunds = await ManageReserveFunds.deployed();
      this.raxToken = await RAXToken.new(this.registered_user.address);
      this.registered_user.addRegisteredUser(investor);
      this.registered_user.addRegisteredUser(purchaser);
      this.registered_user.addRegisteredUser(purchaser2);

      this.token = await PATToken.new(this.registered_user.address, id, managers, name,
                                      symbol, fixed_linkDoc, fixed_hashDoc, var_linkDoc,
                                      var_hashDoc);
      this.crowdsale = await PATSale.new(this.registered_user.address, this.raxToken.address,
                                        this.token.address, this.manageListingFee.address,
                                        this.manageReserveFunds.address, this.startTime,
                                        this.endTime, wallet, minCap, maxCap, ethPATRate,
                                        ethRAXRate, listingFeeRate, reserveFundRate);

      this.afterEndTime = this.endTime + duration.seconds(1);
      const token_owner = await this.token.owner();
      await this.token.transferOwnership(this.crowdsale.address, {from: token_owner});
      const owner = await this.crowdsale.owner();
      await this.crowdsale.mintManagedTokens({from: owner}).should.be.fulfilled;
      await increaseTimeTo(this.startTime);
    });

    describe('distribute listing fee', function () {
      let managers = [manager];
      var listtingFeeTokens = new BigNumber(7*(10**6)*(10**18));
      let purchaser2 = "0x28a8746e75304c0780e011bed21c72cd78cd535e";
      it('should distribute listing fee to samuraiXWallet', async function() {
        var samuraiXWallet = "0x1df62f291b2e969fb0849d99d9ce41e2f137006e";
        await this.registered_user.addRegisteredUser(samuraiXWallet);
        await this.manageListingFee.distributeListingFee(this.token.address, {from: manager}).should.be.fulfilled;
        var tokensAfter = await this.token.balanceOf(samuraiXWallet);
        tokensAfter.should.be.bignumber.equal(listtingFeeTokens);
      });

      it('should distribute listing fee to samuraiXWallet', async function() {
        var samuraiXWallet = "0x1df62f291b2e969fb0849d99d9ce41e2f137006e";
        await this.registered_user.addRegisteredUser(samuraiXWallet);
        var res = await this.manageListingFee.distributeListingFee(this.token.address, {from: manager}).should.be.fulfilled;
        var tokensAfter = await this.token.balanceOf(samuraiXWallet);
        tokensAfter.should.be.bignumber.equal(listtingFeeTokens);

        const {logs} = res;

        const event = logs.find(e => e.event === 'FundsDistributed');
        should.exist(event);
        event.args._token.should.be.equal(this.token.address);
        event.args._manager.should.be.equal(managers[0]);
        event.args._beneficiary.should.be.equal(samuraiXWallet);
        event.args._amount.should.be.bignumber.equal(listtingFeeTokens);
      });

      it('should reject distribute listing fee to samuraiXWallet twice', async function() {
        var samuraiXWallet = "0x1df62f291b2e969fb0849d99d9ce41e2f137006e";
        await this.registered_user.addRegisteredUser(samuraiXWallet);
        await this.manageListingFee.distributeListingFee(this.token.address, {from: manager}).should.be.fulfilled;
        await this.manageListingFee.distributeListingFee(this.token.address, {from: manager}).should.be.rejected;
        var tokensAfter = await this.token.balanceOf(samuraiXWallet);
        tokensAfter.should.be.bignumber.equal(listtingFeeTokens);
      });
    });

    describe('distribute reverve fund', function () {
      let purchaser2 = "0x28a8746e75304c0780e011bed21c72cd78cd535e";
      it('should distribute reserve fund to other address', async function() {
        var tokensBefore = await this.token.balanceOf(purchaser2);
        var amountTokens = (123456)*(10**18);
        await this.manageReserveFunds.withdrawReserveFunds(this.token.address, purchaser2, amountTokens, {from: manager}).should.be.fulfilled;
        var tokensAfter = await this.token.balanceOf(purchaser2);
        tokensAfter.should.be.bignumber.equal(amountTokens);
      });
    });

    describe('change SamuraiXWallet', function () {
      var owner = '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1';
      var newWallet = '0x3e5e9111ae8eb78fe1cc3bb8915d5d461f3ef9a9';
      it('should fulfille when owner set new samuraiXWallet', async function() {
        await this.manageListingFee.setSammuraiXWallet(newWallet, {from: owner}).should.be.fulfilled;
        var wallet = await this.manageListingFee.samuraiXWallet();
        wallet.should.be.equal(newWallet);
      });

      it('should fulfille when not owner set new samuraiXWallet', async function() {
        await this.manageListingFee.setSammuraiXWallet(newWallet, {from: owner}).should.be.rejected;
      });
    });
  });
});
