import ether from './helpers/ether.js';

const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const RegisteredUsers = artifacts.require("./RegisteredUsers.sol");
const RAXToken = artifacts.require("./RAXToken.sol");

contract('RAXToken', function ([owner, investor, purchaser, beneficiary1, beneficiary2, beneficiary3]) {
  let registeredUsers;
  let token;

  before(async function () {
    registeredUsers = await RegisteredUsers.deployed();
    token = await RAXToken.new(registeredUsers.address);

    await registeredUsers.addRegisteredUser(investor);
    await registeredUsers.addRegisteredUser(purchaser);
    await registeredUsers.addRegisteredUser(beneficiary1);
    await registeredUsers.addRegisteredUser(beneficiary2);
  });

  it("begins with totalSupply", async function () {
    const totalSupply = await token.totalSupply();
    totalSupply.should.be.bignumber.equal(0);
    owner.should.be.equal(await token.owner());
  });

  it("mint() updates balanceOf and totalSupply", async function () {
    const amount = ether(1);

    const startingBalance = await token.balanceOf(investor);
    const startingSupply = await token.totalSupply();
    await token.mint(investor, amount);

    (await token.balanceOf(investor)).minus(startingBalance).should.be.bignumber.equal(amount);
    (await token.totalSupply()).minus(startingSupply).should.be.bignumber.equal(amount);
  });

  it("mint() logs events", async function () {
    const from = '0x0000000000000000000000000000000000000000';
    const amount = ether(1);

    const {logs} = await token.mint(investor, amount);

    const mintEvent = logs.find(e => e.event === 'Mint');
    mintEvent.should.exist;
    (mintEvent.args.to).should.equal(investor);
    (mintEvent.args.amount).should.be.bignumber.equal(amount);

    const xferEvent = logs.find(e => e.event === 'Transfer');
    xferEvent.should.exist;
    (xferEvent.args.from).should.equal(from);
    (xferEvent.args.to).should.equal(investor);
    (xferEvent.args.value).should.be.bignumber.equal(amount);
  });

  it('should not mint more than TOTAL_TOKENS', async function () {
    await token.mint(investor, new BigNumber(11).times(10 ** 9).times(10 ** 18)).should.be.rejected;
  });

  it('check ID', async function() {
    (await token.getID()).should.be.bignumber.equal(1);
  });

  describe('Ownable', function() {
   it('should not be self-ownable', async function() {
      await token.transferOwnership(token.address).should.be.rejected;
   });
  });

  describe('Pausable', function() {
    it('should allow approval when not paused', async function() {
      await token.mint(purchaser, 10).should.be.fulfilled;
      await token.approve(investor, 2, {from: purchaser}).should.be.fulfilled;
    });

    it('should allow transfer when not paused', async function() {
      await token.transfer(beneficiary1, 1, {from: purchaser}).should.be.fulfilled;
    });

    it('should allow increaseApproval when not paused', async function() {
      await token.increaseApproval(investor, 3, {from: purchaser}).should.be.fulfilled;
    });

    it('should allow decreaseApproval when not paused', async function() {
      await token.decreaseApproval(investor, 1, {from: purchaser}).should.be.fulfilled;
    });

    it('should allow transferFrom when not paused', async function() {
      await token.transferFrom(purchaser, investor, 1, {from: investor}).should.be.fulfilled;
    });

    it('should support pause()', async function() {
      await token.pause().should.be.fulfilled;
      (await token.paused()).should.be.equal(true);
    });

    it('should allow minting when paused', async function() {
      await token.mint(investor, 1).should.be.fulfilled;
    });

    it('should reject approve when paused', async function() {
      await token.approve(investor, 1, {from: purchaser}).should.be.rejected;
    });

    it('should reject increaseApproval when paused', async function() {
      await token.increaseApproval(investor, 1, {from: purchaser}).should.be.rejected;
    });

    it('should reject decreaseApproval when paused', async function() {
      await token.decreaseApproval(investor, 1, {from: purchaser}).should.be.rejected;
    });

    it('should reject transferFrom when paused', async function() {
      await token.transferFrom(purchaser, investor, 1, {from: investor}).should.be.rejected;
    });

    it('should reject transfer when paused', async function() {
      await token.transfer(investor, 1, {from: purchaser}).should.be.rejected;
    });

    it('should support unpause()', async function() {
      await token.unpause().should.be.fulfilled;
      (await token.paused()).should.be.equal(false);
    });

    it('should allow transfer when unpaused', async function() {
      await token.transfer(beneficiary1, 1, {from: purchaser}).should.be.fulfilled;
    });

    it('should allow approve when unpaused', async function() {
      await token.approve(beneficiary1, 1, {from: purchaser}).should.be.fulfilled;
    });

    it('should allow increaseApproval when unpaused', async function() {
      await token.increaseApproval(beneficiary1, 1, {from: purchaser}).should.be.fulfilled;
    });

    it('should allow decreaseApproval when unpaused', async function() {
      await token.decreaseApproval(beneficiary1, 1, {from: purchaser}).should.be.fulfilled;
    });

    it('should allow transferFrom when unpaused', async function() {
      await token.transferFrom(purchaser, beneficiary1, 1, {from: beneficiary1}).should.be.fulfilled;
    });
  });

  describe('Token holders', function () {
    before(async function() {
      token = await RAXToken.new(registeredUsers.address);
    });

    it('should begin with 0 holder', async () => {
      (await token.getTheNumberOfHolders()).should.be.bignumber.equal(0);
    });

    it('owner can add holder', async() => {
      await token.addHolder(purchaser).should.not.be.rejected;
    });

    it('non-owner can not add holder', async () => {
      await token.addHolder(investor, {from: investor}).should.be.rejected;
    });

    it('add existed holder should be rejected', async () => {
      var numHoldersBefore = await token.getTheNumberOfHolders();
      await token.addHolder(investor);
      await token.addHolder(investor);
      var numHoldersAfter = await token.getTheNumberOfHolders();
      numHoldersAfter.should.be.bignumber.equal(numHoldersBefore.plus(1));
      (await token.isHolder(investor)).should.be.equal(true);
    })

    it('check isHolder()', async () => {
      (await token.isHolder(owner)).should.be.equal(false);
      (await token.isHolder(investor)).should.be.equal(true);
    });

    it('should add beneficiary address to holders list when transferring tokens', async function () {
      await token.mint(investor, 100);
      (await token.isHolder(beneficiary1)).should.be.equal(false);
      await token.transfer(beneficiary1, 50, {from: investor}).should.be.fulfilled;
      (await token.isHolder(beneficiary1)).should.be.equal(true);

      (await token.isHolder(beneficiary2)).should.be.equal(false);
      await token.approve(purchaser, 50, {from: investor}).should.be.fulfilled;
      await token.transferFrom(investor, beneficiary2, 50, {from: purchaser}).should.be.fulfilled;
      (await token.isHolder(beneficiary2)).should.be.equal(true);
    });

    it('can not transfer tokens to any unregistered addresses', async () => {
      (await registeredUsers.isUserRegistered(beneficiary3)).should.be.equal(false);
      await token.mint(investor, 100);
      await token.transfer(beneficiary3, 50, {from: investor}).should.be.rejected;
      await token.approve(purchaser, 50, {from: investor}).should.be.fulfilled;
      await token.transferFrom(investor, beneficiary3, 50, {from: purchaser}).should.be.rejected;
    });
  });
});
