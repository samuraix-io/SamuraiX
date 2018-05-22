const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const bn = require('./helpers/bignumber.js');
const claimableEx = require("./ClaimableEx.js");
const hasNoEther = require("./HasNoEther.js");
const reclaimTokens = require("./CanReclaimToken.js");
const tokenHolders = require("./TokenHolders.js");
const basicToken = require("./BasicToken.js");
const standardToken = require("./StandardToken.js");
const pausableToken = require("./PausableToken.js");
const mintableToken = require("./MintableToken.js");
const distributableToken = require("./DistributableToken.js");

const RegisteredUsers = artifacts.require("./RegisteredUsers.sol");
const RAXToken = artifacts.require("./RAXToken.sol");


contract('RAXToken', function (accounts) {
  let token;

  before(async function () {
    token = await RAXToken.deployed();
  });

  describe('check ID', async function() {
    it('should equal 1', async function() {
      (await token.getID()).should.be.bignumber.equal(1);
    });
  });

  describe('transferOwnership()', function() {
    it('should not be self-ownable', async function() {
      await token.transferOwnership(token.address).should.be.rejected;
    });
  });

  describe('ClaimableEx', function() {
      claimableEx.check(accounts, deployContract);
  });
  
  describe('HasNoEther', function() {
      hasNoEther.check(accounts, deployContract);
  });

  describe('CanReclaimToken', function() {
    reclaimTokens.check(RegisteredUsers, accounts, deployContract, deploy);
  });

  describe('Mintable Token', function() {
    mintableToken.check(RegisteredUsers, accounts, deploy);
  });

  describe('Distributable Token', function() {
    distributableToken.check(RegisteredUsers, accounts, deploy);
  });

  describe('Basic Token', function() {
    basicToken.check(RegisteredUsers, accounts, deploy);
  });

  describe('Standard Token', function() {
    standardToken.check(RegisteredUsers, accounts, deploy);
  });

  describe('Pausable Token', function() {
    pausableToken.check(RegisteredUsers, accounts, deploy);
  });

  describe('Token Holders', function() {
    tokenHolders.check(RegisteredUsers, accounts, deploy);
  });

  async function deploy(registeredUsers) {
    var _token = await RAXToken.new(registeredUsers.address);
    return _token;
  }

  async function deployContract() {
    return deploy(await RegisteredUsers.deployed());
  }
});
