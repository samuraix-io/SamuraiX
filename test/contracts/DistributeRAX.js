const BigNumber = web3.BigNumber;
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const bn = require('./helpers/bignumber.js');
const distributor = require('./Distributor.js');

const DistributeRAX = artifacts.require("./DistributeRAX.sol");
const RegisteredUsers = artifacts.require("./RegisteredUsers.sol");
const RAXToken = artifacts.require("./RAXToken.sol");
const PATToken = artifacts.require("./PATToken.sol");

contract('DistributeRAX', function(accounts) {
  let managers = [accounts[1], accounts[2]];
  let owner = accounts[0];
  let id = 3;
  let name = "pat_3";
  let symbol = "pat3";
  let fixedDocsLink = "https://drive.google.com/open?id=1JYpdAqubjvHvUuurwX7om0dDcA5ycRhc";
  let fixedDocsHash = "323202411a8393971877e50045576ed7";
  let varDocsLink = "https://drive.google.com/open?id=1ZaFg2XtGdTwnkvaj-Kra4cRW_ia6tvBY";
  let varDocsHash = "743f5d72288889e94c076f8b21e07168";

  describe('distribute profit (RAX) to PAT token holders \n', function() {
    distributor.testRAX(RegisteredUsers, DistributeRAX, accounts, managers, deployPATToken, deployRAXToken);
  });

  describe('distribute profit (RAX) to RAX token holders \n', function() {
    distributor.testRAX(RegisteredUsers, DistributeRAX, accounts, managers, deployRAXToken, undefined);
  });

  async function deployPATToken(registeredUsers) {
    return  await PATToken.new(registeredUsers.address, id, managers, name, symbol,
                               fixedDocsLink, fixedDocsHash, varDocsLink, varDocsHash);
  }

  async function deployRAXToken(registeredUsers) {
    return  await RAXToken.new(registeredUsers.address);
  }
});
