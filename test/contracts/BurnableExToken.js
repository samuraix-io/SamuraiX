const BigNumber = web3.BigNumber;
const Registry = artifacts.require('./Registry.sol')

const bn = require('./helpers/bignumber.js');
const BalanceSheet = artifacts.require("./BalanceSheet.sol");
const BurnableToken   = require("./base-token/BurnableToken.js")
const regAtt = require('./helpers/registryAttributeConst.js');

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

function check(accounts, deployTokenCb) {
  var token;
  var balanceSheet;
  var registry;
  var owner = accounts[0];
  var otherManager = accounts[1];
  const investor_1 = accounts[2];
  const investor_2 = accounts[3];
  const otherUser = accounts[4]


  const amount = bn.tokens(10);
  const burnAllNote = "burn all coins"

  beforeEach(async function () {
    token = await deployTokenCb();
    balanceSheet = await BalanceSheet.new({from:owner });
    registry = await Registry.new({from:owner });

    await balanceSheet.transferOwnership(token.address).should.be.fulfilled;
    // 3 : Attribute.AttributeType.HAS_PASSED_KYC_AML
    // 0 : Attribute.AttributeType.ROLE_MANAGER
    await registry.setAttribute(investor_1, regAtt.HAS_PASSED_KYC_AML, "Set HAS_PASSED_KYC_AML ON").should.be.fulfilled;
    await registry.setAttribute(investor_2, regAtt.HAS_PASSED_KYC_AML, "Set HAS_PASSED_KYC_AML ON").should.be.fulfilled;
    await registry.setAttribute(owner, regAtt.ROLE_MANAGER, "Set ROLE_MANAGER ON").should.be.fulfilled;
    await registry.setAttribute(otherManager, regAtt.ROLE_MANAGER, "Set ROLE_MANAGER ON").should.be.fulfilled;

    await token.setBalanceSheet(balanceSheet.address).should.be.fulfilled;
    await token.setRegistry(registry.address, {from : owner}).should.be.fulfilled;

    await token.mint(investor_1, amount, {from : owner}).should.be.fulfilled;
    await token.mint(investor_2, amount, {from : owner}).should.be.fulfilled;

  })

  describe("burnAll()", function () {

    it('Should reject if non-manager', async function () {
      await token.burnAll("not manager", {from : otherUser }).should.be.rejected;
    });

    it('Should allow manager to call', async function () {
      await token.burnAll(burnAllNote, {from : owner }).should.be.fulfilled;
    });

    it('Should allow other manager also to call', async function () {
      await token.burnAll(burnAllNote, {from : otherManager }).should.be.fulfilled;
    });

    it('All balance of users will be set to 0 after burnAll', async function () {
      await token.burnAll(burnAllNote, {from : owner }).should.be.fulfilled;
      let _listInvestor = [investor_1, investor_2];
      for (let _iter = 0; _iter < 2; _iter++) {
        let _currentBalance = await token.balanceOf(_listInvestor[_iter]);
        _currentBalance.toNumber().should.be.bignumber.equal(0);
      }
    });

    it('Should log events', async function() {
      const {logs} = await token.burnAll(burnAllNote, {from : owner }).should.be.fulfilled;

      let _listInvestor = [investor_1, investor_2];
      let _correspondingAmount = [amount, amount];
      let _iter = 0;
      logs.forEach(function(element) {
        if (element.event === 'Burn') {
          (element.args.burner).should.equal(_listInvestor[_iter]);
          (element.args.value).should.be.bignumber.equal(_correspondingAmount[_iter]);
          _iter++;
        }
      });
    });

  });

  describe('BurnableToken', function() {
    BurnableToken.check(accounts, deployTokenCb);
  });
}


module.exports.check = check;
