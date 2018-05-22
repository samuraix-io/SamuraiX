const RegisteredUsers = artifacts.require("./RegisteredUsers.sol");
const RAXToken = artifacts.require("./RAXToken.sol");

const should = require('chai')
  .use(require('chai-as-promised'))
  .should();

const claimableEx = require("./ClaimableEx.js");
const hasNoEther = require("./HasNoEther.js");
const reclaimTokens = require("./CanReclaimToken.js");

contract('RegisteredUsers', function(accounts) {
  let instance;
  before(async function () {
    instance = await RegisteredUsers.deployed();
  });

  describe('ClaimableEx', function() {
      claimableEx.check(accounts, deployContract);
  });

  describe('HasNoEther', function() {
      hasNoEther.check(accounts, deployContract);
  });

  describe('CanReclaimToken', function() {
    reclaimTokens.check(RegisteredUsers, accounts, deployContract, deployToken);
  });

  describe('addRegisteredUser()', function () {
    it('should accept new address', async () => {
      await instance.addRegisteredUser(accounts[1], false).should.be.fulfilled;
    });

    it('should accept new special user', async () => {
      await instance.addRegisteredUser(accounts[0], true).should.be.fulfilled;
    });

    it('should reject existed address', async () => {
      await instance.addRegisteredUser(accounts[1], false).should.be.rejected;
    });

    it('non-owner can not register new address', async () => {
      await instance.addRegisteredUser(accounts[3], false, {from: accounts[2]}).should.be.rejected;
    });
  });

  describe('isUserRegistered()', function () {
    it('should return false with unregistered address', async () => {
      (await instance.isUserRegistered(accounts[9])).should.be.equal(false);
    });

    it('should return true with a normal registered address', async () => {
      (await instance.isUserRegistered(accounts[1])).should.be.equal(true);
    });

    it('should return true with a special user address', async () => {
      (await instance.isUserRegistered(accounts[0])).should.be.equal(true);
    });
  });

  describe('isSpecialUser()', function () {
    it('should return false with a normal user address', async () => {
      (await instance.isSpecialUser(accounts[1])).should.be.equal(false);
    });

    it('should return false with an unregistered user address', async () => {
      (await instance.isNormalUser(accounts[2])).should.be.equal(false);
    });

    it('should return true with a special user address', async () => {
      (await instance.isUserRegistered(accounts[0])).should.be.equal(true);
    });
  });

  describe('isNormalUser()', function () {
    it('should return false with an unregistered user address', async () => {
      (await instance.isNormalUser(accounts[2])).should.be.equal(false);
    });

    it('should return true with a normal user address', async () => {
      (await instance.isNormalUser(accounts[1])).should.be.equal(true);
    });

    it('should return false with a special user address', async () => {
      (await instance.isNormalUser(accounts[0])).should.be.equal(false);
    });
  });

  async function deployToken(registeredUsers) {
    return await RAXToken.new(registeredUsers.address);
  }

  async function deployContract() {
    return await RegisteredUsers.new();
  }
});
