const RegisteredUsers = artifacts.require("./RegisteredUsers.sol");

module.exports = function(deployer, network) {
    let overwrite = true;

    switch (network) {

      case "development":
        overwrite = true;
        break;
      default:
        throw new Error ("unsupported network");
    }
    deployer.deploy(RegisteredUsers, {overwrite: overwrite}).then (() => {
        return RegisteredUsers.deployed();
    }).catch((err) => {
        console.error(err);
        process.exit(1);
    });
};
