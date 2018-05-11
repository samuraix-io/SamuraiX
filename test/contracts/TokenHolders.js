import ether from './helpers/ether.js';

const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

function check(RegisteredUsers, accounts, deployTokenCb) {
  var registeredUsers;
  var token;
  var owner = accounts[0];
  var investor = accounts[1];
  var purchaser = accounts[2];

  beforeEach(async function () {
    registeredUsers = await RegisteredUsers.new();
    await registeredUsers.addRegisteredUser(investor, false);
    await registeredUsers.addRegisteredUser(purchaser, false);

    token = await deployTokenCb(registeredUsers);
  });

  describe('getTheNumberOfHolders()', function() {
    it('should begin with 0 holders', async function() {
      (await token.getTheNumberOfHolders()).should.be.bignumber.equal(0);
    });

    it('should have expected value', async function() {
      await token.addHolder(purchaser).should.be.fulfilled;
      (await token.getTheNumberOfHolders()).should.be.bignumber.equal(1);
      await token.addHolder(investor).should.be.fulfilled;
      (await token.getTheNumberOfHolders()).should.be.bignumber.equal(2);
    });
  });

  describe('addHolder()', function() {
    it('owner can add new holder', async() => {
      await token.addHolder(purchaser).should.be.fulfilled;
    });

    it('non-owner can not add new holder', async () => {
      await token.addHolder(investor, {from: investor}).should.be.rejected;
    });

    it('should reject adding an existed holder', async () => {
      var numHoldersBefore = await token.getTheNumberOfHolders();
      await token.addHolder(investor);
      await token.addHolder(purchaser);
      await token.addHolder(investor);
      var numHoldersAfter = await token.getTheNumberOfHolders();
      numHoldersAfter.should.be.bignumber.equal(numHoldersBefore.plus(2));
      (await token.isHolder(investor)).should.be.equal(true);
      (await token.isHolder(purchaser)).should.be.equal(true);
    })
  });

  describe('isHolder()', function() {
    it('should return false with non-holder', async() => {
      (await token.isHolder(investor)).should.be.equal(false);
    });

    it('should return true with a token holder', async() => {
      await token.addHolder(investor, {from: owner});
      (await token.isHolder(investor)).should.be.equal(true);
    });
  });
}

module.exports.check = check;
