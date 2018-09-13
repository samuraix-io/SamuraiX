const BigNumber = web3.BigNumber;

const should = require('chai')
.use(require('chai-as-promised'))
.use(require('chai-bignumber')(BigNumber))
.should();
const regAtt = require('../helpers/registryAttributeConst.js');

const Registry = artifacts.require("./Registry.sol");
const Operatable = artifacts.require("./Operatable.sol");

contract("Operatable", function(accounts) {
  var registryInstance;
  var operatableInstance;

  const registryAccount     = accounts[0];
  const owner               = accounts[1];
  const operator            = accounts[2];
  const guess               = accounts[3];

  beforeEach("Operatable", async function() {
    registryInstance = await Registry.new({from: registryAccount}).should.be.fulfilled;
    operatableInstance = await Operatable.new({from: owner}).should.be.fulfilled;
  });

  describe("isOperator()", function() {
    beforeEach("isOperator()", async function() {
      await operatableInstance.setRegistry(registryInstance.address, {from: owner}).should.be.fulfilled;
    });

    it("Should return true if address is operator", async function() {
      await registryInstance.setAttribute(operator, regAtt.ROLE_OPERATOR, "Set ROLE_OPERATOR ON").should.be.fulfilled;
      (await registryInstance.hasAttribute(operator, regAtt.ROLE_OPERATOR)).should.equal(true);

      (await operatableInstance.isOperator(operator)).should.equal(true);
    });

    it("Should return false if address is not operator", async function() {
      await registryInstance.setAttribute(guess, regAtt.USER_DEFINED, "Set USER_DEFINED ON").should.be.fulfilled;
      (await registryInstance.hasAttribute(guess, regAtt.USER_DEFINED)).should.equal(true);

      (await operatableInstance.isOperator(guess)).should.equal(false);
    });
  });
});
