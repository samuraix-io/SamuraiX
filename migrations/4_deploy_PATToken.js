const PATToken = artifacts.require("./PATToken.sol");
const SaveMath = artifacts.require("./zeppelin/contracts/math/SafeMath.sol");

module.exports = function(deployer, network, accounts) {
  let overwrite = true;
  var systemWallet = accounts[7]
  let tokenName = "PATToken";
  let tokenSymbol = "PAT";
  let varLinkDoc = 'https://drive.google.com/open?id=1ZaFg2XtGdTwnkvaj-Kra4cRW_ia6tvBY';
  let fixedLinkDoc = 'https://drive.google.com/open?id=1JYpdAqubjvHvUuurwX7om0dDcA5ycRhc';

  switch (network) {
    case 'development':
      overwrite = true;
      break;
    default:
        throw new Error ("Unsupported network");
  }

  deployer.then (async () => {
      await deployer.link(SaveMath, PATToken);
      return deployer.deploy(PATToken, tokenName, tokenSymbol, fixedLinkDoc ,varLinkDoc, systemWallet, {overwrite: overwrite});
  }).then(() => {
      return PATToken.deployed();
  }).catch((err) => {
      console.error(err);
      process.exit(1);
  });
};
