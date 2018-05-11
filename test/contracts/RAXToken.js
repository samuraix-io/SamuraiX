const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const bn = require('./helpers/bignumber.js');
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
});
