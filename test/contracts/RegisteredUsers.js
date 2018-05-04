const RegisteredUsers = artifacts.require("./RegisteredUsers.sol");

const should = require('chai')
  .use(require('chai-as-promised'))
  .should();

contract('RegisteredUsers', function(accounts) {
  let instance;
  before(async function () {
    instance = await RegisteredUsers.deployed();
  });

  it('should check user not registerd equal false', async () => {
    (await instance.isUserRegistered(accounts[0])).should.be.equal(false);
  });

  it('should return true when user register', async () => {
    await instance.addRegisteredUser(accounts[1]).should.be.fulfilled;
    (await instance.isUserRegistered(accounts[1])).should.be.equal(true);
  });

  it('should fulfille add user when user register', async () => {
    await instance.addRegisteredUser(accounts[2]).should.be.fulfilled;
    (await instance.isUserRegistered(accounts[2])).should.be.equal(true);
  });

  it('should reject add user when not owner call', async () => {
    await instance.addRegisteredUser(accounts[3] , {from: accounts[2]}).should.be.rejected;
    (await instance.isUserRegistered(accounts[3])).should.be.equal(false);
  });

  it('can fulfille add user twice', async () => {
    await instance.addRegisteredUser(accounts[4]).should.be.fulfilled;
    await instance.addRegisteredUser(accounts[4]).should.be.fulfilled;
    (await instance.isUserRegistered(accounts[4])).should.be.equal(true);
  });
});
