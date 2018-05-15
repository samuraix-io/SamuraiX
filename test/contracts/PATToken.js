import ether from './helpers/ether.js';

const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const bn = require('./helpers/bignumber.js');
const assetInfo = require("./AssetInformation.js");
const manageable = require("./Manageable.js");
const tokenHolders = require("./TokenHolders.js");
const basicToken = require("./BasicToken.js");
const standardToken = require("./StandardToken.js");
const pausableToken = require("./PausableToken.js");
const mintableToken = require("./MintableToken.js");
const distributableToken = require("./DistributableToken.js");
const manageableToken = require("./ManageableToken.js");

const PATToken = artifacts.require("./PATToken.sol")
const RegisteredUsers = artifacts.require("./RegisteredUsers.sol")


contract('PATToken', function (accounts) {
  let token;
  let registeredUsers;
  let id = 2;
  let name = 'pat_2';
  let symbol = "pat";
  let fixedLinkDoc = 'pat_doc_1';
  let fixedHashDoc = 'pat_hash_1';
  let varLinkDoc = 'var_patDoc1';
  let varHashDoc = 'var_hashDoc1';

  let owner = accounts[0];
  let investor = accounts[3];
  let managers = [accounts[1], accounts[2]];
  let purchaser = accounts[4];
  let beneficiary = accounts[5];

  before(async function () {
    token = await PATToken.deployed();
  });

  describe('check ID', async function() {
    it('should is greater than 1', async function() {
      (await token.getID()).should.be.bignumber.gt(1);
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

  describe('Asset information', function() {
    assetInfo.check(RegisteredUsers, owner, managers, investor, deploy);
  });

  describe('Manageable', function() {
    manageable.check(RegisteredUsers, owner, managers, investor, deploy);
  });

  describe('Manageable Token', function() {
    manageableToken.check(RegisteredUsers, owner, managers, investor, purchaser, beneficiary, deploy);
  });

  async function deploy(registeredUsers) {
    var _token = await PATToken.new(registeredUsers.address, id, managers, name, symbol,
                                    fixedLinkDoc, fixedHashDoc, varLinkDoc, varHashDoc);
    return _token;
  }
});
