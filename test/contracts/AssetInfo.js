const BigNumber = web3.BigNumber;
const Registry = artifacts.require('Registry')
const regAtt = require('./helpers/registryAttributeConst.js');

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

function check(accounts, deployTokenCb) {
  var token;
  var owner = accounts[0];
  var manager = accounts[1];
  var otherUser = accounts[2];
  var registry;

  beforeEach(async function () {
    token = await deployTokenCb();
    registry = await Registry.new({from:owner });
    await registry.setAttribute(manager, regAtt.ROLE_MANAGER, "Set ROLE_MANAGER ON").should.be.fulfilled;
    await token.setRegistry(registry.address, {from : owner}).should.be.fulfilled;
  })

  describe('setPublicDocument()', function() {
    it("should allow manager to change running document", async function (){
      let _newRunningDoc = "http://bit.ly/2R5TE0T";
      let _oldRunningDoc = await token.publicDocument();
      assert.notEqual(_oldRunningDoc, _newRunningDoc);

      await token.setPublicDocument(_newRunningDoc, {from : manager}).should.be.fulfilled;
      let _currRunningDoc = await token.publicDocument();
      assert.equal(_currRunningDoc, _newRunningDoc);
    });

    it("should reject non-manager to change running document", async function (){
      let _newRunningDoc = "http://bit.ly/2R5TE0T";
      await token.setPublicDocument(_newRunningDoc, {from : otherUser}).should.be.rejected;
    });

    it("should log event", async function () {
      let _newRunningDoc = "http://bit.ly/2R5TE0T";
      let _oldRunningDoc = await token.publicDocument();
      assert.notEqual(_oldRunningDoc, _newRunningDoc);

      const {logs} = await token.setPublicDocument(_newRunningDoc, {from : manager}).should.be.fulfilled;
      const event = logs.find(e => e.event === 'UpdateDocument');
      event.should.exist;
      assert.equal(event.args.newLink, _newRunningDoc)
    });
  });
}
module.exports.check = check;
