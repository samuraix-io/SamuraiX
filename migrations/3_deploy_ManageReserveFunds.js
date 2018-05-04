const ManageReserveFunds = artifacts.require("./ManageReserveFunds.sol");

module.exports = function(deployer, network) {
  let overwrite = true;
  switch (network) {
    case 'development':
      overwrite = true;
      break;
    default:
        throw new Error ("Unsupported network");
  }

  let token;
  deployer.deploy(ManageReserveFunds, {overwrite: overwrite}).then (() => {
      return ManageReserveFunds.deployed();
  }).catch((err) => {
      console.error(err);
      process.exit(1);
  });
};
