let RegisteredUsers = artifacts.require ("./RegisteredUsers.sol");
let ManageListingFee = artifacts.require("./ManageListingFee.sol");
let ManageReserveFunds = artifacts.require("./ManageReserveFunds.sol");
let PATToken = artifacts.require("./PATToken.sol");
let RAXToken = artifacts.require("./RAXToken.sol")
let PATSale = artifacts.require("./PATSale.sol");

module.exports = function(deployer, network, accounts) {
  let overwrite = false;
  let startDate = Math.floor(Date.now() / 1000) + 300;
  let endDate = startDate + 86400 * 7 * 1000;
  let wallet = accounts[2];
  let decimals = 10 ** 18;
  let maxCap = (85 * 1000000) * decimals;
  let minCap = (50 * 1000000) * decimals;
  let listingFeeRate = 5;
  let reserveFundRate = 10;
  let reserve_rate = 10;
  let ethPATRate = 75000;
  let ethRAXRate = 75000;
  let minPurchaseAmt = "undefined";
  let RAXrate = 100;
  switch (network) {
    case "development":
      overwrite = true;
      break;
    default:
      throw new Error ("Unsupported network");
  }

  let registeredUser;
  let patToken;
  let raxToken;
  let manageListingFee;
  let manageReserveFunds;
  let crowdsale;
  deployer.then(() => {
    return RegisteredUsers.deployed();
  }).then ((inst) => {
    registeredUser = inst;
    return ManageListingFee.deployed();
  }).then((inst) => {
    manageListingFee = inst;
    return ManageReserveFunds.deployed();
  }).then((inst) => {
    manageReserveFunds = inst;
    return RAXToken.deployed();
  }).then ((inst) => {
    raxToken = inst;
    return PATToken.deployed();
  }).then((inst) => {
    patToken = inst;
    return deployer.deploy(PATSale, registeredUser.address, raxToken.address, patToken.address, manageListingFee.address, manageReserveFunds.address, startDate, endDate, wallet, minCap, maxCap, ethPATRate, ethRAXRate, listingFeeRate, reserveFundRate, { overwrite: overwrite});
  }).then((patSale) => {
    return PATSale.deployed();
  }).then((inst) => {
    crowdsale = inst;
    if(minPurchaseAmt > 0) {
      return crowdsale.setMinPurchaseAmt(minPurchaseAmt);
    }
    return true;
  }).then(() => {
    return patToken.transferOwnership(crowdsale.address);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
