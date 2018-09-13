const BigNumber = web3.BigNumber;

const should = require('chai')
.use(require('chai-as-promised'))
.use(require('chai-bignumber')(BigNumber))
.should();
const regAtt = require('../helpers/registryAttributeConst.js');

const Registry = artifacts.require("./Registry.sol");
const DefaultRegistryAccessManager = artifacts.require("./DefaultRegistryAccessManager.sol");

contract('Registry', function (accounts) {
  var registry;
  var registry_access_manager;
  var valueAttribute;

  const owner         = accounts[0];
  const manager       = accounts[1];
  const operator      = accounts[2];
  const guess         = accounts[3];
  const accessManager = accounts[4];

  beforeEach(async function () {
    registry = await Registry.new({from: owner});
  });

  describe('Registry', function() {
    describe("setManager()", function() {
      beforeEach(async function() {
        registry_access_manager = await DefaultRegistryAccessManager.new({from: accessManager}).should.be.fulfilled;
      });

      it("Should reject if caller is not owner", async function() {
        await registry.setManager(registry_access_manager.address, {from: guess}).should.be.rejected;
      });

      it("Should allow if caller is owner", async function() {
        await registry.setManager(registry_access_manager.address, {from: owner}).should.be.fulfilled;

        let addr_accessManager = await registry.accessManager().should.be.fulfilled;
        assert.equal(registry_access_manager.address, addr_accessManager);
      });

      it("Catch event log", async function() {
        let addr_accessManager = await registry.accessManager().should.be.fulfilled;
        const {logs} = await registry.setManager(registry_access_manager.address, {from: owner}).should.be.fulfilled;;
        const setManagerLog = logs.find(e => e.event === 'SetManager');
        setManagerLog.should.exist;
        (setManagerLog.args.oldManager).should.equal(addr_accessManager);
        (setManagerLog.args.newManager).should.equal(registry_access_manager.address);
      });
    });

    describe("Attributes", function() {
      describe("ROLE_MANAGER", function() {
        describe("setAttribute()", function() {
          it('Should allow if owner set ROLE_MANAGER attribute', async function() {
            (await registry.hasAttribute(manager, regAtt.ROLE_MANAGER)).should.equal(false);

            await registry.setAttribute(manager, regAtt.ROLE_MANAGER, "Set ROLE_MANAGER attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(manager, regAtt.ROLE_MANAGER)).should.equal(true);
          });

          it('Should reject if manager set ROLE_MANAGER attribute', async function() {
            (await registry.hasAttribute(manager, regAtt.ROLE_MANAGER)).should.equal(false);
            (await registry.hasAttribute(guess, regAtt.ROLE_MANAGER)).should.equal(false);

            await registry.setAttribute(manager, regAtt.ROLE_MANAGER, "Set ROLE_MANAGER attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(manager, regAtt.ROLE_MANAGER)).should.equal(true);

            await registry.setAttribute(guess, regAtt.ROLE_MANAGER, "Set ROLE_MANAGER attribute", {from: manager}).should.be.rejected;
            (await registry.hasAttribute(guess, regAtt.ROLE_MANAGER)).should.equal(false);
          });

          it('Should reject if operator set ROLE_MANAGER attribute', async function() {
            await registry.setAttribute(operator, regAtt.ROLE_OPERATOR, "Set ROLE_OPERATOR attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(operator, regAtt.ROLE_OPERATOR)).should.equal(true);

            await registry.setAttribute(manager, regAtt.ROLE_MANAGER, "Set ROLE_MANAGER attribute", {from: operator}).should.be.rejected;
            (await registry.hasAttribute(manager, regAtt.ROLE_MANAGER)).should.equal(false);
          });

          it('Should reject if guess set ROLE_MANAGER attribute', async function() {
            await registry.setAttribute(manager, regAtt.ROLE_MANAGER, "Set ROLE_MANAGER attribute", {from: guess}).should.be.rejected;
            (await registry.hasAttribute(manager, regAtt.ROLE_MANAGER)).should.equal(false);
          });
        });

        describe("getAttributes()", function() {
          it('Should allow if anyone get ROLE_MANAGER attribute', async function() {
            await registry.setAttribute(manager, regAtt.ROLE_MANAGER, "Set ROLE_MANAGER attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(manager, regAtt.ROLE_MANAGER)).should.equal(true);

            valueAttribute = await registry.getAttributes(manager, {from: guess});
            assert.equal(valueAttribute, 1);
          });
        });

        describe("clearAttribute()", function() {
          it('Should allow if owner clear ROLE_MANAGER attribute', async function() {
            await registry.setAttribute(manager, regAtt.ROLE_MANAGER, "Set ROLE_MANAGER attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(manager, regAtt.ROLE_MANAGER)).should.equal(true);

            await registry.clearAttribute(manager, regAtt.ROLE_MANAGER, "Clear ROLE_MANAGER attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(manager, regAtt.ROLE_MANAGER)).should.equal(false);
          });

          it('Should reject if manager clear ROLE_MANAGER attribute', async function() {
            await registry.setAttribute(manager, regAtt.ROLE_MANAGER, "Set ROLE_MANAGER attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(manager, regAtt.ROLE_MANAGER)).should.equal(true);

            await registry.clearAttribute(guess, regAtt.ROLE_MANAGER, "Clear ROLE_MANAGER attribute", {from: manager}).should.be.rejected;
          });

          it('Should reject if operator clear ROLE_MANAGER attribute', async function() {
            await registry.setAttribute(operator, regAtt.ROLE_OPERATOR, "Set ROLE_OPERATOR attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(operator, regAtt.ROLE_OPERATOR)).should.equal(true);

            await registry.clearAttribute(manager, regAtt.ROLE_MANAGER, "Clear ROLE_MANAGER attribute", {from: operator}).should.be.rejected;
          });

          it('Should reject if guess clear ROLE_MANAGER attribute', async function() {
            await registry.clearAttribute(manager, regAtt.ROLE_MANAGER, "Clear ROLE_MANAGER attribute", {from: guess}).should.be.rejected;
          });
        });
      });

      describe("ROLE_OPERATOR", function() {
        describe("setAttribute()", function() {
          it('Should allow if owner set ROLE_OPERATOR attribute', async function() {
            (await registry.hasAttribute(operator, regAtt.ROLE_OPERATOR)).should.equal(false);

            await registry.setAttribute(operator, regAtt.ROLE_OPERATOR, "Set ROLE_OPERATOR attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(operator, regAtt.ROLE_OPERATOR)).should.equal(true);
          });

          it('Should allow if manager set ROLE_OPERATOR attribute', async function() {
            await registry.setAttribute(manager, regAtt.ROLE_MANAGER, "Set ROLE_MANAGER attribute", {from: owner}).should.be.fulfilled;
            await registry.setAttribute(operator, regAtt.ROLE_OPERATOR, "Set ROLE_OPERATOR attribute", {from: manager}).should.be.fulfilled;
            (await registry.hasAttribute(operator, regAtt.ROLE_OPERATOR)).should.equal(true);
          });

          it('Should reject if operator set ROLE_OPERATOR attribute', async function() {
            await registry.setAttribute(operator, regAtt.ROLE_OPERATOR, "Set ROLE_OPERATOR attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(operator, regAtt.ROLE_OPERATOR)).should.equal(true);

            await registry.setAttribute(guess, regAtt.ROLE_OPERATOR, "Set ROLE_MANAGER attribute", {from: operator}).should.be.rejected;
            (await registry.hasAttribute(guess, regAtt.ROLE_OPERATOR)).should.equal(false);
          });

          it('Should reject if guess set ROLE_OPERATOR attribute', async function() {
            await registry.setAttribute(operator, regAtt.ROLE_OPERATOR, "Set ROLE_OPERATOR attribute", {from: guess}).should.be.rejected;
            (await registry.hasAttribute(operator, regAtt.ROLE_OPERATOR)).should.equal(false);
          });
        });

        describe("getAttributes()", function() {
          it('Should allow if anyone get ROLE_OPERATOR attribute', async function() {
            await registry.setAttribute(manager, regAtt.ROLE_MANAGER, "Set ROLE_MANAGER attribute", {from: owner}).should.be.fulfilled;
            await registry.setAttribute(operator, regAtt.ROLE_OPERATOR, "Set ROLE_OPERATOR attribute", {from: manager}).should.be.fulfilled;

            valueAttribute = await registry.getAttributes(operator, {from: guess});
            assert.equal(valueAttribute, 2);
          });
        });

        describe("clearAttribute()", function() {
          it('Should allow if owner clear ROLE_OPERATOR attribute', async function() {
            (await registry.hasAttribute(operator, regAtt.ROLE_OPERATOR)).should.equal(false);

            await registry.setAttribute(operator, regAtt.ROLE_OPERATOR, "Set ROLE_OPERATOR attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(operator, regAtt.ROLE_OPERATOR)).should.equal(true);

            await registry.clearAttribute(operator, regAtt.ROLE_OPERATOR, "Clear ROLE_MANAGER attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(operator, regAtt.ROLE_OPERATOR)).should.equal(false);
          });

          it('Should allow if manager clear ROLE_OPERATOR attribute', async function() {
            await registry.setAttribute(manager, regAtt.ROLE_MANAGER, "Set ROLE_MANAGER attribute", {from: owner}).should.be.fulfilled;

            await registry.clearAttribute(operator, regAtt.ROLE_OPERATOR, "Clear ROLE_OPERATOR attribute", {from: manager}).should.be.fulfilled;
            (await registry.hasAttribute(operator, regAtt.ROLE_OPERATOR)).should.equal(false);
          });

          it('Should reject if operator clear ROLE_OPERATOR attribute', async function() {
            await registry.setAttribute(operator, regAtt.ROLE_OPERATOR, "Set ROLE_OPERATOR attribute", {from: owner}).should.be.fulfilled;

            await registry.clearAttribute(guess, regAtt.ROLE_OPERATOR, "Clear ROLE_MANAGER attribute", {from: operator}).should.be.rejected;
            (await registry.hasAttribute(guess, regAtt.ROLE_OPERATOR)).should.equal(false);
          });

          it('Should reject if guess clear ROLE_OPERATOR attribute', async function() {
            await registry.clearAttribute(operator, regAtt.ROLE_OPERATOR, "clear ROLE_OPERATOR attribute", {from: guess}).should.be.rejected;
            (await registry.hasAttribute(operator, regAtt.ROLE_OPERATOR)).should.equal(false);
          });
        });
      });

      describe("IS_BLACKLISTED", function() {
        describe("setAttribute()", function() {
          it('Should allow if owner set IS_BLACKLISTED attribute', async function() {
            (await registry.hasAttribute(guess, regAtt.IS_BLACKLISTED)).should.equal(false);

            await registry.setAttribute(guess, regAtt.IS_BLACKLISTED, "Set IS_BLACKLISTED ON", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.IS_BLACKLISTED)).should.equal(true);
          });

          it('Should reject if manager set IS_BLACKLISTED attribute', async function() {
            await registry.setAttribute(manager, regAtt.ROLE_MANAGER, "Set ROLE_MANAGER attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(manager, regAtt.ROLE_MANAGER)).should.equal(true);

            await registry.setAttribute(guess, regAtt.IS_BLACKLISTED, "Set IS_BLACKLISTED ON", {from: manager}).should.be.rejected;
            (await registry.hasAttribute(guess, regAtt.IS_BLACKLISTED)).should.equal(false);
          });

          it('Should allow if operator set IS_BLACKLISTED attribute', async function() {
            await registry.setAttribute(operator, regAtt.ROLE_OPERATOR, "Set ROLE_OPERATOR attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(operator, regAtt.ROLE_OPERATOR)).should.equal(true);

            await registry.setAttribute(guess, regAtt.IS_BLACKLISTED, "Set IS_BLACKLISTED ON", {from: operator}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.IS_BLACKLISTED)).should.equal(true);
          });

          it('Should reject if guess set IS_BLACKLISTED attribute', async function() {
            await registry.setAttribute(guess, regAtt.IS_BLACKLISTED, "Set IS_BLACKLISTED ON", {from: guess}).should.be.rejected;
            (await registry.hasAttribute(guess, regAtt.IS_BLACKLISTED)).should.equal(false);
          });
        });

        describe("getAttributes()", function() {
          it('Should allow if anyone get IS_BLACKLISTED attribute', async function() {
            await registry.setAttribute(guess, regAtt.IS_BLACKLISTED, "Set IS_BLACKLISTED ON", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.IS_BLACKLISTED)).should.equal(true);

            valueAttribute = await registry.getAttributes(guess, {from: operator});
            assert.equal(valueAttribute, 4);
          });
        });

        describe("clearAttribute()", function() {
          it('Should allow if owner clear IS_BLACKLISTED attribute', async function() {
            await registry.setAttribute(guess, regAtt.IS_BLACKLISTED, "Set IS_BLACKLISTED ON", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.IS_BLACKLISTED)).should.equal(true);

            await registry.clearAttribute(guess, regAtt.IS_BLACKLISTED, "Clear BLACKLISTED attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.IS_BLACKLISTED)).should.equal(false);
          });

          it('Should reject if manager clear IS_BLACKLISTED attribute', async function() {
            await registry.setAttribute(manager, regAtt.ROLE_MANAGER, "Set ROLE_MANAGER attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(manager, regAtt.ROLE_MANAGER)).should.equal(true);

            await registry.clearAttribute(guess, regAtt.IS_BLACKLISTED, "Clear BLACKLISTED attribute", {from: manager}).should.be.rejected;
          });

          it('Should allow if operator clear IS_BLACKLISTED attribute', async function() {
            await registry.setAttribute(operator, regAtt.ROLE_OPERATOR, "Set ROLE_OPERATOR attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(operator, regAtt.ROLE_OPERATOR)).should.equal(true);

            await registry.setAttribute(guess, regAtt.IS_BLACKLISTED, "Set IS_BLACKLISTED ON", {from: operator}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.IS_BLACKLISTED)).should.equal(true);

            await registry.clearAttribute(guess, regAtt.IS_BLACKLISTED, "Clear BLACKLISTED attribute", {from: operator}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.IS_BLACKLISTED)).should.equal(false);
          });

          it('Should reject if guess clear IS_BLACKLISTED attribute', async function() {
            await registry.clearAttribute(guess, regAtt.IS_BLACKLISTED, "Clear BLACKLISTED attribute", {from: guess}).should.be.rejected;
          });
        });
      });

      describe("HAS_PASSED_KYC_AML", function() {
        describe("setAttribute()", function() {
          it('Should allow if owner Set HAS_PASSED_KYC_AML ON', async function() {
            (await registry.hasAttribute(guess, regAtt.HAS_PASSED_KYC_AML)).should.equal(false);

            await registry.setAttribute(guess, regAtt.HAS_PASSED_KYC_AML, "Set HAS_PASSED_KYC_AML ON", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.HAS_PASSED_KYC_AML)).should.equal(true);
          });

          it('Should reject if manager Set HAS_PASSED_KYC_AML ON', async function() {
            await registry.setAttribute(manager, regAtt.ROLE_MANAGER, "Set ROLE_MANAGER attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(manager, regAtt.ROLE_MANAGER)).should.equal(true);

            await registry.setAttribute(guess, regAtt.HAS_PASSED_KYC_AML, "Set HAS_PASSED_KYC_AML ON", {from: manager}).should.be.rejected;
            (await registry.hasAttribute(guess, regAtt.HAS_PASSED_KYC_AML)).should.equal(false);
          });

          it('Should allow if operator Set HAS_PASSED_KYC_AML ON', async function() {
            await registry.setAttribute(operator, regAtt.ROLE_OPERATOR, "Set ROLE_OPERATOR attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(operator, regAtt.ROLE_OPERATOR)).should.equal(true);

            await registry.setAttribute(guess, regAtt.HAS_PASSED_KYC_AML, "Set HAS_PASSED_KYC_AML ON", {from: operator}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.HAS_PASSED_KYC_AML)).should.equal(true);
          });

          it('Should reject if guess Set HAS_PASSED_KYC_AML ON', async function() {
            await registry.setAttribute(guess, regAtt.HAS_PASSED_KYC_AML, "Set HAS_PASSED_KYC_AML ON", {from: guess}).should.be.rejected;
            (await registry.hasAttribute(guess, regAtt.HAS_PASSED_KYC_AML)).should.equal(false);
          });
        });

        describe("getAttributes()", function() {
          it('Should allow if anyone get HAS_PASSED_KYC_AML attribute', async function() {
            await registry.setAttribute(guess, regAtt.HAS_PASSED_KYC_AML, "Set HAS_PASSED_KYC_AML ON", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.HAS_PASSED_KYC_AML)).should.equal(true);

            valueAttribute = await registry.getAttributes(guess, {from: guess});
            assert.equal(valueAttribute, 8);
          });
        });

        describe("clearAttribute()", function() {
          it('Should allow if owner clear HAS_PASSED_KYC_AML attribute', async function() {
            await registry.setAttribute(guess, regAtt.HAS_PASSED_KYC_AML, "Set HAS_PASSED_KYC_AML ON", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.HAS_PASSED_KYC_AML)).should.equal(true);

            await registry.clearAttribute(guess, regAtt.HAS_PASSED_KYC_AML, "Clear HAS_PASSED_KYC_AML attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.HAS_PASSED_KYC_AML)).should.equal(false);
          });

          it('Should reject if manager clear HAS_PASSED_KYC_AML attribute', async function() {
            await registry.setAttribute(manager, regAtt.ROLE_MANAGER, "Set ROLE_MANAGER attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(manager, regAtt.ROLE_MANAGER)).should.equal(true);

            await registry.clearAttribute(guess, regAtt.HAS_PASSED_KYC_AML, "Clear HAS_PASSED_KYC_AML attribute", {from: manager}).should.be.rejected;
          });

          it('Should allow if operator clear HAS_PASSED_KYC_AML attribute', async function() {
            await registry.setAttribute(operator, regAtt.ROLE_OPERATOR, "Set ROLE_OPERATOR attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(operator, regAtt.ROLE_OPERATOR)).should.equal(true);

            await registry.setAttribute(guess, regAtt.HAS_PASSED_KYC_AML, "Set HAS_PASSED_KYC_AML ON", {from: operator}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.HAS_PASSED_KYC_AML)).should.equal(true);

            await registry.clearAttribute(guess, regAtt.HAS_PASSED_KYC_AML, "Clear HAS_PASSED_KYC_AML attribute", {from: operator}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.HAS_PASSED_KYC_AML)).should.equal(false);
          });

          it('Should reject if guess clear HAS_PASSED_KYC_AML attribute', async function() {
            await registry.clearAttribute(guess, regAtt.HAS_PASSED_KYC_AML, "Clear HAS_PASSED_KYC_AML attribute", {from: guess}).should.be.rejected;
          });
        });
      });

      describe("NO_FEES", function() {
        describe("setAttribute()", function() {
          it('Should allow if owner set NO_FEES attribute', async function() {
            (await registry.hasAttribute(guess, regAtt.NO_FEE)).should.equal(false);

            await registry.setAttribute(guess, regAtt.NO_FEE, "Set NO_FEES attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.NO_FEE)).should.equal(true);
          });

          it('Should reject if manager set NO_FEES attribute', async function() {
            await registry.setAttribute(manager, regAtt.ROLE_MANAGER, "Set ROLE_MANAGER attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(manager, regAtt.ROLE_MANAGER)).should.equal(true);

            await registry.setAttribute(guess, regAtt.NO_FEE, "Set NO_FEE attribute", {from: manager}).should.be.rejected;
            (await registry.hasAttribute(guess, regAtt.NO_FEE)).should.equal(false);
          });

          it('Should allow if operator set NO_FEES attribute', async function() {
            await registry.setAttribute(operator, regAtt.ROLE_OPERATOR, "Set ROLE_OPERATOR attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(operator, regAtt.ROLE_OPERATOR)).should.equal(true);

            await registry.setAttribute(guess, regAtt.NO_FEE, "Set NO_FEE attribute", {from: operator}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.NO_FEE)).should.equal(true);
          });

          it('Should reject if guess set NO_FEES attribute', async function() {
            await registry.setAttribute(guess, regAtt.NO_FEE, "Set NO_FEE attribute", {from: guess}).should.be.rejected;
            (await registry.hasAttribute(guess, regAtt.NO_FEE)).should.equal(false);
          });
        });

        describe("getAttributes()", function() {
          it('Should allow if anyone get NO_FEES attribute', async function() {
            await registry.setAttribute(guess, regAtt.NO_FEE, "Set NO_FEES attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.NO_FEE)).should.equal(true);

            valueAttribute = await registry.getAttributes(guess, {from: guess});
            assert.equal(valueAttribute, 16);
          });
        });

        describe("clearAttribute()", function() {
          it('Should allow if owner clear NO_FEES attribute', async function() {
            await registry.setAttribute(guess, regAtt.NO_FEE, "Set NO_FEES attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.NO_FEE)).should.equal(true);

            await registry.clearAttribute(guess, regAtt.NO_FEE, "Clear NO_FEES attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.NO_FEE)).should.equal(false);
          });

          it('Should reject if manager clear NO_FEES attribute', async function() {
            await registry.setAttribute(manager, regAtt.ROLE_MANAGER, "Set ROLE_MANAGER attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(manager, regAtt.ROLE_MANAGER)).should.equal(true);

            await registry.clearAttribute(guess, regAtt.NO_FEE, "Clear NO_FEE attribute", {from: manager}).should.be.rejected;
          });

          it('Should allow if operator clear NO_FEES attribute', async function() {
            await registry.setAttribute(operator, regAtt.ROLE_OPERATOR, "Set ROLE_OPERATOR attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(operator, regAtt.ROLE_OPERATOR)).should.equal(true);

            await registry.setAttribute(guess, regAtt.NO_FEE, "Set NO_FEE attribute", {from: operator}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.NO_FEE)).should.equal(true);

            await registry.clearAttribute(guess, regAtt.NO_FEE, "Clear NO_FEES attribute", {from: operator}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.NO_FEE)).should.equal(false);
          });

          it('Should reject if guess clear NO_FEES attribute', async function() {
            await registry.clearAttribute(guess, regAtt.NO_FEE, "Clear NO_FEE attribute", {from: guess}).should.be.rejected;
          });
        });
      });

      describe("USER_DEFINED", function() {
        describe("setAttribute()", function() {
          it('Should allow if owner set USER_DEFINED attribute', async function() {
            (await registry.hasAttribute(guess, regAtt.USER_DEFINED)).should.equal(false);

            await registry.setAttribute(guess, regAtt.USER_DEFINED, "Set USER_DEFINED attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.USER_DEFINED)).should.equal(true);
          });

          it('Should reject if manager set USER_DEFINED attribute', async function() {
            await registry.setAttribute(manager, regAtt.ROLE_MANAGER, "Set ROLE_MANAGER attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(manager, regAtt.ROLE_MANAGER)).should.equal(true);

            await registry.setAttribute(guess, regAtt.USER_DEFINED, "Set NO_FEE attribute", {from: manager}).should.be.rejected;
            (await registry.hasAttribute(guess, regAtt.USER_DEFINED)).should.equal(false);
          });

          it('Should allow if operator set USER_DEFINED attribute', async function() {
            await registry.setAttribute(operator, regAtt.ROLE_OPERATOR, "Set ROLE_OPERATOR attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(operator, regAtt.ROLE_OPERATOR)).should.equal(true);

            await registry.setAttribute(guess, regAtt.USER_DEFINED, "Set USER_DEFINED attribute", {from: operator}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.USER_DEFINED)).should.equal(true);
          });

          it('Should reject if guess set USER_DEFINED attribute', async function() {
            await registry.setAttribute(guess, regAtt.USER_DEFINED, "Set USER_DEFINED attribute", {from: guess}).should.be.rejected;
            (await registry.hasAttribute(guess, regAtt.USER_DEFINED)).should.equal(false);
          });
        });

        describe("getAttributes()", function() {
          it('Should allow if anyone get USER_DEFINED attribute', async function() {
            await registry.setAttribute(guess, regAtt.USER_DEFINED, "Set USER_DEFINED attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.USER_DEFINED)).should.equal(true);

            valueAttribute = await registry.getAttributes(guess, {from: guess});
            assert.equal(valueAttribute, 32);
          });
        });

        describe("clearAttribute()", function() {
          it('Should allow if owner clear USER_DEFINED attribute', async function() {
            await registry.setAttribute(guess, regAtt.USER_DEFINED, "Set USER_DEFINED attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.USER_DEFINED)).should.equal(true);

            await registry.clearAttribute(guess, regAtt.USER_DEFINED, "Clear USER_DEFINED attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.USER_DEFINED)).should.equal(false);
          });

          it('Should reject if manager clear USER_DEFINED attribute', async function() {
            await registry.setAttribute(manager, regAtt.ROLE_MANAGER, "Set ROLE_MANAGER attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(manager, regAtt.ROLE_MANAGER)).should.equal(true);

            await registry.clearAttribute(guess, regAtt.USER_DEFINED, "Clear USER_DEFINED attribute", {from: manager}).should.be.rejected;
          });

          it('Should allow if operator clear USER_DEFINED attribute', async function() {
            await registry.setAttribute(operator, regAtt.ROLE_OPERATOR, "Set ROLE_OPERATOR attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(operator, regAtt.ROLE_OPERATOR)).should.equal(true);

            await registry.setAttribute(guess, regAtt.USER_DEFINED, "Set USER_DEFINED attribute", {from: operator}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.USER_DEFINED)).should.equal(true);

            await registry.clearAttribute(guess, regAtt.USER_DEFINED, "Clear USER_DEFINED attribute", {from: operator}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.USER_DEFINED)).should.equal(false);
          });

          it('Should reject if guess clear USER_DEFINED attribute', async function() {
            await registry.clearAttribute(guess, regAtt.USER_DEFINED, "Clear USER_DEFINED attribute", {from: guess}).should.be.rejected;
          });
        });
      });

      describe("Combine set/clear attributes", function() {
        describe('Combine set attributes', function() {
          beforeEach("Enable operator and clear all attributes firstly", async function() {
            await registry.setAttribute(manager, regAtt.ROLE_MANAGER, "Set ROLE_MANAGER attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(manager, regAtt.ROLE_MANAGER)).should.equal(true);

            await registry.setAttribute(operator, regAtt.ROLE_OPERATOR, "Set ROLE_OPERATOR attribute", {from: manager}).should.be.fulfilled;
            (await registry.hasAttribute(operator, regAtt.ROLE_OPERATOR)).should.equal(true);

            await registry.clearAttribute(guess, regAtt.IS_BLACKLISTED, "Clear BLACKLISTED attribute", {from: operator}).should.be.fulfilled;
            await registry.clearAttribute(guess, regAtt.HAS_PASSED_KYC_AML, "Clear PASSED_KYC_AML attribute", {from: operator}).should.be.fulfilled;
            await registry.clearAttribute(guess, regAtt.NO_FEE, "Clear NO_FEE attribute", {from: operator}).should.be.fulfilled;
            await registry.clearAttribute(guess, regAtt.USER_DEFINED, "Clear USER_DEFINED attribute", {from: operator}).should.be.fulfilled;

            (await registry.hasAttribute(guess, regAtt.IS_BLACKLISTED)).should.equal(false);
            (await registry.hasAttribute(guess, regAtt.HAS_PASSED_KYC_AML)).should.equal(false);
            (await registry.hasAttribute(guess, regAtt.NO_FEE)).should.equal(false);
            (await registry.hasAttribute(guess, regAtt.USER_DEFINED)).should.equal(false);
          });

          it("Set IS_BLACKLISTED, HAS_PASSED_KYC_AML, NO_FEES, USER_DEFINED sequentially", async function() {
            await registry.setAttribute(guess, regAtt.IS_BLACKLISTED, "Set IS_BLACKLISTED ON", {from: operator}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.IS_BLACKLISTED)).should.equal(true);
            (await registry.hasAttribute(guess, regAtt.HAS_PASSED_KYC_AML)).should.equal(false);
            (await registry.hasAttribute(guess, regAtt.NO_FEE)).should.equal(false);
            (await registry.hasAttribute(guess, regAtt.USER_DEFINED)).should.equal(false);

            await registry.setAttribute(guess, regAtt.HAS_PASSED_KYC_AML, "Set PASSED_KYC_AML attribute", {from: operator}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.IS_BLACKLISTED)).should.equal(true);
            (await registry.hasAttribute(guess, regAtt.HAS_PASSED_KYC_AML)).should.equal(true);
            (await registry.hasAttribute(guess, regAtt.NO_FEE)).should.equal(false);
            (await registry.hasAttribute(guess, regAtt.USER_DEFINED)).should.equal(false);

            await registry.setAttribute(guess, regAtt.NO_FEE, "Set NO_FEES attribute", {from: operator}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.IS_BLACKLISTED)).should.equal(true);
            (await registry.hasAttribute(guess, regAtt.HAS_PASSED_KYC_AML)).should.equal(true);
            (await registry.hasAttribute(guess, regAtt.NO_FEE)).should.equal(true);
            (await registry.hasAttribute(guess, regAtt.USER_DEFINED)).should.equal(false);

            await registry.setAttribute(guess, regAtt.USER_DEFINED, "Set USER_DEFINED attribute", {from: operator}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.IS_BLACKLISTED)).should.equal(true);
            (await registry.hasAttribute(guess, regAtt.HAS_PASSED_KYC_AML)).should.equal(true);
            (await registry.hasAttribute(guess, regAtt.NO_FEE)).should.equal(true);
            (await registry.hasAttribute(guess, regAtt.USER_DEFINED)).should.equal(true);
          });
        });

        describe('Combine clear attributes', function() {
          beforeEach("Enable operator and set all attributes firstly", async function() {
            await registry.setAttribute(manager, regAtt.ROLE_MANAGER, "Set ROLE_MANAGER attribute", {from: owner}).should.be.fulfilled;
            (await registry.hasAttribute(manager, regAtt.ROLE_MANAGER)).should.equal(true);

            await registry.setAttribute(operator, regAtt.ROLE_OPERATOR, "Set ROLE_OPERATOR attribute", {from: manager}).should.be.fulfilled;
            (await registry.hasAttribute(operator, regAtt.ROLE_OPERATOR)).should.equal(true);

            await registry.setAttribute(guess, regAtt.IS_BLACKLISTED, "Set IS_BLACKLISTED ON", {from: operator}).should.be.fulfilled;
            await registry.setAttribute(guess, regAtt.HAS_PASSED_KYC_AML, "Set PASSED_KYC_AML attribute", {from: operator}).should.be.fulfilled;
            await registry.setAttribute(guess, regAtt.NO_FEE, "Set NO_FEES attribute", {from: operator}).should.be.fulfilled;
            await registry.setAttribute(guess, regAtt.USER_DEFINED, "Set USER_DEFINED attribute", {from: operator}).should.be.fulfilled;

            (await registry.hasAttribute(guess, regAtt.IS_BLACKLISTED)).should.equal(true);
            (await registry.hasAttribute(guess, regAtt.HAS_PASSED_KYC_AML)).should.equal(true);
            (await registry.hasAttribute(guess, regAtt.NO_FEE)).should.equal(true);
            (await registry.hasAttribute(guess, regAtt.USER_DEFINED)).should.equal(true);
          });

          it("Clear IS_BLACKLISTED, HAS_PASSED_KYC_AML, NO_FEES, USER_DEFINED sequentially", async function() {
            await registry.clearAttribute(guess, regAtt.IS_BLACKLISTED, "Clear BLACKLISTED attribute", {from: operator}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.IS_BLACKLISTED)).should.equal(false);
            (await registry.hasAttribute(guess, regAtt.HAS_PASSED_KYC_AML)).should.equal(true);
            (await registry.hasAttribute(guess, regAtt.NO_FEE)).should.equal(true);
            (await registry.hasAttribute(guess, regAtt.USER_DEFINED)).should.equal(true);

            await registry.clearAttribute(guess, regAtt.HAS_PASSED_KYC_AML, "Clear PASSED_KYC_AML attribute", {from: operator}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.IS_BLACKLISTED)).should.equal(false);
            (await registry.hasAttribute(guess, regAtt.HAS_PASSED_KYC_AML)).should.equal(false);
            (await registry.hasAttribute(guess, regAtt.NO_FEE)).should.equal(true);
            (await registry.hasAttribute(guess, regAtt.USER_DEFINED)).should.equal(true);

            await registry.clearAttribute(guess, regAtt.NO_FEE, "Clear NO_FEES attribute", {from: operator}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.IS_BLACKLISTED)).should.equal(false);
            (await registry.hasAttribute(guess, regAtt.HAS_PASSED_KYC_AML)).should.equal(false);
            (await registry.hasAttribute(guess, regAtt.NO_FEE)).should.equal(false);
            (await registry.hasAttribute(guess, regAtt.USER_DEFINED)).should.equal(true);

            await registry.clearAttribute(guess, regAtt.USER_DEFINED, "Clear USER_DEFINED attribute", {from: operator}).should.be.fulfilled;
            (await registry.hasAttribute(guess, regAtt.IS_BLACKLISTED)).should.equal(false);
            (await registry.hasAttribute(guess, regAtt.HAS_PASSED_KYC_AML)).should.equal(false);
            (await registry.hasAttribute(guess, regAtt.NO_FEE)).should.equal(false);
            (await registry.hasAttribute(guess, regAtt.USER_DEFINED)).should.equal(false);
          });
        });
      });

      describe("Catch event log", function() {
        describe("SetAttribute", function() {
          describe("Set attribute", function() {
            it("ROLE_MANAGER", async function() {
              const {logs} = await registry.setAttribute(guess, regAtt.ROLE_MANAGER, "Set ROLE_MANAGER attribute", {from: owner}).should.be.fulfilled;
              const getLogs = logs.find(e => e.event === 'SetAttribute');
              getLogs.should.exist;
              (getLogs.args.who).should.equal(guess);
              (getLogs.args.attribute).should.be.bignumber.equal(regAtt.ROLE_MANAGER);
              (getLogs.args.enable).should.equal(true);
              (getLogs.args.notes).should.equal("Set ROLE_MANAGER attribute");
              (getLogs.args.adminAddr).should.equal(owner);
            });

            it("ROLE_OPERATOR", async function() {
              const {logs} = await registry.setAttribute(guess, regAtt.ROLE_OPERATOR, "Set ROLE_OPERATOR attribute", {from: owner}).should.be.fulfilled;
              const getLogs = logs.find(e => e.event === 'SetAttribute');
              getLogs.should.exist;
              (getLogs.args.who).should.equal(guess);
              (getLogs.args.attribute).should.be.bignumber.equal(regAtt.ROLE_OPERATOR);
              (getLogs.args.enable).should.equal(true);
              (getLogs.args.notes).should.equal("Set ROLE_OPERATOR attribute");
              (getLogs.args.adminAddr).should.equal(owner);
            });

            it("IS_BLACKLISTED", async function() {
              const {logs} = await registry.setAttribute(guess, regAtt.IS_BLACKLISTED, "Set IS_BLACKLISTED attribute", {from: owner}).should.be.fulfilled;
              const getLogs = logs.find(e => e.event === 'SetAttribute');
              getLogs.should.exist;
              (getLogs.args.who).should.equal(guess);
              (getLogs.args.attribute).should.be.bignumber.equal(regAtt.IS_BLACKLISTED);
              (getLogs.args.enable).should.equal(true);
              (getLogs.args.notes).should.equal("Set IS_BLACKLISTED attribute");
              (getLogs.args.adminAddr).should.equal(owner);
            });

            it("HAS_PASSED_KYC_AML", async function() {
              const {logs} = await registry.setAttribute(guess, regAtt.HAS_PASSED_KYC_AML, "Set HAS_PASSED_KYC_AML ON", {from: owner}).should.be.fulfilled;
              const getLogs = logs.find(e => e.event === 'SetAttribute');
              getLogs.should.exist;
              (getLogs.args.who).should.equal(guess);
              (getLogs.args.attribute).should.be.bignumber.equal(regAtt.HAS_PASSED_KYC_AML);
              (getLogs.args.enable).should.equal(true);
              (getLogs.args.notes).should.equal("Set HAS_PASSED_KYC_AML ON");
              (getLogs.args.adminAddr).should.equal(owner);
            });

            it("NO_FEES", async function() {
              const {logs} = await registry.setAttribute(guess, regAtt.NO_FEE, "Set NO_FEES attribute", {from: owner}).should.be.fulfilled;
              const getLogs = logs.find(e => e.event === 'SetAttribute');
              getLogs.should.exist;
              (getLogs.args.who).should.equal(guess);
              (getLogs.args.attribute).should.be.bignumber.equal(regAtt.NO_FEE);
              (getLogs.args.enable).should.equal(true);
              (getLogs.args.notes).should.equal("Set NO_FEES attribute");
              (getLogs.args.adminAddr).should.equal(owner);
            });

            it("USER_DEFINED", async function() {
              const {logs} = await registry.setAttribute(guess, regAtt.USER_DEFINED, "Set USER_DEFINED attribute", {from: owner}).should.be.fulfilled;
              const getLogs = logs.find(e => e.event === 'SetAttribute');
              getLogs.should.exist;
              (getLogs.args.who).should.equal(guess);
              (getLogs.args.attribute).should.be.bignumber.equal(regAtt.USER_DEFINED);
              (getLogs.args.enable).should.equal(true);
              (getLogs.args.notes).should.equal("Set USER_DEFINED attribute");
              (getLogs.args.adminAddr).should.equal(owner);
            });
          });

          describe("Clear attribute", function() {
            it("ROLE_MANAGER", async function() {
              const {logs} = await registry.clearAttribute(guess, regAtt.ROLE_MANAGER, "Clear ROLE_MANAGER attribute", {from: owner}).should.be.fulfilled;
              const getLogs = logs.find(e => e.event === 'SetAttribute');
              getLogs.should.exist;
              (getLogs.args.who).should.equal(guess);
              (getLogs.args.attribute).should.be.bignumber.equal(regAtt.ROLE_MANAGER);
              (getLogs.args.enable).should.equal(false);
              (getLogs.args.notes).should.equal("Clear ROLE_MANAGER attribute");
              (getLogs.args.adminAddr).should.equal(owner);
            });

            it("ROLE_OPERATOR", async function() {
              const {logs} = await registry.clearAttribute(guess, regAtt.ROLE_OPERATOR, "Clear ROLE_OPERATOR attribute", {from: owner}).should.be.fulfilled;
              const getLogs = logs.find(e => e.event === 'SetAttribute');
              getLogs.should.exist;
              (getLogs.args.who).should.equal(guess);
              (getLogs.args.attribute).should.be.bignumber.equal(regAtt.ROLE_OPERATOR);
              (getLogs.args.enable).should.equal(false);
              (getLogs.args.notes).should.equal("Clear ROLE_OPERATOR attribute");
              (getLogs.args.adminAddr).should.equal(owner);
            });

            it("IS_BLACKLISTED", async function() {
              const {logs} = await registry.clearAttribute(guess, regAtt.IS_BLACKLISTED, "Clear IS_BLACKLISTED attribute", {from: owner}).should.be.fulfilled;
              const getLogs = logs.find(e => e.event === 'SetAttribute');
              getLogs.should.exist;
              (getLogs.args.who).should.equal(guess);
              (getLogs.args.attribute).should.be.bignumber.equal(regAtt.IS_BLACKLISTED);
              (getLogs.args.enable).should.equal(false);
              (getLogs.args.notes).should.equal("Clear IS_BLACKLISTED attribute");
              (getLogs.args.adminAddr).should.equal(owner);
            });

            it("HAS_PASSED_KYC_AML", async function() {
              const {logs} = await registry.clearAttribute(guess, regAtt.HAS_PASSED_KYC_AML, "Clear HAS_PASSED_KYC_AML attribute", {from: owner}).should.be.fulfilled;
              const getLogs = logs.find(e => e.event === 'SetAttribute');
              getLogs.should.exist;
              (getLogs.args.who).should.equal(guess);
              (getLogs.args.attribute).should.be.bignumber.equal(regAtt.HAS_PASSED_KYC_AML);
              (getLogs.args.enable).should.equal(false);
              (getLogs.args.notes).should.equal("Clear HAS_PASSED_KYC_AML attribute");
              (getLogs.args.adminAddr).should.equal(owner);
            });

            it("NO_FEES", async function() {
              const {logs} = await registry.clearAttribute(guess, regAtt.NO_FEE, "Clear NO_FEES attribute", {from: owner}).should.be.fulfilled;
              const getLogs = logs.find(e => e.event === 'SetAttribute');
              getLogs.should.exist;
              (getLogs.args.who).should.equal(guess);
              (getLogs.args.attribute).should.be.bignumber.equal(regAtt.NO_FEE);
              (getLogs.args.enable).should.equal(false);
              (getLogs.args.notes).should.equal("Clear NO_FEES attribute");
              (getLogs.args.adminAddr).should.equal(owner);
            });

            it("USER_DEFINED", async function() {
              const {logs} = await registry.clearAttribute(guess, regAtt.USER_DEFINED, "Clear USER_DEFINED attribute", {from: owner}).should.be.fulfilled;
              const getLogs = logs.find(e => e.event === 'SetAttribute');
              getLogs.should.exist;
              (getLogs.args.who).should.equal(guess);
              (getLogs.args.attribute).should.be.bignumber.equal(regAtt.USER_DEFINED);
              (getLogs.args.enable).should.equal(false);
              (getLogs.args.notes).should.equal("Clear USER_DEFINED attribute");
              (getLogs.args.adminAddr).should.equal(owner);
            });
          });
        })
      })
    });
  });
});
