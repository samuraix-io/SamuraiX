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
    deployer.deploy(DistributeEther, {overwrite: overwrite}).then (() => {
        return DistributeEther.deployed();
    }).catch((err) => {
        console.error(err);
        process.exit(1);
    });
};
