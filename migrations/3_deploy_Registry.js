const Registry = artifacts.require("./Registry.sol");
const BitManipulation = artifacts.require("./BitManipulation.sol");
const Attribute = artifacts.require("./Attribute.sol");


module.exports = function(deployer, network) {
  let overwrite = true;

  switch (network) {
    case 'development':
      overwrite = true;
      break;
    default:
        throw new Error ("Unsupported network");
  }

  deployer.then (async () => {
    await deployer.deploy(BitManipulation);
    await deployer.deploy(Attribute);
    await deployer.link(BitManipulation, Registry);
    await deployer.link(Attribute, Registry);
    return deployer.deploy(Registry, {overwrite: overwrite});
  }).then(() => {
      return Registry.deployed();
  }).catch((err) => {
      console.error(err);
      process.exit(1);
  });
};
