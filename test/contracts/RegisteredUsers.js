const RegisteredUsers = artifacts.require("./RegisteredUsers.sol");

const should = require('chai')
  .use(require('chai-as-promised'))
  .should();

contract('RegisteredUsers', function(accounts) {
  let instance;
  before(async function () {
    instance = await RegisteredUsers.deployed();
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
});
