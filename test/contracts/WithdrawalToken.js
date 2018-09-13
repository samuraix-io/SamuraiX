const BigNumber = web3.BigNumber;

const BalanceSheet = artifacts.require("./BalanceSheet.sol");
const Registry = artifacts.require('./Registry.sol')
const bn = require('./helpers/bignumber.js');

const regAtt = require('./helpers/registryAttributeConst.js');

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

function check(accounts, deployTokenCb) {
  var token;
  var balanceSheet;
  var registry;
  const owner = accounts[0];
  const investor = accounts[1];
  const purchaser = accounts[2];
  const ZeroAddress = '0x0';
  const amount = bn.tokens(10);

  beforeEach(async function () {
    token = await deployTokenCb();
    balanceSheet = await BalanceSheet.new({from:owner });
    registry = await Registry.new({from:owner });

    await balanceSheet.transferOwnership(token.address).should.be.fulfilled;
    // 3 : Attribute.AttributeType.HAS_PASSED_KYC_AML
    // 0 : Attribute.AttributeType.ROLE_MANAGER
    await registry.setAttribute(investor, regAtt.HAS_PASSED_KYC_AML, "Set HAS_PASSED_KYC_AML ON").should.be.fulfilled;
    await registry.setAttribute(purchaser, regAtt.HAS_PASSED_KYC_AML, "Set HAS_PASSED_KYC_AML ON").should.be.fulfilled;

    await token.setBalanceSheet(balanceSheet.address).should.be.fulfilled;
    await token.setRegistry(registry.address, {from : owner}).should.be.fulfilled;

    await token.mint(investor, amount, {from : owner}).should.be.fulfilled;
  });

  describe('transfer()', function() {
    it("Should allow investor to transfer balance to zero address", async function () {
      let _oldBalance = await token.balanceOf(investor);
      let _transAmount =  _oldBalance.minus(bn.tokens(1));
      await token.transfer(ZeroAddress, _transAmount, {from : investor}).should.be.fulfilled;
    });

    it("Transfer balance to zero address is like burn balance", async function () {
      let _oldBalance = await token.balanceOf(investor);
      let _transAmount =  _oldBalance.minus(bn.tokens(1));
      await token.transfer(ZeroAddress, _transAmount, {from : investor}).should.be.fulfilled;
      let _currBalance = await token.balanceOf(investor);
      _oldBalance.minus(_transAmount).should.be.bignumber.equal(_currBalance);
    });

    it('Should log burn emit when transfer to zero address', async function () {
      let _oldBalance = await token.balanceOf(investor);
      let _transAmount =  _oldBalance.minus(bn.tokens(1));
      const {logs} = await token.transfer(ZeroAddress, _transAmount, {from : investor}).should.be.fulfilled;
      const tranferLog = logs.find(e => e.event === 'Burn');
      tranferLog.should.exist;
      (tranferLog.args.burner).should.equal(investor);
      (tranferLog.args.value).should.be.bignumber.equal(_transAmount);
      (tranferLog.args.note).should.equal('');
    });
  });

  describe('transferFrom()', function() {
    it("Should reject tranfer from investor to zero address", async function () {
      let _oldBalance = await token.balanceOf(investor);
      let _transAmount =  _oldBalance.minus(bn.tokens(1));
      await token.transferFrom(investor, ZeroAddress, _transAmount, {from: investor}).should.be.rejected;
    });
  });
}

module.exports.check = check;
