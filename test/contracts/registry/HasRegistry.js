const BigNumber = web3.BigNumber;

const should = require('chai')
.use(require('chai-as-promised'))
.use(require('chai-bignumber')(BigNumber))
.should();

const Registry = artifacts.require("./Registry.sol");
const HasRegistry = artifacts.require("./HasRegistry.sol");

contract('HasRegistry', function(accounts) {
  var registryInstance, hasRegistryInstance;

  const registryAccount     = accounts[0];
  const hasRegistryAccount  = accounts[1];
  const guess               = accounts[2];

  beforeEach(async function () {
    registryInstance = await Registry.new({from: registryAccount});
    hasRegistryInstance = await HasRegistry.new({from: hasRegistryAccount});
  });

  describe("HasRegistry", function() {
    describe("setRegistry()", function() {
      it("Should allow setRegistry if caller is owner", async function() {
        await hasRegistryInstance.setRegistry(registryInstance.address, {from: hasRegistryAccount}).should.be.fulfilled;
        let registry_address = await hasRegistryInstance.registry().should.be.fulfilled;
        assert.equal(registryInstance.address, registry_address);
      });

      it("Should reject setRegistry if caller is not owner", async function() {
        await hasRegistryInstance.setRegistry(registryInstance.address, {from: registryAccount}).should.be.rejected;
        await hasRegistryInstance.setRegistry(registryInstance.address, {from: guess}).should.be.rejected;
      });

      it("Catch event log", async function() {
        const {logs} = await hasRegistryInstance.setRegistry(registryInstance.address, {from: hasRegistryAccount}).should.be.fulfilled;
        const setRegistryLog = logs.find(e => e.event === 'SetRegistry');
        setRegistryLog.should.exist;
        (setRegistryLog.args.registry).should.equal(registryInstance.address);
      });
    });
  });
});
