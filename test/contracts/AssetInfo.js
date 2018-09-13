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

  describe('changeRunningDocuments()', function() {
    it("should allow manager to change running document", async function (){
      let _newRunningDoc = "new_link";
      let _oldRunningDoc = await token.varDocsLink();
      assert.notEqual(_oldRunningDoc, _newRunningDoc);

      await token.changeRunningDocuments(_newRunningDoc, {from : manager}).should.be.fulfilled;
      let _currRunningDoc = await token.varDocsLink();
      assert.equal(_currRunningDoc, _newRunningDoc);
    });

    it("should reject non-manager to change running document", async function (){
      let _newRunningDoc = "new_link";
      await token.changeRunningDocuments(_newRunningDoc, {from : otherUser}).should.be.rejected;
    });

    it("changeRunningDocuments() logs events", async function () {
      let _newRunningDoc = "new_link";
      let _oldRunningDoc = await token.varDocsLink();
      assert.notEqual(_oldRunningDoc, _newRunningDoc);

      const {logs} = await token.changeRunningDocuments(_newRunningDoc, {from : manager}).should.be.fulfilled;
      const changeRunningDocEvent = logs.find(e => e.event === 'UpdateRunningDocuments');
      changeRunningDocEvent.should.exist;
      assert.equal(changeRunningDocEvent.args.token, token.address);
      assert.equal(changeRunningDocEvent.args.oldLink, _oldRunningDoc)
      assert.equal(changeRunningDocEvent.args.newLink, _newRunningDoc)
    });
  });
}
module.exports.check = check;
