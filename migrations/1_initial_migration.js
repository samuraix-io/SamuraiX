const Migrations = artifacts.require("./Migrations.sol");

module.exports = function(deployer, accounts) {
    deployer.deploy(Migrations);
};
