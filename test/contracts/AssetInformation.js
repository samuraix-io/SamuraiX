const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const bn = require('./helpers/bignumber.js');

function check(RegisteredUsers, owner, managers, investor, deployTokenCb) {
  var registeredUsers;
  var token;

  beforeEach(async function () {
    registeredUsers = await RegisteredUsers.new();
    await registeredUsers.addRegisteredUser(investor, false);
    await registeredUsers.addRegisteredUser(managers[0], false);
    await registeredUsers.addRegisteredUser(managers[1], false);

    token = await deployTokenCb(registeredUsers);
  });

  it('check manager address', async() => {
    (await token.getManager(0)).should.be.equal(managers[0]);
    (await token.getManager(1)).should.be.equal(managers[1]);
  });

  it('managers can update running documents', async() => {
    await token.changeRunningDocuments("link1", "hash2", {from: managers[0]}).should.not.be.rejected;
    await token.changeRunningDocuments("link2", "hash2", {from: managers[1]}).should.not.be.rejected;
  });

  it('non-manager can not update running documents', async() => {
    await token.changeRunningDocuments("link", "hash", {from: investor}).should.be.rejected;
  });

  it('updating running documents should emit event', async() => {
    var link = "link";
    var hash = "hash";

    const {logs} = await token.changeRunningDocuments(link, hash, {from: managers[0]});

    const event = logs.find(e => e.event === 'UpdateRunningDocuments');
    event.should.exist;
    (event.args._linkDoc).should.equal(link);
    (event.args._hashDoc).should.equal(hash);
  });

  it('updating running documents should update state', async() => {
    var link = "test_link_1234";
    var hash = "test_hash_1234";
    await token.changeRunningDocuments(link, hash, {from: managers[1]});

    var returnVals = await token.getRunningDocuments();
    var currentLink = returnVals[0];
    var currentHash = returnVals[1];
    currentLink.should.be.equal(link);
    currentHash.should.be.equal(hash);
  });

  it('fix documents should not change when updating running documents', async() => {
    var fixValsBefore = await token.getFixedDocuments();
    var fixLinkBefore = fixValsBefore[0];
    var fixHashBefore = fixValsBefore[1];

    var link = "link";
    var hash = "hash";
    await token.changeRunningDocuments(link, hash, {from: managers[0]}).should.be.fulfilled;

    var fixValsAfter = await token.getFixedDocuments();
    var fixLinkAfter = fixValsAfter[0];
    var fixHashAfter = fixValsAfter[1];

    fixLinkAfter.should.be.equal(fixLinkBefore);
    fixHashAfter.should.be.equal(fixHashBefore);
  });
}

module.exports.check = check;