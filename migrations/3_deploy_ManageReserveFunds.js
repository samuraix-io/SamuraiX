const ManageReserveFunds = artifacts.require("./ManageReserveFunds.sol");

module.exports = function(deployer, network) {
  let overwrite = true;
  let owner = '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1';
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
  deployer.deploy(ManageReserveFunds, {overwrite: overwrite}).then (() => {
      return ManageReserveFunds.deployed();
  }).catch((err) => {
      console.error(err);
      process.exit(1);
  });
};
