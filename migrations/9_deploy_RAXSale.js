const RegisteredUsers = artifacts.require ("./RegisteredUsers.sol");
const RAXToken = artifacts.require("./RAXToken.sol");
const RAXSale = artifacts.require("./RAXSale.sol");
const ether = n => new web3.BigNumber(web3.toWei(n, 'ether'));

/*
 * Configure and deploy the crowdsale contract PreSale.
 * The presale contract is also granted ownership of the token which is required to mint tokens.
 * RAXToken owner is assumed to be the default deployment account.
 */

module.exports = function(deployer, network) {
    let proceeds_addr = '0x158f3a8d816d61f80c8db36fd6c48b57ecef0ad4';
    let startDate = Date.parse('2017-10-13T19:00:00Z') / 1000;
    let endDate = Date.parse('2017-10-20T19:00:00Z') / 1000;
    let overwrite = false;
    let minPurchaseAmt = "undefined";
    let rate = 75000;
    switch(network) {
        case 'development':
            overwrite = true;
            proceeds_addr = '0x1df62f291b2e969fb0849d99d9ce41e2f137006e';
            // ensure dates are in the future so tests always work (even when sale is over)
            startDate = Math.floor(Date.now() / 1000) + 300;
            endDate = startDate + 86400 * 7;
            break;
        case 'test':
            overwrite = true;
            proceeds_addr = '0x1df62f291b2e969fb0849d99d9ce41e2f137006e';
            // start 5 mins from now
            startDate = Math.floor(Date.now() / 1000) + 300000000000;
            endDate = startDate + 1800;
            minPurchaseAmt = ether(0.1);
            break;
        case 'main':
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
        return deployer.deploy(RAXSale, registeredUsers.address, token.address, startDate, endDate, proceeds_addr, rate, {overwrite: overwrite});
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
