const RegisteredUsers = artifacts.require ("./RegisteredUsers.sol");
const RAXToken = artifacts.require("./RAXToken.sol");

module.exports = function(deployer, network) {
  let overwrite = true;
  let owner = '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1';

  switch (network) {
    case 'development':
      overwrite = true;
      owner = '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1';
      break;
    default:
        throw new Error ("Unsupported network");
  }

  let registered_user;

  deployer.then (() => {
      return RegisteredUsers.deployed();
  }).then ((inst) => {
      registered_user = inst;
      return deployer.deploy(RAXToken, registered_user.address,  {from : owner, overwrite: overwrite});
  }).then(() => {
      return RAXToken.deployed();
  }).catch((err) => {
      console.error(err);
      process.exit(1);
  });
};
