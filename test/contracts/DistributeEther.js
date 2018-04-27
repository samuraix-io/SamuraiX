import finney from './helpers/finney.js';
import ether from './helpers/ether.js';


const BigNumber = web3.BigNumber;
const should = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

const DistributeEther = artifacts.require("./DistributeEther.sol");
const RegisteredUsers = artifacts.require("./RegisteredUsers.sol");
const PATToken = artifacts.require("./PATToken.sol");

contract('DistributeEther', function(accounts) {
  let patToken;
  let registeredUser;
  let distributeEther;
  let overwrite = true;
  let manager_addr = ['0xffcf8fdee72ac11b5c542428b35eef5769c409f0'];
  let owner = '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1';
  let samuraiXWallet = '0x1df62f291b2e969fb0849d99d9ce41e2f137006e';
  let id = 2;
  let name = "pat_2";
  let symbol = "pat2";
  let fixedDocsLink = "fix_link2";
  let fixedDocsHash = "fix_hash2";
  let varDocsLink = "var_link2";
  let varDocsHash = "var_hash2";
  let listingFeeRate = 5;
  let reserveFundRate = 10;
  let mintAmount = new BigNumber(10**18);
  let rate = 1;
  let totalToken;

  describe('send profit to whole holder by Ether', function() {
    before(async function () {
      registeredUser = await RegisteredUsers.deployed().should.be.fulfilled;
      patToken = await PATToken.new(registeredUser.address, id, manager_addr,
                                    name, symbol, fixedDocsLink, fixedDocsHash,
                                    varDocsLink, varDocsHash,
                                    {from: owner, overwrite: overwrite}).should.be.fulfilled;
      distributeEther = await DistributeEther.new({from: owner, overwrite: overwrite}).should.be.fulfilled;
      var own_pat = await patToken.owner();
      for(var i = 3; i < 6; ++i) {
        await patToken.addHolder(accounts[i]).should.be.fulfilled;
      }
    });

    it('should fulfille manager send profit to whole holder by Ether \n', async function () {
      totalToken = await patToken.getTotalTokens();
      // mint token for holder
      (await patToken.owner()).should.be.equal(owner);
      await patToken.mint(accounts[3], mintAmount, {from:accounts[0]}).should.be.fulfilled;
      await patToken.mint(accounts[4], mintAmount, {from:accounts[0]}).should.be.fulfilled;
      await patToken.mint(accounts[5], 2 * mintAmount, {from:accounts[0]}).should.be.fulfilled;

      (await patToken.balanceOf(accounts[3])).should.be.bignumber.equal(mintAmount);
      (await patToken.balanceOf(accounts[4])).should.be.bignumber.equal(mintAmount);
      (await patToken.balanceOf(accounts[5])).should.be.bignumber.equal(2*mintAmount);

      // company manager send profits
      var valueWei = new BigNumber(10**18);
      var res = await distributeEther.distributeProfit(patToken.address, {
        from: accounts[1],
        gas: 2000000,
        value: Number(valueWei)
      }).should.be.fulfilled;

      (await distributeEther.getIncome(accounts[3])).should.be.bignumber.equal((new BigNumber(valueWei*mintAmount)).dividedBy(totalToken));
      (await distributeEther.getIncome(accounts[4])).should.be.bignumber.equal((new BigNumber(valueWei*mintAmount)).dividedBy(totalToken));
      (await distributeEther.getIncome(accounts[5])).should.be.bignumber.equal((new BigNumber(2*valueWei*mintAmount)).dividedBy(totalToken));
    });

    it('should fulfille  SamuraiX send ether income to whole holder (function withdraw automatic)\n', async function () {
      var income1 = await distributeEther.getIncome(accounts[3]);
      var income2 = await distributeEther.getIncome(accounts[4]);
      var income3 = await distributeEther.getIncome(accounts[5]);

      var etherHolder1 = await web3.eth.getBalance(accounts[3]);
      var etherHolder2 = await web3.eth.getBalance(accounts[4]);
      var etherHolder3 = await web3.eth.getBalance(accounts[5]);

      var holderCount = await patToken.getTheNumberOfHolders();
      //console.log(holderCount);
      (await distributeEther.owner()).should.be.equal(owner);

      for(var i = 0; i < holderCount; ++i) {
        var holderAddr = await patToken.getHolderAddress(i);
        await distributeEther.doTransfer(holderAddr, {from: owner}).should.be.fulfilled;
      }

      (await web3.eth.getBalance(accounts[3])).should.be.bignumber.equal(etherHolder1.plus(income1));
      (await web3.eth.getBalance(accounts[4])).should.be.bignumber.equal(etherHolder2.plus(income2));
      (await web3.eth.getBalance(accounts[5])).should.be.bignumber.equal(etherHolder3.plus(income3));
    });

    it('should fulfille  holder withdraw \n', async function () {
      await patToken.mint(accounts[3], mintAmount, {from:accounts[0]}).should.be.fulfilled;
      var valueWei = new BigNumber(10**18);
      var res = await distributeEther.distributeProfit(patToken.address, {
        from: accounts[1],
        gas: 2000000,
        value: valueWei
      }).should.be.fulfilled;
      var income = await distributeEther.getIncome(accounts[3]);
      var amount = new BigNumber(10000000);
      await distributeEther.withdraw(amount, {from: accounts[3]});
      (await distributeEther.getIncome(accounts[3])).should.be.bignumber.equal(income.minus(amount));
    });

    it('should rejecte holder withdraw but don\'t have incomes \n', async function () {
      await patToken.addHolder(accounts[7]).should.be.fulfilled;
      var amount = new BigNumber(10000000);
      await distributeEther.withdraw(amount, {from: accounts[7]}).should.be.rejected;
    });
  });
});
