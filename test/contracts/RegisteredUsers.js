const RegisteredUsers = artifacts.require("./RegisteredUsers.sol");

const should = require('chai')
  .use(require('chai-as-promised'))
  .should();

contract('RegisteredUsers', function(accounts) {
  let instance;
  before(async function () {
    instance = await RegisteredUsers.deployed();
  });

  it('should return false with unregistered address', async () => {
    (await instance.isUserRegistered(accounts[0])).should.be.equal(false);
  });

  it('should return true with registered address', async () => {
    await instance.addRegisteredUser(accounts[1]).should.be.fulfilled;
    (await instance.isUserRegistered(accounts[1])).should.be.equal(true);
  });

  it('registering new address should be fulfilled', async () => {
    await instance.addRegisteredUser(accounts[2]).should.be.fulfilled;
    (await instance.isUserRegistered(accounts[2])).should.be.equal(true);
  });

  it('non-owner can not register new address', async () => {
    await instance.addRegisteredUser(accounts[3], {from: accounts[2]}).should.be.rejected;
    (await instance.isUserRegistered(accounts[3])).should.be.equal(false);
  });
});
