const BigNumber = web3.BigNumber;
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const distributor = require('./Distributor.js');
const claimableEx = require("./ClaimableEx.js");
const reclaimTokens = require("./CanReclaimToken.js");

const DistributeEther = artifacts.require("./DistributeEther.sol");
const RegisteredUsers = artifacts.require("./RegisteredUsers.sol");
const PATToken = artifacts.require("./PATToken.sol");
const RAXToken = artifacts.require("./RAXToken.sol");

contract('DistributeEther', function(accounts) {
  let managers = [accounts[1], accounts[2]];
  let id = 2;
  let name = "pat_2";
  let symbol = "pat2";
  let fixedDocsLink = "https://drive.google.com/open?id=1JYpdAqubjvHvUuurwX7om0dDcA5ycRhc";
  let fixedDocsHash = "323202411a8393971877e50045576ed7";
  let varDocsLink = "https://drive.google.com/open?id=1ZaFg2XtGdTwnkvaj-Kra4cRW_ia6tvBY";
  let varDocsHash = "743f5d72288889e94c076f8b21e07168";

  describe('ClaimableEx', function() {
      claimableEx.check(accounts, deployContract);
  });

  describe('CanReclaimToken', function() {
    describe('RAX', function() {
      reclaimTokens.check(RegisteredUsers, accounts, deployContract, deployRAXToken);
    });

    describe('PAT', function() {
      reclaimTokens.check(RegisteredUsers, accounts, deployContract, deployPATToken);
    });
  });

  describe('distribute profit (ETH) to PAT token holders \n', function() {
    distributor.testEther(RegisteredUsers, DistributeEther, accounts, managers, deployPATToken);
  });

  describe('distribute profit (ETH) to RAX token holders \n', function() {
    distributor.testEther(RegisteredUsers, DistributeEther, accounts, managers, deployRAXToken);
  });

  async function deployPATToken(registeredUsers) {
    return  await PATToken.new(registeredUsers.address, id, managers, name, symbol,
                          fixedDocsLink, fixedDocsHash, varDocsLink, varDocsHash).should.be.fulfilled;
  }

  async function deployRAXToken(registeredUsers) {
    return  await RAXToken.new(registeredUsers.address);
  }

  async function deployContract() {
    var regUsers = await RegisteredUsers.deployed();
    return await DistributeEther.new(regUsers.address).should.be.fulfilled;
  }
});
