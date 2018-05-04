import finney from './helpers/finney.js';
import ether from './helpers/ether.js';


const BigNumber = web3.BigNumber;
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const DistributeRAX = artifacts.require("./DistributeRAX.sol");
const RegisteredUsers = artifacts.require("./RegisteredUsers.sol");
const RAXToken = artifacts.require("./RAXToken.sol");
const PATToken = artifacts.require("./PATToken.sol");

contract('DistributeRAX', function(accounts) {
  let patToken;
  let raxToken;
  let registeredUser;
  let distributeRAX;
  let overwrite = true;
  let manager_addr = ['0xffcf8fdee72ac11b5c542428b35eef5769c409f0'];
  let owner = '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1';
  let samuraiXWallet = '0x1df62f291b2e969fb0849d99d9ce41e2f137006e';
  let id = 3;
  let name = "pat_3";
  let symbol = "pat3";
  let fixedDocsLink = "fix_link3";
  let fixedDocsHash = "fix_hash3";
  let varDocsLink = "var_link3";
  let varDocsHash = "var_hash3";
  let listingFeeRate = 5;
  let reserveFundRate = 10;
  let mintAmount = new BigNumber(10**18);
  let totalToken;

  describe('send profit to whole holder by RAX \n', function() {
    beforeEach(async function () {
      registeredUser = await RegisteredUsers.deployed().should.be.fulfilled;
      raxToken = await RAXToken.new(registeredUser.address).should.be.fulfilled;
      patToken = await PATToken.new(registeredUser.address, id, manager_addr, name, symbol,
                                    fixedDocsLink, fixedDocsHash, varDocsLink, varDocsHash,
                                    {from: owner, overwrite: overwrite}).should.be.fulfilled;
      distributeRAX = await DistributeRAX.new(raxToken.address, {from: owner, overwrite: overwrite}).should.be.fulfilled;
      for(var i = 3; i < 6; ++i) {
        await patToken.addHolder(accounts[i]).should.be.fulfilled;
      }
    });

    it('should fulfille manager send profit to whole holder low-level \n', async function () {
      totalToken = await patToken.getTotalTokens();
      // mint PATtoken for holder
      (await patToken.owner()).should.be.equal(owner);
      await patToken.mint(accounts[3], mintAmount, {from:accounts[0]}).should.be.fulfilled;
      await patToken.mint(accounts[4], mintAmount, {from:accounts[0]}).should.be.fulfilled;
      await patToken.mint(accounts[5], 2 * mintAmount, {from:accounts[0]}).should.be.fulfilled;

      //company mint raxToken
      let RAXAmount = new BigNumber(10 ** 18);
      await raxToken.mint(accounts[1], Number(RAXAmount) , {from:accounts[0]}).should.be.fulfilled;
      var balanceRAX = await raxToken.balanceOf(accounts[1]);
      var tokenHolder1 = await patToken.balanceOf(accounts[3]);
      var tokenHolder2 = await patToken.balanceOf(accounts[4]);
      var tokenHolder3 = await patToken.balanceOf(accounts[5]);

      await raxToken.approve(distributeRAX.address, RAXAmount, {from: accounts[1]}).should.be.fulfilled;
      var res = await raxToken.allowance(accounts[1], distributeRAX.address);
      await distributeRAX.distributeProfit(patToken.address, {from: accounts[1]}).should.be.fulfilled;
      (await raxToken.balanceOf(accounts[3])).should.be.bignumber.equal(new BigNumber(RAXAmount*tokenHolder1).dividedBy(totalToken));
      (await raxToken.balanceOf(accounts[4])).should.be.bignumber.equal(new BigNumber(RAXAmount*tokenHolder2).dividedBy(totalToken));
      (await raxToken.balanceOf(accounts[5])).should.be.bignumber.equal(new BigNumber(RAXAmount*tokenHolder3).dividedBy(totalToken));
    });

    it('should fulfille manager send profit to whole holder high-level \n', async function () {
      totalToken = await patToken.getTotalTokens();
      // mint PATtoken for holder
      let mintAmount = new BigNumber(19*(10**6)*(10**18));
      (await patToken.owner()).should.be.equal(owner);
      await patToken.mint(accounts[3], mintAmount, {from:accounts[0]}).should.be.fulfilled;
      await patToken.mint(accounts[4], mintAmount, {from:accounts[0]}).should.be.fulfilled;
      await patToken.mint(accounts[5], 2 * mintAmount, {from:accounts[0]}).should.be.fulfilled;

      // mint raxToken for company
      let RAXAmount = new BigNumber(75*(10**6)*(10 ** 18));
      await raxToken.mint(accounts[1], Number(RAXAmount) , {from:accounts[0]}).should.be.fulfilled;
      var balanceRAX = await raxToken.balanceOf(accounts[1]);
      var tokenHolder1 = await patToken.balanceOf(accounts[3]);
      var tokenHolder2 = await patToken.balanceOf(accounts[4]);
      var tokenHolder3 = await patToken.balanceOf(accounts[5]);

      await raxToken.approve(distributeRAX.address, RAXAmount, {from: accounts[1]}).should.be.fulfilled;
      var res = await raxToken.allowance(accounts[1], distributeRAX.address);
      await distributeRAX.distributeProfit(patToken.address, {from: accounts[1]}).should.be.fulfilled;
      (await raxToken.balanceOf(accounts[3])).should.be.bignumber.equal(new BigNumber(RAXAmount*(tokenHolder1.dividedBy(totalToken))));
      (await raxToken.balanceOf(accounts[4])).should.be.bignumber.equal(new BigNumber(RAXAmount*(tokenHolder2.dividedBy(totalToken))));
      (await raxToken.balanceOf(accounts[5])).should.be.bignumber.equal(new BigNumber(RAXAmount*(tokenHolder3.dividedBy(totalToken))));
    });

    it('should logs ProfitDistributed \n', async function () {
      var holders = [accounts[3], accounts[4], accounts[5]];
      totalToken = await patToken.getTotalTokens();
      // mint PATtoken for holder
      (await patToken.owner()).should.be.equal(owner);
      await patToken.mint(accounts[3], mintAmount, {from:accounts[0]}).should.be.fulfilled;
      await patToken.mint(accounts[4], mintAmount, {from:accounts[0]}).should.be.fulfilled;
      await patToken.mint(accounts[5], 2 * mintAmount, {from:accounts[0]}).should.be.fulfilled;

      //company mint raxToken
      let RAXAmount = new BigNumber(10 ** 18);
      await raxToken.mint(accounts[1], Number(RAXAmount) , {from:accounts[0]}).should.be.fulfilled;
      var balanceRAX = await raxToken.balanceOf(accounts[1]);
      var tokenHolder1 = await patToken.balanceOf(accounts[3]);
      var tokenHolder2 = await patToken.balanceOf(accounts[4]);
      var tokenHolder3 = await patToken.balanceOf(accounts[5]);

      await raxToken.approve(distributeRAX.address, RAXAmount, {from: accounts[1]}).should.be.fulfilled;
      var res = await raxToken.allowance(accounts[1], distributeRAX.address);
      var res = await distributeRAX.distributeProfit(patToken.address, {from: accounts[1]}).should.be.fulfilled;

      const {logs} = res;

      const event = logs.find(e => e.event === 'ProfitDistributed');

      event.args._coinId.should.be.bignumber.equal(1);
      event.args._token.should.be.equal(patToken.address);
      var _holders = event.args._holders;
      var _len = _holders.length;
      for (var i = 0; i < _len; ++i) {
        _holders[i].should.be.equal(holders[i]);
      }
      var _profits = event.args._profits;
      var _len = _profits.length;
      for (var i = 0; i < _len; ++i) {
        (await raxToken.balanceOf(accounts[i+3])).should.be.bignumber.equal(new BigNumber(_profits[i]));
      }
      (await raxToken.balanceOf(accounts[3])).should.be.bignumber.equal(new BigNumber(RAXAmount*tokenHolder1).dividedBy(totalToken));
      (await raxToken.balanceOf(accounts[4])).should.be.bignumber.equal(new BigNumber(RAXAmount*tokenHolder2).dividedBy(totalToken));
      (await raxToken.balanceOf(accounts[5])).should.be.bignumber.equal(new BigNumber(RAXAmount*tokenHolder3).dividedBy(totalToken));
    });
  });
});
