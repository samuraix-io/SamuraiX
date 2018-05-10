const RegisteredUsers = artifacts.require ("./RegisteredUsers.sol");
const DistributeEther = artifacts.require("./DistributeEther.sol");

module.exports = function(deployer, network) {
    let overwrite = true;

    switch (network) {

      case "development":
        overwrite = true;
        break;
      default:
        throw new Error ("unsupported network");
    }

    let registeredUser;

    deployer.then (() => {
      return RegisteredUsers.deployed();
    }).then ((inst) => {
      registeredUser = inst;
      return deployer.deploy(DistributeEther, registeredUser.address, {overwrite: overwrite});
    }).then(() => {
        return DistributeEther.deployed();
    }).catch((err) => {
        console.error(err);
        process.exit(1);
    });
};
