const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const bn = require('./helpers/bignumber.js');

function check(RegisteredUsers, owner, managers, investor, deployTokenCb) {
  var registeredUsers;
  var token;

  beforeEach(async function () {
    registeredUsers = await RegisteredUsers.new();
    await registeredUsers.addRegisteredUser(investor, false);
    await registeredUsers.addRegisteredUser(managers[0], false);
    await registeredUsers.addRegisteredUser(managers[1], false);

    token = await deployTokenCb(registeredUsers);
  });

  describe('getTheNumberOfManagers()', function() {
    it('check the number of managers', async function() {
      var numManagers = await token.getTheNumberOfManagers();
      numManagers.should.be.bignumber.equal(managers.length);
    });
  });

  describe('isManager()', function() {
    it('should return false with a non-manager', async function() {
      (await token.isManager(investor)).should.be.equal(false);
    });

    it('should return true with a manager', async function() {
      (await token.isManager(managers[0])).should.be.equal(true);
      (await token.isManager(managers[1])).should.be.equal(true);
    });
  });

  describe('getManager()', function() {
    it('should fulfille when getting a manager', async function() {
      var manager = await token.getManager(0);
      manager.should.be.equal(managers[0]);
      var manager = await token.getManager(1);
      manager.should.be.equal(managers[1]);
    });
  });
}

module.exports.check = check;
