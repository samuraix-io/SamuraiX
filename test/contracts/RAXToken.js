import ether from './helpers/ether.js';

const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const RegisteredUsers = artifacts.require("./RegisteredUsers.sol");
const RAXToken = artifacts.require("./RAXToken.sol");

contract('RAXToken', function ([owner, investor, purchaser, network, RAXcompany, partner]) {
  let registeredUsers;
  let token;
  before(async function () {
    registeredUsers = await RegisteredUsers.deployed();
    token = await RAXToken.new(registeredUsers.address);
  });

  it("begins with totalSupply", async function () {
    const totalSupply = await token.totalSupply();
    totalSupply.should.be.bignumber.equal(0);
    owner.should.be.equal(await token.owner());
  });

  it("mint() updates balanceOf and totalSupply", async function () {
    const amount = ether(1);

    const starting_balance = await token.balanceOf(investor);
    const starting_supply = await token.totalSupply();
    await token.mint(investor, amount);

    (await token.balanceOf(investor)).minus(starting_balance).should.be.bignumber.equal(amount);
    (await token.totalSupply()).minus(starting_supply).should.be.bignumber.equal(amount);
  });

  it("mint() logs events", async function () {
    const from = '0x0000000000000000000000000000000000000000';
    const amount = ether(1);

    /*const beforeBalances = await.token.getBalances();
    console.log("balances before minting = " + beforeBalances);*/

    const {logs} = await token.mint(investor, amount);

    const mint_event = logs.find(e => e.event === 'Mint');
    mint_event.should.exist;
    (mint_event.args.to).should.equal(investor);
    (mint_event.args.amount).should.be.bignumber.equal(amount);

    const xfer_event = logs.find(e => e.event === 'Transfer');
    xfer_event.should.exist;
    (xfer_event.args.from).should.equal(from);
    (xfer_event.args.to).should.equal(investor);
    (xfer_event.args.value).should.be.bignumber.equal(amount);
  });

  it('should not mint more than TOTAL_TOKENS', async function () {
    await token.mint(investor, new BigNumber(11).times(10 ** 9).times(10 ** 18)).should.be.rejected;
  });

  describe('Ownable', function() {
   it('should not be self-ownable', async function() {
      await token.transferOwnership(token.address).should.be.rejected;
   });
  });

  describe('Pausable', function() {
    it('should allow approval when not paused', async function() {
      await token.mint(purchaser, 10);
      await token.approve(investor,2, {from: purchaser});
    });
    it('should allow transferFrom when not paused', async function() {
      await token.transferFrom(purchaser, investor,1, {from: investor});
    });
    it('should support pause()', async function() {
      await token.pause();
      (await token.paused()).should.be.equal(true);
    });
    it('should allow minting when paused', async function() {
      await token.mint(investor,1).should.be.fulfilled;
    });
    it('should reject approve when paused', async function() {
      await token.approve(investor,1, {from: RAXcompany}).should.be.rejected;
    });
    it('should reject transferFrom when paused', async function() {
      await token.transferFrom(purchaser, investor,1, {from: investor}).should.be.rejected;
    });
    it('should reject transfer when paused', async function() {
      await token.transfer(investor,1, {from: RAXcompany}).should.be.rejected;
    });
    it('should support unpause()', async function() {
      await token.unpause();
      (await token.paused()).should.be.equal(false);
    });
    it('should allow transferFrom when unpaused', async function() {
      await token.transferFrom(purchaser, investor,1, {from: investor});
    });

    it('should fulfille get Token ID equal 1', async function() {
      (await token.getID()).should.be.bignumber.equal(1);
    });
  });

  //holder test
  describe ('Holder', function () {
    it('should begin with 0 holder', async () => {
      (await token.getTheNumberOfHolders()).should.be.bignumber.equal (0);
    });

    it ('owner can update holder', async() => {
      await token.addHolder(partner).should.not.be.rejected;
    });

    it ('only owner can update holder', async () => {
      await token.addHolder(investor, {from: investor}).should.be.rejected;
    });

    it ('add existed holder should be rejected', async () => {
      var numberHolderBefore = await token.getTheNumberOfHolders();
      (await token.addHolder(investor));
      (await token.addHolder(investor));
      var numberHolderAfter = await token.getTheNumberOfHolders();
      numberHolderAfter.should.be.bignumber.equal(numberHolderBefore.plus(1));
      (await token.isHolder(investor)).should.be.equal(true);
    })

    it('check holder', async () => {
      (await token.isHolder(owner)).should.be.equal(false);

      (await token.isHolder(investor)).should.be.equal(true);
    });

    it('should add holder when transfer token', async function () {
      var amount = 100;
      await registeredUsers.addRegisteredUser(investor, {from: owner}).should.be.fulfilled;
      await registeredUsers.addRegisteredUser(purchaser, {from: owner}).should.be.fulfilled;
      await token.mint(investor, amount);
      await token.transfer(purchaser, amount, {from: investor}).should.be.fulfilled;
      (await token.isHolder(purchaser)).should.be.equal(true);
    });
  });
});
