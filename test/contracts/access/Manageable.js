const BigNumber = web3.BigNumber;

const should = require('chai')
.use(require('chai-as-promised'))
.use(require('chai-bignumber')(BigNumber))
.should();

const Registry = artifacts.require("./Registry.sol");
const Manageable = artifacts.require("./Manageable.sol");

contract("Manageable", function(accounts) {
  var registryInstance;
  var manageableInstance;

  const registryAccount     = accounts[0];
  const manageableAccount   = accounts[1];
  const manager             = accounts[2];
  const guess               = accounts[3];

  const ROLE_MANAGER    = 0;
  const ROLE_OPERATOR   = 1;
  const BLACKLISTED     = 2;
  const PASSED_KYC_AML  = 3;
  const NO_FEE          = 4;
  const USER_DEFINED    = 5;

  beforeEach("Manageable", async function() {
    registryInstance = await Registry.new({from: registryAccount}).should.be.fulfilled;
    manageableInstance = await Manageable.new({from: manageableAccount}).should.be.fulfilled;
  });

  describe("isManager()", function() {
    beforeEach("isManager()", async function() {
      await manageableInstance.setRegistry(registryInstance.address, {from: manageableAccount}).should.be.fulfilled;
    });

    it("Should return true if address is manager", async function() {
      await registryInstance.setAttribute(manager, ROLE_MANAGER, "Set ROLE_MANAGER attribute").should.be.fulfilled;
      (await registryInstance.hasAttribute(manager, ROLE_MANAGER)).should.equal(true);

      (await manageableInstance.isManager(manager)).should.equal(true);
    });

    it("Should return false if address is not manager", async function() {
      await registryInstance.setAttribute(guess, USER_DEFINED, "Set USER_DEFINED attribute").should.be.fulfilled;
      (await registryInstance.hasAttribute(guess, USER_DEFINED)).should.equal(true);

      (await manageableInstance.isManager(guess)).should.equal(false);
    });
  });
});
