const RegisteredUsers = artifacts.require("./RegisteredUsers.sol");

const should = require('chai')
    .use(require('chai-as-promised'))
    .should();

contract('RegisteredUsers', function(accounts) {
  let instance;
  before(async function () {
      instance = await RegisteredUsers.deployed();
      //console.log(instance);
  });

  it('check user registerd or not', async () => {
    (await instance.isUserRegistered(accounts[0])).should.be.equal(false);
  });

  it('add user when user has registerd', async () => {
    await instance.addRegisteredUser(accounts[1]).should.be.fulfilled;
    (await instance.isUserRegistered(accounts[1])).should.be.equal(true);
  });
});
