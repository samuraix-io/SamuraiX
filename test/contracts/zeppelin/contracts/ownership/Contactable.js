const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

function check(accounts, deployTokenCb) {
  var token;
  var owner = accounts[0];
  var non_owner = accounts[1];

  beforeEach(async function () {
    token = await deployTokenCb();
  });

  describe('setContactInformation()', function() {

  	it("Should allow owner change information of contact", async function () {
      let _info = "new_information";
      let _oldInfo = await token.contactInformation();
      assert.notEqual(_oldInfo, _info);
      await token.setContactInformation(_info, {from :owner}).should.be.fulfilled;
      let _currentInfo = await token.contactInformation();
      assert.equal(_currentInfo, _info);
    });

    it("Should reject non-owner change information of contact", async function () {
      let _info = "new_information";
      await token.setContactInformation(_info, {from :non_owner}).should.be.rejected;
    });
  });
}

module.exports.check = check;
