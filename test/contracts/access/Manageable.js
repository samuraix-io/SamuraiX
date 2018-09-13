const BigNumber = web3.BigNumber;

const should = require('chai')
.use(require('chai-as-promised'))
.use(require('chai-bignumber')(BigNumber))
.should();

const Registry = artifacts.require("./Registry.sol");
const Manageable = artifacts.require("./Manageable.sol");
const regAtt = require('../helpers/registryAttributeConst.js');

contract("Manageable", function(accounts) {
  var registryInstance;
  var manageableInstance;

  const registryAccount     = accounts[0];
  const owner               = accounts[1];
  const manager             = accounts[2];
  const guess               = accounts[3];

  beforeEach("Manageable", async function() {
    registryInstance = await Registry.new({from: registryAccount}).should.be.fulfilled;
    manageableInstance = await Manageable.new({from: owner}).should.be.fulfilled;
  });

  describe("isManager()", function() {
    beforeEach("isManager()", async function() {
      await manageableInstance.setRegistry(registryInstance.address, {from: owner}).should.be.fulfilled;
    });

    it("Should return true if address is manager", async function() {
      await registryInstance.setAttribute(manager, regAtt.ROLE_MANAGER, "Set ROLE_MANAGER ON").should.be.fulfilled;
      (await registryInstance.hasAttribute(manager, regAtt.ROLE_MANAGER)).should.equal(true);

      (await manageableInstance.isManager(manager)).should.equal(true);
    });

    it("Should return false if address is not manager", async function() {
      await registryInstance.setAttribute(guess, regAtt.USER_DEFINED, "Set USER_DEFINED ON").should.be.fulfilled;
      (await registryInstance.hasAttribute(guess, regAtt.USER_DEFINED)).should.equal(true);

      (await manageableInstance.isManager(guess)).should.equal(false);
    });
  });
});
