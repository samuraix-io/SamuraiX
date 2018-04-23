import ether from './helpers/ether.js';
import finney from './helpers/finney.js';

const BigNumber = web3.BigNumber;
const should = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

const PATToken = artifacts.require("./PATToken.sol");
const RAXToken = artifacts.require("./RAXToken.sol");

contract('DistributePayment', function(accounts) {
  describe('send profit to whole holder by Ether', function() {
  });
});
