const ManageListingFee = artifacts.require("./ManageListingFee.sol");

module.exports = function(deployer, network, accounts) {
  let overwrite = true;
  let samuraiXWallet = accounts[9];
  switch (network) {
    case 'development':
      overwrite = true;
      break;
    default:
        throw new Error ("Unsupported network");
  }

  let token;
  deployer.deploy(ManageListingFee, samuraiXWallet, {overwrite: overwrite}).then (() => {
      return ManageListingFee.deployed();
  }).catch((err) => {
      console.error(err);
      process.exit(1);
  });
};
