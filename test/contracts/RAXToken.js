const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const bn = require('./helpers/bignumber.js');
const claimableEx = require("./ClaimableEx.js");
const hasNoEther = require("./HasNoEther.js");
const reclaimTokens = require("./CanReclaimToken.js");
const basicToken = require("./BasicToken.js");
const standardToken = require("./StandardToken.js");
const pausableToken = require("./PausableToken.js");
const mintableToken = require("./MintableToken.js");

const RAXToken = artifacts.require("./RAXToken.sol");


contract('RAXToken', function (accounts) {
  let token;

  before(async function () {
    token = await RAXToken.deployed();
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
    reclaimTokens.check(accounts, deployContract, deploy);
  });

  describe('Mintable Token', function() {
    mintableToken.check(accounts, deploy);
  });

  describe('Basic Token', function() {
    basicToken.check(accounts, deploy);
  });

  describe('Standard Token', function() {
    standardToken.check(accounts, deploy);
  });

  describe('Pausable Token', function() {
    pausableToken.check(accounts, deploy);
  });

  async function deploy() {
    var _token = await RAXToken.new();
    return _token;
  }

  async function deployContract() {
    return deploy();
  }
});
