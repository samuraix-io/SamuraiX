const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const Claimable = require("./ownership/Claimable.js")
const StandartToken = require("./base-token/StandardToken.js");
const BurnableExToken	 = require("./BurnableExToken.js")

const PATToken = artifacts.require("./PATToken.sol");

contract('PATToken', function (accounts) {
	let token;
  var systemWallet = accounts[7]

  let tokenName = "PATToken";
  let tokenSymbol = "PAT";
  let varLinkDoc = 'https://drive.google.com/open?id=1ZaFg2XtGdTwnkvaj-Kra4cRW_ia6tvBY';
  let fixedLinkDoc = 'https://drive.google.com/open?id=1JYpdAqubjvHvUuurwX7om0dDcA5ycRhc';

	before(async function () {
    token = await PATToken.deployed();
  });

	describe('changeTokenName()', function() {
    it('Should allow owner to set new name and symbol', async function() {
      let _oldTokenName = await token.name();
      let _oldTokenSymbol = await token.symbol();
      let _newTokenName = "ANToken";
      let _newTokenSymbol = "ANT";
      assert.notEqual(_oldTokenName, _newTokenName);
      assert.notEqual(_oldTokenSymbol, _newTokenSymbol);

      await token.changeTokenName(_newTokenName, _newTokenSymbol);
			let _currName = await token.name();
      let _currSymbol = await token.symbol();

			assert.equal(_currName, _newTokenName);
			assert.equal(_currSymbol, _newTokenSymbol);
    });

    it('Should reject non- owner to set new name and symbol', async function() {
      let _newTokenName = "ANToken";
      let _newTokenSymbol = "ANT";
      await token.changeTokenName(_newTokenName, _newTokenSymbol);
    });
  });

  describe('Claimable', function() {
    Claimable.check(accounts, deployContract);
	});

  describe('StandartToken', function() {
    StandartToken.check(accounts, deployContract);
  });

	describe('BurnableExToken', function() {
    BurnableExToken.check(accounts, deployContract);
	});

	async function deploy() {
    var _token = await PATToken.new(tokenName, tokenSymbol, fixedLinkDoc, varLinkDoc, systemWallet);
    return _token;
  }

  async function deployContract() {
    return deploy();
  }
})
