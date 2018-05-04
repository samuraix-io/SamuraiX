const RegisteredUsers = artifacts.require ("./RegisteredUsers.sol");
const RAXToken = artifacts.require("./RAXToken.sol");
const RAXSale = artifacts.require("./RAXSale.sol");
const ether = n => new web3.BigNumber(web3.toWei(n, 'ether'));

/*
 * Configure and deploy the crowdsale contract PreSale.
 * The presale contract is also granted ownership of the token which is required to mint tokens.
 * RAXToken owner is assumed to be the default deployment account.
 */

module.exports = function(deployer, network, accounts) {
    let wallet = accounts[9];
    // ensure dates are in the future so tests always work (even when sale is over)
    let startDate = Math.floor(Date.now() / 1000) + 300;
    let endDate = startDate + 86400 * 7;
    let overwrite = false;
    let minPurchaseAmt = "undefined";
    let rate = 75000;
    switch(network) {
        case 'development':
            overwrite = true;
            break;
        default:
            throw new Error('Unsupported network');
    }

    let token;
    let registeredUsers;
    let crowdsale;
    deployer.then(() => {
        return RegisteredUsers.deployed();
    }).then((inst) => {
        registeredUsers = inst;
        return RAXToken.deployed();
    }).then((inst) => {
        token = inst;
        return deployer.deploy(RAXSale, registeredUsers.address, token.address, startDate, endDate, wallet, rate, {overwrite: overwrite});
    }).then(() => {
        return RAXSale.deployed();
    }).then((inst) => {
        crowdsale = inst;
        if(minPurchaseAmt > 0) {
            return crowdsale.setMinPurchaseAmt(minPurchaseAmt);
        }
        return true;
    }).then(() => {
        return token.transferOwnership(crowdsale.address);
    }).catch((err) => {
        console.error(err);
        process.exit(1);
    });

};
