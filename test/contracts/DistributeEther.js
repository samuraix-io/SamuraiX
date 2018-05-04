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
  let rate = 1;
  let totalToken;

  describe('send profit to whole holder by Ether low-level', function() {
    var mintAmount = new BigNumber(10**18);
    beforeEach(async function () {
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

    it('should fulfille manager send profit to whole holder (a holder have not tokens) \n', async function () {
      await registeredUser.addRegisteredUser(accounts[7]);
      (await registeredUser.isUserRegistered(accounts[7])).should.be.equal(true);
      totalToken = await patToken.getTotalTokens();
      // mint token for holder
      (await patToken.owner()).should.be.equal(owner);
      await patToken.mint(accounts[3], mintAmount, {from:accounts[0]}).should.be.fulfilled;
      await patToken.mint(accounts[4], mintAmount, {from:accounts[0]}).should.be.fulfilled;
      await patToken.mint(accounts[5], 2 * mintAmount, {from:accounts[0]}).should.be.fulfilled;
      await patToken.transfer(accounts[7], mintAmount, {from: accounts[3]}).should.be.fulfilled;
      (await patToken.balanceOf(accounts[3])).should.be.bignumber.equal(0);
      (await patToken.balanceOf(accounts[4])).should.be.bignumber.equal(mintAmount);
      (await patToken.balanceOf(accounts[5])).should.be.bignumber.equal(2*mintAmount);
      (await patToken.balanceOf(accounts[7])).should.be.bignumber.equal(mintAmount);

      // company manager send profits
      var valueWei = new BigNumber(10**18);
      var res = await distributeEther.distributeProfit(patToken.address, {
        from: accounts[1],
        gas: 2000000,
        value: Number(valueWei)
      }).should.be.fulfilled;
      (await distributeEther.getIncome(accounts[3])).should.be.bignumber.equal(0);
      (await distributeEther.getIncome(accounts[4])).should.be.bignumber.equal((new BigNumber(valueWei*mintAmount)).dividedBy(totalToken));
      (await distributeEther.getIncome(accounts[5])).should.be.bignumber.equal((new BigNumber(2*valueWei*mintAmount)).dividedBy(totalToken));
      (await distributeEther.getIncome(accounts[7])).should.be.bignumber.equal((new BigNumber(valueWei*mintAmount)).dividedBy(totalToken));
    });

    it('should fulfille SamuraiX send ether income to whole holder (function withdraw automatic)\n', async function () {
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

    it('should fulfille SamuraiX send ether income to whole holder (a holder have not tokens)\n', async function () {
      await patToken.addHolder(accounts[7]).should.be.fulfilled;
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
        var tokens = await patToken.balanceOf(holderAddr);
        if (tokens == 0) {
          await distributeEther.doTransfer(holderAddr, {from: owner}).should.be.rejected;
        }
        else {
          await distributeEther.doTransfer(holderAddr, {from: owner}).should.be.fulfilled;
        }
      }
      (await web3.eth.getBalance(accounts[3])).should.be.bignumber.equal(etherHolder1.plus(income1));
      (await web3.eth.getBalance(accounts[4])).should.be.bignumber.equal(etherHolder2.plus(income2));
      (await web3.eth.getBalance(accounts[5])).should.be.bignumber.equal(etherHolder3.plus(income3));
    });

    it('should fulfille holder withdraw \n', async function () {
      await patToken.mint(accounts[3], mintAmount, {from:accounts[0]}).should.be.fulfilled;
      var valueWei = new BigNumber(10**18);
      var res = await distributeEther.distributeProfit(patToken.address, {
        from: accounts[1],
        gas: 2000000,
        value: valueWei
      }).should.be.fulfilled;
      var income = await distributeEther.getIncome(accounts[3]);
      var amount = new BigNumber(10**9);
      await distributeEther.withdraw(amount, {from: accounts[3]});
      (await distributeEther.getIncome(accounts[3])).should.be.bignumber.equal(income.minus(amount));
    });

    it('should rejecte holder withdraw but don\'t have incomes \n', async function () {
      await patToken.addHolder(accounts[7]).should.be.fulfilled;
      var amount = new BigNumber(10**9);
      await distributeEther.withdraw(amount, {from: accounts[7]}).should.be.rejected;
    });
  });

  describe('send profit to whole holder by Ether high-level', function() {
    var mintAmount = new BigNumber(19*(10**6)*(10**18));
    var valueWei = new BigNumber(5*(10**6)*(10**18)); // 5 milion ether
    beforeEach(async function () {
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

    it('should logs ProfitDistributed when manager send profit to whole holder by Ether \n', async function () {
      //var a = new BigNumber(1000000000000000000000000000000000000000000000000000000000000);
      //console.log(a);
      var holders = [accounts[3], accounts[4], accounts[5]];
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

      var res = await distributeEther.distributeProfit(patToken.address, {
        from: accounts[1],
        gas: 2000000,
        value: Number(valueWei)
      }).should.be.fulfilled;

      const {logs} = res;

      const event = logs.find(e => e.event === 'ProfitDistributed');

      should.exist(event);
      event.args._coinId.should.be.bignumber.equal(0);
      event.args._token.should.be.equal(patToken.address);
      var _holders = event.args._holders;
      var _len = _holders.length;
      for (var i = 0; i < _len; ++i) {
        _holders[i].should.be.equal(holders[i]);
      }
      var _profits = event.args._profits;
      var _len = _profits.length;
      for (var i = 0; i < _len; ++i) {
        (await distributeEther.getIncome(accounts[i+3])).should.be.bignumber.equal(new BigNumber(_profits[i]));
      }
      (await distributeEther.getIncome(accounts[3])).should.be.bignumber.equal(new BigNumber(valueWei*(mintAmount.dividedBy(totalToken))));
      (await distributeEther.getIncome(accounts[4])).should.be.bignumber.equal(new BigNumber(valueWei*(mintAmount.dividedBy(totalToken))));
      (await distributeEther.getIncome(accounts[5])).should.be.bignumber.equal(new BigNumber(2*valueWei*(mintAmount.dividedBy(totalToken))));
    });

    it('can\'t withdraw after server call doTransfer() \n', async function () {
      (await patToken.owner()).should.be.equal(owner);
      await patToken.mint(accounts[3], mintAmount, {from:accounts[0]}).should.be.fulfilled;
      await patToken.mint(accounts[4], mintAmount, {from:accounts[0]}).should.be.fulfilled;
      await patToken.mint(accounts[5], 2 * mintAmount, {from:accounts[0]}).should.be.fulfilled;
      (await patToken.balanceOf(accounts[3])).should.be.bignumber.equal(mintAmount);
      (await patToken.balanceOf(accounts[4])).should.be.bignumber.equal(mintAmount);
      (await patToken.balanceOf(accounts[5])).should.be.bignumber.equal(2*mintAmount);

      // company manager send profits
      var res = await distributeEther.distributeProfit(patToken.address, {
        from: accounts[1],
        gas: 2000000,
        value: Number(valueWei)
      }).should.be.fulfilled;

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
      var amount = new BigNumber(10**18);
      await distributeEther.withdraw(amount, {from: accounts[3]}).should.be.rejected;
    });

    it('should fulfille holder withdraw \n', async function () {
      await patToken.mint(accounts[3], mintAmount, {from:accounts[0]}).should.be.fulfilled;
      var res = await distributeEther.distributeProfit(patToken.address, {
        from: accounts[1],
        gas: 2000000,
        value: valueWei
      }).should.be.fulfilled;
      var income = await distributeEther.getIncome(accounts[3]);
      var amount = new BigNumber(10**18);
      await distributeEther.withdraw(amount, {from: accounts[3]});
      (await distributeEther.getIncome(accounts[3])).should.be.bignumber.equal(income.minus(amount));
    });

    it('should reject holder withdraw but don\'t have incomes \n', async function () {
      await patToken.addHolder(accounts[7]).should.be.fulfilled;
      var amount = new BigNumber(10**9);
      await distributeEther.withdraw(amount, {from: accounts[7]}).should.be.rejected;
    });
  });
});
