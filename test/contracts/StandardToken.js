const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const bn = require('./helpers/bignumber.js');

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

  describe('approve()', function() {
    it('should allow to approve tokens', async function() {
      await token.approve(purchaser, bn.tokens(100), {from: investor}).should.be.fulfilled;
    });

    it('should update allowance', async function() {
      var amount = bn.tokens(100);
      await token.approve(purchaser, amount, {from: investor}).should.be.fulfilled;
      var allowance = await token.allowance(investor, purchaser, {from: purchaser}).should.be.fulfilled;
      allowance.should.be.bignumber.equal(amount);
    });

    it("should log Approval event", async function () {
      var amount = bn.tokens(100);
      const {logs} = await token.approve(purchaser, amount, {from: investor}).should.be.fulfilled;
      const event = logs.find(e => e.event === 'Approval');
      event.should.exist;
      (event.args.owner).should.equal(investor);
      (event.args.spender).should.equal(purchaser);
      (event.args.value).should.be.bignumber.equal(amount);
    });
  });

  describe('increaseApproval()', function() {
    it('should allow to increase the amount of tokens that an owner allowed to a spender', async function() {
      await token.increaseApproval(purchaser, bn.tokens(100), {from: investor}).should.be.fulfilled;
    });

    it('should update allowance', async function() {
      var amount = bn.tokens(100);
      await token.approve(purchaser, amount, {from: investor}).should.be.fulfilled;
      await token.increaseApproval(purchaser, amount, {from: investor}).should.be.fulfilled;
      var allowance = await token.allowance(investor, purchaser, {from: purchaser}).should.be.fulfilled;
      allowance.should.be.bignumber.equal(amount.times(2));
    });

    it("should log Approval event", async function () {
      var amount = bn.tokens(100);
      const {logs} = await token.increaseApproval(purchaser, amount, {from: investor}).should.be.fulfilled;
      const event = logs.find(e => e.event === 'Approval');
      event.should.exist;
      (event.args.owner).should.equal(investor);
      (event.args.spender).should.equal(purchaser);
      (event.args.value).should.be.bignumber.equal(amount);
    });
  });

  describe('decreaseApproval()', function() {
    it('should allow to decrease the amount of tokens that an owner allowed to a spender', async function() {
      await token.decreaseApproval(purchaser, bn.tokens(100), {from: investor}).should.be.fulfilled;
    });

    it('should update allowance', async function() {
      var amount = bn.tokens(100);
      var subtractedValue = bn.tokens(1);
      await token.approve(purchaser, amount.plus(subtractedValue), {from: investor}).should.be.fulfilled;
      await token.decreaseApproval(purchaser, subtractedValue, {from: investor}).should.be.fulfilled;
      var allowance = await token.allowance(investor, purchaser, {from: purchaser}).should.be.fulfilled;
      allowance.should.be.bignumber.equal(amount);
    });

    it('allowance should equal 0 if subtracted value is greater than the last allowed value', async function() {
      var amount = bn.tokens(100);
      var subtractedValue = bn.MAX_UINT;
      await token.approve(purchaser, amount, {from: investor}).should.be.fulfilled;
      await token.decreaseApproval(purchaser, subtractedValue, {from: investor}).should.be.fulfilled;
      var allowance = await token.allowance(investor, purchaser, {from: purchaser}).should.be.fulfilled;
      allowance.should.be.bignumber.equal(0);
    });

    it("should log Approval event", async function () {
      var amount = bn.tokens(100);
      var subtractedValue = bn.tokens(1);
      await token.approve(purchaser, amount.plus(subtractedValue), {from: investor}).should.be.fulfilled;
      const {logs} = await token.decreaseApproval(purchaser, subtractedValue, {from: investor}).should.be.fulfilled;
      const event = logs.find(e => e.event === 'Approval');
      event.should.exist;
      (event.args.owner).should.equal(investor);
      (event.args.spender).should.equal(purchaser);
      (event.args.value).should.be.bignumber.equal(amount);
    });
  });

  describe('allowance()', function() {
    it('should have expected initial value', async function() {
      (await token.allowance(investor, purchaser, {from: purchaser})).should.be.bignumber.equal(0);
    });

    it('approval of an amount which exceeds max uint256 should allow to use 0 tokens', async function() {
      await token.approve(purchaser, bn.OVER_UINT, {from: investor}).should.be.fulfilled;
      (await token.allowance(investor, purchaser, {from: purchaser})).should.be.bignumber.equal(0);
    });
  });

  describe('transferFrom()', function() {
    it('should allow to transfer tokens', async function() {
      var amount = bn.tokens(100);
      await token.mint(investor, amount).should.be.fulfilled;
      await token.approve(purchaser, amount, {from: investor}).should.be.fulfilled;
      await token.transferFrom(investor, purchaser, amount, {from: purchaser}).should.be.fulfilled;
    });

    it('should update balances', async function() {
      var amount = bn.tokens(100);
      await token.mint(investor, amount).should.be.fulfilled;
      await token.approve(purchaser, amount, {from: investor}).should.be.fulfilled;
      var balance1Before = await token.balanceOf(investor);
      var balance2Before = await token.balanceOf(purchaser);
      await token.transferFrom(investor, purchaser, amount, {from: purchaser}).should.be.fulfilled;
      var balance1After = await token.balanceOf(investor);
      var balance2After = await token.balanceOf(purchaser);

      balance2After.should.be.bignumber.equal(balance2Before.plus(amount));
      balance1After.should.be.bignumber.equal(balance1Before.minus(amount));
    });

    it("should log Transfer event", async function () {
      var amount = bn.tokens(100);
      await token.mint(investor, amount).should.be.fulfilled;
      await token.approve(purchaser, amount, {from: investor}).should.be.fulfilled;
      const {logs} = await token.transferFrom(investor, purchaser, amount, {from: purchaser}).should.be.fulfilled;
      const xferEvent = logs.find(e => e.event === 'Transfer');
      xferEvent.should.exist;
      (xferEvent.args.from).should.equal(investor);
      (xferEvent.args.to).should.equal(purchaser);
      (xferEvent.args.value).should.be.bignumber.equal(amount);
    });

    it('should reject transferring to invalid address', async function() {
      var amount = bn.tokens(100);
      await token.mint(investor, amount).should.be.fulfilled;
      await token.approve(purchaser, amount, {from: investor}).should.be.fulfilled;
      await token.transferFrom(investor, 0x0, amount, {from: purchaser}).should.be.rejected;
    });

    it('should reject transferring an amount of tokens which is greater than allowance', async function() {
      var amount = bn.tokens(100);
      await token.mint(investor, amount).should.be.fulfilled;
      await token.approve(purchaser, amount, {from: investor}).should.be.fulfilled;
      await token.transferFrom(investor, purchaser, amount.plus(bn.tokens(1)), {from: purchaser}).should.be.rejected;
    });

    it('should reject transferring an amount of max uint256', async function() {
      var totalTokens = await token.TOTAL_TOKENS();
      await token.mint(investor, totalTokens).should.be.fulfilled;
      await token.approve(purchaser, bn.MAX_UINT, {from: investor}).should.be.fulfilled;
      await token.transferFrom(investor, purchaser, bn.MAX_UINT, {from: purchaser}).should.be.rejected;
    });

    it('transferring an amount which exceeds max uint256 should be equivalent 0 tokens', async function() {
      var totalTokens = await token.TOTAL_TOKENS();
      await token.mint(investor, totalTokens).should.be.fulfilled;
      await token.approve(purchaser, bn.OVER_UINT, {from: investor}).should.be.fulfilled;
      (await token.allowance(investor, purchaser)).should.be.bignumber.equal(0);

      var balance1Before = await token.balanceOf(investor);
      var balance2Before = await token.balanceOf(purchaser);
      await token.transferFrom(investor, purchaser, bn.OVER_UINT, {from: purchaser}).should.be.fulfilled;
      var balance1After = await token.balanceOf(investor);
      var balance2After = await token.balanceOf(purchaser);

      balance2After.should.be.bignumber.equal(balance2Before);
      balance1After.should.be.bignumber.equal(balance1Before);
    });
  });
}

module.exports.check = check;
