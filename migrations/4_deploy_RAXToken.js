const RegisteredUsers = artifacts.require ("./RegisteredUsers.sol");
const RAXToken = artifacts.require("./RAXToken.sol");

module.exports = function(deployer, network) {
  let overwrite = true;

  switch (network) {
    case 'development':
      overwrite = true;
      break;
    default:
        throw new Error ("Unsupported network");
  }

  let registeredUser;

  deployer.then (() => {
      return RegisteredUsers.deployed();
  }).then ((inst) => {
      registeredUser = inst;
      return deployer.deploy(RAXToken, registeredUser.address, {overwrite: overwrite});
  }).then(() => {
      return RAXToken.deployed();
  }).catch((err) => {
      console.error(err);
      process.exit(1);
  });
};
