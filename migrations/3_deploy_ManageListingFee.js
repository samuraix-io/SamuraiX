const ManageListingFee = artifacts.require("./ManageListingFee.sol");

module.exports = function(deployer, network) {
  let overwrite = true;
  let owner = '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1';
  let samuraiXWallet = "0x1df62f291b2e969fb0849d99d9ce41e2f137006e";
  switch (network) {
    case 'development':
      overwrite = true;
      owner = '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1';
      let id = 2;
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
