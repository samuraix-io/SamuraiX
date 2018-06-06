const bn = require('./helpers/bignumber.js');

const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

function check(accounts, deployContractCb, deployTokenCb) {
  var contractInstance;
  var token;
  var owner = accounts[0];
  var investor = accounts[3];
  var purchaser = accounts[4];
  var amount = bn.tokens(10**5);

  beforeEach(async function () {
    contractInstance = await deployContractCb();
    token = await deployTokenCb();

    await token.mint(investor, amount).should.be.fulfilled;
    // accident transfer
    await token.transfer(contractInstance.address, amount, {from: investor}).should.be.fulfilled;
  });

  it('should allow owner to reclaim tokens', async function() {
    await contractInstance.reclaimToken(token.address, {from: owner}).should.be.fulfilled;
  });

  it('should increase balance of owner', async function() {
    var balanceBefore = await token.balanceOf(owner);
    await contractInstance.reclaimToken(token.address, {from: owner}).should.be.fulfilled;
    var balanceAfter = await token.balanceOf(owner);
    balanceAfter.should.be.bignumber.equal(balanceBefore.plus(amount));
  });

  it('should log Transfer event', async function() {
    const {logs} = await contractInstance.reclaimToken(token.address, {from: owner}).should.be.fulfilled;
    const xferEvent = logs.find(e => e.event === 'Transfer');
    if (xferEvent !== undefined) {
      xferEvent.should.exist;
      (xferEvent.args.from).should.equal(contractInstance.address);
      (xferEvent.args.to).should.equal(owner);
      (xferEvent.args.value).should.be.bignumber.equal(amount);
    } else {
      var option = {
        fromBlock: 0,
        toBlock: 'latest',
        address: token.address,
        topics: []
      };

      var hashTransfer = web3.sha3('Transfer(address,address,uint256)');
      option.topics = [hashTransfer];
      await web3.eth.filter(option).get(function (err, result) {
        var event = result[0];
        var topics = event['topics'];
        topics[0].should.be.equal(hashTransfer);
      });

    }
  });

  it('should reject non-owner to reclaim tokens', async function() {
    await contractInstance.reclaimToken(token.address, {from: purchaser}).should.be.rejected;
  });
}

module.exports.check = check;
