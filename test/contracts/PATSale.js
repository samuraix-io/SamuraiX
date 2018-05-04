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


contract('PATSale', async function([dump, manager, wallet, investor, purchaser, visitor]) {
  before(async function() {
    //Advance to the next block to correctly read time in the solidity "now" function
    await advanceBlock()
  });

  describe('deployment', function() {
    before(async function() {
      this.token = await PATToken.deployed();
      this.crowdsale = await PATSale.deployed();
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
      this.startTime = latestTime() + duration.minutes(1);
      this.endTime = this.startTime + duration.hours(1);
      const id = 3
      let fixed_linkDoc = 'pat_doc_4';
      let fixed_hashDoc = 'pat_hash_4';
      let var_linkDoc = 'var_patDoc4';
      let var_hashDoc = 'var_hashDoc4';
      let listingFeeRate = 5;
      let reserveFundRate = 10;
      let name = 'Namepat4';
      let symbol = 'Symbol4';
      let minCap = 50*(10**6)*(10**18);
      let maxCap = 85*(10**6)*(10**18);
      let ethPATRate = 75000;
      let ethRAXRate = 75000;
      let managers = [manager];
      let samuraiXWallet = "0x1df62f291b2e969fb0849d99d9ce41e2f137006e";
      this.registered_user = await RegisteredUsers.new();
      this.manageListingFee = await ManageListingFee.deployed();
      this.manageReserveFunds = await ManageReserveFunds.deployed();
      this.raxToken = await RAXToken.new(this.registered_user.address);
      this.registered_user.addRegisteredUser(investor);
      this.registered_user.addRegisteredUser(purchaser);

      this.token = await PATToken.new(this.registered_user.address, id,
                                  managers, name, symbol, fixed_linkDoc,
                                  fixed_hashDoc, var_linkDoc, var_hashDoc);
      this.crowdsale = await PATSale.new(this.registered_user.address, this.raxToken.address,
                                        this.token.address, this.manageListingFee.address,
                                        this.manageReserveFunds.address, this.startTime,
                                        this.endTime, wallet, minCap, maxCap, ethPATRate,
                                        ethRAXRate, listingFeeRate, reserveFundRate);

      this.afterEndTime = this.endTime + duration.seconds(1);
      const token_owner = await this.token.owner();
      await this.token.transferOwnership(this.crowdsale.address, {from: token_owner});
    });

    describe('before start', function () {
      it('should reject payments before start', async function () {
        await this.crowdsale.sendTransaction({value: value, from: investor}).should.be.rejectedWith(EVMThrow);
        await this.crowdsale.buyTokensUsingEther(investor, {
            from: purchaser,
            value: value
        }).should.be.rejectedWith(EVMThrow);
      });
      it('should report hasClosed as false', async function() {
        (await this.crowdsale.hasClosed()).should.be.equal(false);
      });
    });
    describe('after start', function () {
      before(async function () {
          await increaseTimeTo(this.startTime);
      });
      it ('should not accept payments from unregistered user', async function () {
        await this.crowdsale.sendTransaction({from: visitor, value: value}).should.be.rejected;
      });

      it('should accept payments after start (fallback)', async function () {
        await this.crowdsale.sendTransaction({from: investor, value : value}); //.should.be.fulfilled;
      });
      it('should accept payments after start (buyTokensUsingEther)', async function () {
        await this.crowdsale.buyTokensUsingEther(investor, {value: value, from: purchaser}).should.be.fulfilled;
      });
      it('finalize should raise when not ended', async function() {
        await this.crowdsale.finalize().should.be.rejected;
      });
      it('should report hasEnded as false', async function() {
        (await this.crowdsale.hasClosed()).should.be.equal(false);
      });
    });
    describe('after end', function () {
      before(async function () {
        await increaseTimeTo(this.afterEndTime);
      });
      it('should reject payments after end (fallback)', async function () {
        await this.crowdsale.sendTransaction({from: investor, value : value}).should.be.rejectedWith(EVMThrow);
      });
      it('should reject payments after end (buyTokensUsingEther)', async function () {
        await this.crowdsale.buyTokensUsingEther(investor, {value: value, from: purchaser}).should.be.rejectedWith(EVMThrow);
      });
      it('finalize transfers token ownership', async function() {
        (await this.token.owner()).should.be.equal(this.crowdsale.address);
        await this.crowdsale.finalize();
        (await this.token.owner()).should.be.equal((await this.crowdsale.owner()));
      });
      it('should report hasEnded as true', async function() {
        (await this.crowdsale.hasClosed()).should.be.equal(true);
      });
    });
  });

  describe('during sale', function() {
    //TODO: change this
    //const value = ether(100);
    const value = ether(10);
    //const expectedTokenAmount = value.times(280); // lowest exchange rate from white paper for 100 eth purchase
    const expectedTokenAmount = value.times(75000); // lowest exchange rate from white paper for 10 eth purchase

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
      await increaseTimeTo(this.startTime);
      this.pre = {
        "totalSupply": 0,
        "investorBalance": 0,
        "weiRaised": 0,
        "walletBalance": web3.eth.getBalance(wallet)
      };
    });

    describe('high-level purchase (fallback)', function () {
      let purchaser2 = "0x28a8746e75304c0780e011bed21c72cd78cd535e";
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

      it('should increase totalSupply', async function () {
        const post = await this.token.totalSupply();
        post.minus(this.pre.totalSupply).should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should assign tokens to sender', async function () {
        const post = await this.token.balanceOf(investor);
        post.minus(this.pre.investorBalance).should.be.bignumber.equal(expectedTokenAmount);
      });

      it('should forward funds to vault', async function () {
        var vault = await this.crowdsale.getVaultAddress();
        var balanceBefore = await web3.eth.getBalance(vault);
        await this.crowdsale.sendTransaction({value: value, from: investor}).should.be.fulfilled;
        var balanceAfter = await web3.eth.getBalance(vault);
        balanceAfter.minus(balanceBefore).should.be.bignumber.equal(value);
      });

      it('should increase weiRaised', async function() {
        const post = await this.crowdsale.weiRaised();
        post.minus(this.pre.weiRaised).should.be.bignumber.equal(value);
      });

      it('should fulfille buy PAT token by RAX use function buyTokensUsingRaxApprove', async function() {
        var amountRAX = new BigNumber(75000* 10 * (10**18));
        var vaultAddr = await this.crowdsale.getVaultAddress();
        var tokensbefore = await this.raxToken.balanceOf(vaultAddr);
        await this.raxToken.mint(purchaser2, amountRAX, {from: dump}).should.be.fulfilled;
        var raxTokens = await this.raxToken.balanceOf(purchaser2);
        await this.raxToken.approve(this.crowdsale.address, raxTokens, {from: purchaser2}).should.be.fulfilled;
        var allowed = await this.raxToken.allowance(purchaser2, this.crowdsale.address);
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.fulfilled;
        var patTokens = await this.token.balanceOf(purchaser2);
        var tokensAfter = await this.raxToken.balanceOf(vaultAddr);
        patTokens.should.be.bignumber.equal(amountRAX);
        tokensAfter.should.be.bignumber.equal(tokensbefore.plus(amountRAX));
      });

      it('should fulfille buy PAT token by RAX use function buyTokensUsingRaxTransfer', async function() {
        var amountRAX = new BigNumber(75000* 10 * (10**18));
        await this.raxToken.mint(this.crowdsale.address, amountRAX, {from: dump}).should.be.fulfilled;
        var vaultAddr = await this.crowdsale.getVaultAddress();
        var tokensbefore = await this.raxToken.balanceOf(vaultAddr);
        await this.registered_user.addRegisteredUser(vaultAddr);
        await this.crowdsale.buyTokensUsingRaxTransfer(purchaser2, amountRAX, {from: dump}).should.be.fulfilled;
        var patTokens = await this.token.balanceOf(purchaser2);
        var tokensAfter = await this.raxToken.balanceOf(vaultAddr);
        patTokens.should.be.bignumber.equal(amountRAX);
        tokensAfter.should.be.bignumber.equal(tokensbefore.plus(amountRAX));
      });

      it('should forward RAX to Vault address', async function() {
        var amountRAX = new BigNumber(75000 * 10 * (10**18));
        await this.raxToken.mint(purchaser2, amountRAX, {from: dump}).should.be.fulfilled;
        await this.raxToken.approve(this.crowdsale.address, amountRAX, {from: purchaser2}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2}).should.be.fulfilled;
        var vaultAddr = await this.crowdsale.getVaultAddress();
        var raxTokensOfVault = await this.raxToken.balanceOf(vaultAddr);
        raxTokensOfVault.should.be.bignumber.equal(amountRAX);
      });
    });

    describe('low-level purchase (buyTokensUsingEther)', function () {
      var eth = ether(0.1);
      const expectedTokenAmount = value.times(750);
      beforeEach(async function() {
        var eth = ether(0.1);
        this.tx_result = await this.crowdsale.buyTokensUsingEther(investor, {value: eth, from: purchaser});
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
        var amount = 123456789000000000;
        var rate = 75000;
        await this.crowdsale.buyTokensUsingEther(purchaser2, {value: amount, from: purchaser2});
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

      it('should forward funds to vault', async function () {
        var vault = await this.crowdsale.getVaultAddress();
        var balanceBefore = await web3.eth.getBalance(vault);
        await this.crowdsale.buyTokensUsingEther(investor, {value: eth, from: purchaser}).should.be.fulfilled;
        var balanceAfter = await web3.eth.getBalance(vault);
        balanceAfter.minus(balanceBefore).should.be.bignumber.equal(eth);
      });

      it('should increase weiRaised', async function() {
        const post = await this.crowdsale.weiRaised();
        post.minus(this.pre.weiRaised).should.be.bignumber.equal(eth);
      });
    });

    describe('variable token exchange rates', function() {
      const validateRate = async function(crowdsale, value, expectedRate) {
        const expectedTokenAmount = value.times(expectedRate);
        let {logs} = await crowdsale.buyTokensUsingEther(investor, {value: value, from: investor});
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
        await this.crowdsale.buyTokensUsingEther(investor, {value: value, from: investor}).should.be.rejected;
      });
    });

    describe('token cap reached', function () {
      let purchaser2 = "0x28a8746e75304c0780e011bed21c72cd78cd535e";
      const tokens = n => new BigNumber(n).mul(10**18);
      const valueCap = ether(1000);

      it('should return hasEnded() of true', async function() {
        await this.crowdsale.buyTokensUsingEther(purchaser2, {value: valueCap, from: purchaser2});
        (await this.crowdsale.hasEnded()).should.be.equal(true);
      });

      it('should reject purchases that exceed cap', async function() {
        await this.crowdsale.buyTokensUsingEther(purchaser2, {value: ether(999), from: purchaser2});
        await this.crowdsale.buyTokensUsingEther(investor, {value: ether(3), from: investor}).should.be.rejected;
      });

      it('should hit cap exactly', async function() {
        await this.crowdsale.buyTokensUsingEther(investor, {value: valueCap, from: investor}).should.be.fulfilled;
        (await this.crowdsale.tokensRemaining()).should.be.bignumber.equal(0);
        (await this.crowdsale.hasEnded()).should.be.equal(true);
      });

      it('should not leave orphans', async function() {
        await this.crowdsale.buyTokensUsingEther(purchaser2, {value: ether(999.999), from: purchaser2});
        (await this.crowdsale.tokensRemaining()).should.be.bignumber.equal(0);
      });

      it('should not over-gift orphans', async function() {
        await this.crowdsale.buyTokensUsingEther(purchaser2, {value: ether(999.9), from: purchaser2});
        await this.crowdsale.buyTokensUsingEther(investor, {value: ether(0.1), from: investor}).should.be.fulfilled;
        (await this.crowdsale.tokensRemaining()).should.be.bignumber.equal(0);
      });

      it('should fulfilled set endTime by manager', async function() {
        var endTime = latestTime() + duration.minutes(1);
        await this.crowdsale.setEndTime(endTime, {from: manager}).should.be.fulfilled;
      });

      it('should rejected set endTime by not manager', async function() {
        var endTime = latestTime() + duration.minutes(1);
        await this.crowdsale.setEndTime(endTime, {from: investor}).should.be.rejected;
      });

      it('should refund when crowdsale unsuccessful (holder call)', async function() {
        var amountETH = ether(10);
        var feeGas = new BigNumber(8.4372*(10**13));
        await this.crowdsale.buyTokensUsingEther(purchaser2, {value: amountETH, from: purchaser2});
        var endTime = latestTime() + 2;
        var balanceBefore = await web3.eth.getBalance(purchaser2);
        await this.crowdsale.setEndTime(endTime, {from: manager}).should.be.fulfilled;
        sleep(3000);
        await this.crowdsale.finalize({from: dump}).should.be.fulfilled;
        await this.crowdsale.claimRefund({from: purchaser2}).should.be.fulfilled;
        var balanceAfter = await web3.eth.getBalance(purchaser2);
        balanceAfter.should.be.bignumber.equal(balanceBefore.plus(amountETH.minus(feeGas)));
      });

      it('should refund RAX when crowdsale unsuccessful (holder call)', async function() {
        var amountRAX = new BigNumber(75000*10*(10**18));
        await this.raxToken.mint(purchaser2, amountRAX, {from: dump}).should.be.fulfilled;
        await this.raxToken.approve(this.crowdsale.address, amountRAX, {from: purchaser2}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2});
        var endTime = latestTime() + 2;
        var raxTokensBefore = await this.raxToken.balanceOf(purchaser2);
        await this.crowdsale.setEndTime(endTime, {from: manager}).should.be.fulfilled;
        sleep(3000);
        await this.crowdsale.finalize({from: dump}).should.be.fulfilled;
        await this.crowdsale.claimRefund({from: purchaser2}).should.be.fulfilled;
        var raxTokensAfter = await this.raxToken.balanceOf(purchaser2);
        raxTokensAfter.should.be.bignumber.equal(raxTokensBefore.plus(amountRAX));
      });

      it('should refund when crowdsale unsuccessful (server call refund())', async function() {
        var amountETH = ether(10);
        var amountRAX = new BigNumber(75000*10*(10**18));
        var feeGas = new BigNumber(8.4372*(10**13));
        await this.crowdsale.buyTokensUsingEther(purchaser2, {value: amountETH, from: purchaser2});
        await this.raxToken.mint(purchaser2, amountRAX, {from: dump}).should.be.fulfilled;
        await this.raxToken.approve(this.crowdsale.address, amountRAX, {from: purchaser2}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2});
        var endTime = latestTime() + 2;
        var balanceBefore = await web3.eth.getBalance(purchaser2);
        var raxTokensBefore = await this.raxToken.balanceOf(purchaser2);
        //console.log(Number(balanceBefore));
        await this.crowdsale.setEndTime(endTime, {from: manager}).should.be.fulfilled;
        sleep(3000);
        await this.crowdsale.finalize({from: dump}).should.be.fulfilled;
        await this.crowdsale.refund(purchaser2, {from: dump}).should.be.fulfilled;
        var balanceAfter = await web3.eth.getBalance(purchaser2);
        var raxTokensAfter = await this.raxToken.balanceOf(purchaser2);
        raxTokensAfter.should.be.bignumber.equal(raxTokensBefore.plus(amountRAX));
        balanceAfter.should.be.bignumber.equal(balanceBefore.plus(amountETH));
      });

      it('should not increase balance when not holder call refund', async function() {
        var amountETH = ether(10);
        var amountRAX = new BigNumber(75000*10*(10**18));
        var feeGas = new BigNumber(8.4372*(10**13));
        var endTime = latestTime() + 2;
        //console.log(Number(balanceBefore));
        var balanceBefore = await web3.eth.getBalance(purchaser2);
        await this.crowdsale.setEndTime(endTime, {from: manager}).should.be.fulfilled;
        sleep(3000);
        await this.crowdsale.finalize({from: dump}).should.be.fulfilled;
        await this.crowdsale.refund(purchaser2, {from: dump}).should.be.fulfilled;
        var balanceAfter = await web3.eth.getBalance(purchaser2);
        balanceAfter.should.be.bignumber.equal(balanceBefore);
      });

      it('should forward ether from vault adress to ethWallet when crowdsale successful', async function() {
        await this.crowdsale.buyTokensUsingEther(purchaser2, {value: valueCap, from: purchaser2});
        var endTime = latestTime() + 2;
        await this.crowdsale.setEndTime(endTime, {from: manager}).should.be.fulfilled;
        sleep(3000);
        var vaultAddr = await this.crowdsale.getVaultAddress();
        var balanceVault = await web3.eth.getBalance(vaultAddr);
        var balanceBefore = await web3.eth.getBalance(wallet);
        await this.crowdsale.finalize({from: dump}).should.be.fulfilled;
        var balanceAfter = await web3.eth.getBalance(wallet);
        balanceAfter.should.be.bignumber.equal(balanceBefore.plus(balanceVault));
      });

      it('should forward ether from vault adress to ethWallet when crowdsale successful (sale enough minCap)', async function() {
        var minCap = ether(667);
        await this.crowdsale.buyTokensUsingEther(purchaser2, {value: minCap, from: purchaser2});
        var endTime = latestTime() + 2;
        await this.crowdsale.setEndTime(endTime, {from: manager}).should.be.fulfilled;
        sleep(3000);
        var vaultAddr = await this.crowdsale.getVaultAddress();
        var balanceVault = await web3.eth.getBalance(vaultAddr);
        var balanceBefore = await web3.eth.getBalance(wallet);
        await this.crowdsale.finalize({from: dump}).should.be.fulfilled;
        var balanceAfter = await web3.eth.getBalance(wallet);
        balanceAfter.should.be.bignumber.equal(balanceBefore.plus(balanceVault));
      });

      it('should forward RAX from vault adress to ethWallet when crowdsale successful', async function() {
        var amountRAX = new BigNumber(75000*1000*(10**18));
        await this.registered_user.addRegisteredUser(wallet);
        await this.raxToken.mint(purchaser2, amountRAX, {from: dump}).should.be.fulfilled;
        await this.raxToken.approve(this.crowdsale.address, amountRAX, {from: purchaser2}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingRaxApprove(purchaser2, {from: purchaser2});
        var vaultAddr = await this.crowdsale.getVaultAddress();
        var raxTokensVault = await this.raxToken.balanceOf(vaultAddr);
        var raxTokensBefore = await this.raxToken.balanceOf(wallet);
        var endTime = latestTime() + 2;
        await this.crowdsale.setEndTime(endTime, {from: manager}).should.be.fulfilled;
        sleep(3000);
        await this.crowdsale.finalize({from: dump}).should.be.fulfilled;
        var raxTokensAfter = await this.raxToken.balanceOf(wallet);
        raxTokensAfter.should.be.bignumber.equal(raxTokensBefore.plus(raxTokensVault));
      });
    });

    describe('pause and unpause', function () {
      let purchaser2 = "0x28a8746e75304c0780e011bed21c72cd78cd535e";
      const tokens = n => new BigNumber(n).mul(10**18);
      const valueETH = ether(10);
      it('should fulfille buy tokens when unpause', async function() {
        await this.crowdsale.buyTokensUsingEther(purchaser2, {value: valueETH, from: purchaser2}).should.be.fulfilled;
      });

      it('should reject buy tokens when pause', async function() {
        await this.crowdsale.pause({from: dump}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingEther(purchaser2, {value: valueETH, from: purchaser2}).should.be.rejected;
      });

      it('should can unpause Token after pause', async function() {
        await this.crowdsale.pause({from: dump}).should.be.fulfilled;
        await this.crowdsale.unpause({from: dump}).should.be.fulfilled;
        await this.crowdsale.buyTokensUsingEther(purchaser2, {value: valueETH, from: purchaser2}).should.be.fulfilled;
      });
    });

    describe('change wallet', function () {
      var manager = '0xffcf8fdee72ac11b5c542428b35eef5769c409f0';
      var newWallet = '0x3e5e9111ae8eb78fe1cc3bb8915d5d461f3ef9a9';
      it('should fulfille when manager set new wallet', async function() {
        await this.crowdsale.setWallet(newWallet, {from: manager}).should.be.fulfilled;
        var wallet = await this.crowdsale.wallet();
        wallet.should.be.equal(newWallet);
      });

      it('should rejecte when not manager set new wallet', async function() {
        await this.crowdsale.setWallet(newWallet, {from: investor}).should.be.rejected;
      });
    });
  });

  describe('should reject deploy PATSale when totalPer not equal 100', function() {
    beforeEach(async function() {
      this.startTime = latestTime() + duration.minutes(1);
      this.endTime = this.startTime + duration.hours(1);
      const id = 4
      let fixed_linkDoc = 'pat_doc_4';
      let fixed_hashDoc = 'pat_hash_4';
      let var_linkDoc = 'var_patDoc4';
      let var_hashDoc = 'var_hashDoc4';
      let listingFeeRate = 5;
      let reserveFundRate = 15;
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
                                        ethRAXRate, listingFeeRate, reserveFundRate).should.be.rejected;
    });

    it('should not have PATSale address', async function() {
    });
  });
});
