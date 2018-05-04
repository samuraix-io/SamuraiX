import ether from './helpers/ether.js';

const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const PATToken = artifacts.require("./PATToken.sol")
const RegisteredUsers = artifacts.require("./RegisteredUsers.sol")
contract('PATToken', function ([owner, manager1, manager2, investor, purchaser, beneficiary1, beneficiary2, beneficiary3]) {
  let token;
  let registeredUsers;
  let id = 2;
  let name = 'pat_2';
  let symbol = "pat";
  let fixedLinkDoc = 'pat_doc_1';
  let fixedHashDoc = 'pat_hash_1';
  let varLinkDoc = 'var_patDoc1';
  let varHashDoc = 'var_hashDoc1';
  let managers = [manager1, manager2];

  before(async function () {
    registeredUsers = await RegisteredUsers.new();
    await registeredUsers.addRegisteredUser(investor);
    await registeredUsers.addRegisteredUser(purchaser);
    await registeredUsers.addRegisteredUser(beneficiary1);
    await registeredUsers.addRegisteredUser(beneficiary2);

    token = await PATToken.new(registeredUsers.address, id, managers, name, symbol,
                          fixedLinkDoc, fixedHashDoc, varLinkDoc, varHashDoc);
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
    await token.mint(investor, new BigNumber(101).times(10 ** 6).times(10 ** 18)).should.be.rejected;
  });

  it('check ID', async function() {
    (await token.getID()).should.be.bignumber.equal(2);
  });

  describe('Token holders', function () {
    before(async function () {
      token = await PATToken.new(registeredUsers.address, id, managers, name, symbol,
                            fixedLinkDoc, fixedHashDoc, varLinkDoc, varHashDoc);
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

  describe('Asset information', function() {
    it('check manager address', async() => {
      (await token.getManager(0)).should.be.equal(managers[0]);
      (await token.getManager(1)).should.be.equal(managers[1]);
    });

    it('managers can update running documents', async() => {
      await token.changeRunningDocuments("link1", "hash2", {from: managers[0]}).should.not.be.rejected;
      await token.changeRunningDocuments("link2", "hash2", {from: managers[1]}).should.not.be.rejected;
    });

    it('non-manager can not update running documents', async() => {
      await token.changeRunningDocuments("link", "hash", {from: investor}).should.be.rejected;
    });

    it('updating running documents should emit event', async() => {
      var link = "link";
      var hash = "hash";

      const {logs} = await token.changeRunningDocuments(link, hash, {from: managers[0]});

      const event = logs.find(e => e.event === 'UpdateRunningDocuments');
      event.should.exist;
      (event.args._linkDoc).should.equal(link);
      (event.args._hashDoc).should.equal(hash);
    });

    it('updating running documents should update state', async() => {
      var link = "test_link_1234";
      var hash = "test_hash_1234";
      await token.changeRunningDocuments(link, hash, {from: managers[1]});

      var returnVals = await token.getRunningDocuments();
      var currentLink = returnVals[0];
      var currentHash = returnVals[1];
      currentLink.should.be.equal(link);
      currentHash.should.be.equal(hash);
    });
  });

  describe('Manageable', function() {
    it('should start with 2 managers', async function() {
      var numManagers = await token.getTheNumberOfManagers();
      numManagers.should.be.bignumber.equal(2);
    });

    it('should return false with non-manager', async function() {
      (await token.isManager(investor)).should.be.equal(false);
    });

    it('should return true with a manager', async function() {
      (await token.isManager(managers[0])).should.be.equal(true);
      (await token.isManager(managers[1])).should.be.equal(true);
    });

    it('should fulfille when getting a manager', async function() {
      var manager = await token.getManager(0);
      manager.should.be.equal(managers[0]);
      var manager = await token.getManager(1);
      manager.should.be.equal(managers[1]);
    });
  });

  describe('Pausable', function() {
    before(async function () {
      token = await PATToken.new(registeredUsers.address, id, managers, name, symbol,
                            fixedLinkDoc, fixedHashDoc, varLinkDoc, varHashDoc);
    });

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

  describe('Ownable', function() {
    it('should not be self-ownable', async function() {
      await token.transferOwnership(token.address).should.be.rejected;
    });
  });

  describe('Enable and disable', function() {
    before(async function () {
      token = await PATToken.new(registeredUsers.address, id, managers, name, symbol,
                            fixedLinkDoc, fixedHashDoc, varLinkDoc, varHashDoc);
    });

    it('should allow mint when enable', async function() {
      await token.mint(purchaser, 100000).should.be.fulfilled;
    });

    it('should allow transfer when enable', async function() {
      await token.mint(purchaser, 10).should.be.fulfilled;
      await token.transfer(investor, 10, {from: purchaser}).should.be.fulfilled;
    });

    it('should allow approve when enable', async function() {
      await token.mint(purchaser, 10000).should.be.fulfilled;
      await token.approve(investor, 10000, {from: purchaser}).should.be.fulfilled;
    });

    it('should allow transferFrom when enable', async function() {
      await token.mint(purchaser, 10).should.be.fulfilled;
      await token.transferFrom(purchaser, beneficiary1, 10, {from: investor}).should.be.fulfilled;
    });

    it('should allow increaseApproval when enable', async function() {
      await token.mint(purchaser, 10).should.be.fulfilled;
      await token.increaseApproval(investor, 10, {from: purchaser}).should.be.fulfilled;
    });

    it('should allow decreaseApproval when enable', async function() {
      await token.decreaseApproval(investor, 1, {from: purchaser}).should.be.fulfilled;
    });

    it('should allow disable', async function() {
      await token.disableToken({from: managers[0]}).should.be.fulfilled;
    });

    it('should reject mint when disable', async function() {
      await token.mint(purchaser, 10).should.be.rejected;
    });

    it('should reject transfer when disable', async function() {
      await token.transfer(investor, 1, {from: purchaser}).should.be.rejected;
    });

    it('should reject approve when disable', async function() {
      await token.approve(investor, 1, {from: purchaser}).should.be.rejected;
    });

    it('should reject transferFrom when disable', async function() {
      await token.transferFrom(purchaser, beneficiary1, 1, {from: investor}).should.be.rejected;
    });

    it('should reject increaseApproval when disable', async function() {
      await token.increaseApproval(investor, 1, {from: purchaser}).should.be.rejected;
    });

    it('should reject decreaseApproval when disable', async function() {
      await token.decreaseApproval(investor, 1, {from: purchaser}).should.be.rejected;
    });

    it('should reject finishMinting when disable', async function() {
      await token.finishMinting({from: owner}).should.be.rejected;
    });

    it('can enable disabled token', async function() {
      await token.enableToken({from: managers[1]}).should.be.fulfilled;
      await token.mint(purchaser, 10).should.be.fulfilled;
      await token.approve(investor, 1, {from: purchaser}).should.be.fulfilled;
      await token.transfer(investor, 1, {from: purchaser}).should.be.fulfilled;
      await token.transferFrom(purchaser, beneficiary1, 1, {from: investor}).should.be.fulfilled;
      await token.increaseApproval(investor, 1, {from: purchaser}).should.be.fulfilled;
      await token.decreaseApproval(investor, 1, {from: purchaser}).should.be.fulfilled;
      await token.finishMinting({from: owner}).should.be.fulfilled;
    });
  });


});
