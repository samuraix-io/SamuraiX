const DistributeRAX = artifacts.require("./DistributeRAX.sol");
const RAXToken = artifacts.require("./RAXToken.sol");

module.exports = function(deployer, network) {
    let overwrite = true;

    switch (network) {

      case "development":
        overwrite = true;
        break;
      default:
        throw new Error ("unsupported network");
    }
    let raxToken;
    deployer.then(() => {
      return RAXToken.deployed();
    }).then((inst) => {
      raxToken = inst;
      return deployer.deploy(DistributeRAX, raxToken.address, {overwrite: overwrite});
    }).catch((err) => {
      console.error(err);
      process.exit(1);
    });
};
