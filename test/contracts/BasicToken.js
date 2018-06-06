const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const bn = require('./helpers/bignumber.js');

function check(accounts, deployTokenCb) {
  var token;
  var owner = accounts[0];
  var investor = accounts[1];
  var purchaser = accounts[2];

  beforeEach(async function () {
    token = await deployTokenCb();
  });

  describe('transfer()', function() {
    it('should allow to transfer tokens', async function() {
      await token.mint(investor, bn.tokens(100)).should.be.fulfilled;
      await token.transfer(purchaser, bn.tokens(100), {from: investor}).should.be.fulfilled;
    });

    it('should update balances', async function() {
      await token.mint(investor, bn.tokens(100)).should.be.fulfilled;
      var balance1Before = await token.balanceOf(investor);
      var balance2Before = await token.balanceOf(purchaser);
      var amount = bn.tokens(10);
      await token.transfer(purchaser, amount, {from: investor}).should.be.fulfilled;
      var balance1After = await token.balanceOf(investor);
      var balance2After = await token.balanceOf(purchaser);

      balance2After.should.be.bignumber.equal(balance2Before.plus(amount));
      balance1After.should.be.bignumber.equal(balance1Before.minus(amount));
    });

    it("should log Transfer event", async function () {
      var amount = bn.tokens(100);
      await token.mint(investor, amount).should.be.fulfilled;
      const {logs} = await token.transfer(purchaser, amount, {from: investor}).should.be.fulfilled;
      const xferEvent = logs.find(e => e.event === 'Transfer');
      xferEvent.should.exist;
      (xferEvent.args.from).should.equal(investor);
      (xferEvent.args.to).should.equal(purchaser);
      (xferEvent.args.value).should.be.bignumber.equal(amount);
    });

    it('should reject transferring to invalid address', async function() {
      await token.mint(investor, bn.tokens(100)).should.be.fulfilled;
      await token.transfer(0x0, bn.tokens(100), {from: investor}).should.be.rejected;
    });

    it('should reject transferring an amount of tokens which is greater than balance', async function() {
      await token.mint(investor, bn.tokens(100)).should.be.fulfilled;
      await token.transfer(purchaser, bn.tokens(101), {from: investor}).should.be.rejected;
    });

    it('should reject transferring an amount of max uint256', async function() {
      var totalTokens = await token.TOTAL_TOKENS();
      await token.mint(investor, totalTokens).should.be.fulfilled;
      await token.transfer(purchaser, bn.MAX_UINT, {from: investor}).should.be.rejected;
    });

    it('transferring an amount which exceeds max uint256 should be equivalent 0 tokens', async function() {
      var totalTokens = await token.TOTAL_TOKENS();
      await token.mint(investor, totalTokens).should.be.fulfilled;
      var balance1Before = await token.balanceOf(investor);
      var balance2Before = await token.balanceOf(purchaser);
      await token.transfer(purchaser, bn.OVER_UINT, {from: investor}).should.be.fulfilled;
      var balance1After = await token.balanceOf(investor);
      var balance2After = await token.balanceOf(purchaser);

      balance2After.should.be.bignumber.equal(balance2Before);
      balance1After.should.be.bignumber.equal(balance1Before);
    });
  });
}

module.exports.check = check;
