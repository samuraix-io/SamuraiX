let RegisteredUsers = artifacts.require ("./RegisteredUsers.sol");
let PATToken = artifacts.require("./PATToken.sol");
let RAXToken = artifacts.require("./RAXToken.sol")
let PATSale = artifacts.require("./PATSale.sol");

module.exports = function(deployer, network) {
  let overwrite = false;
  let startDate = Date.parse('2017-10-13T19:00:00Z') / 1000;
  let endDate = Date.parse('2017-10-20T19:00:00Z') / 1000;
  let receiver_addr = "0x22d491bde2303f2f43325b2108d26f1eaba1e32b";
  let maxCap = 85 * 1000000;
  let minCap = 50 * 1000000;
  let reserve_rate = 10;
  let ethPATRate = 75000;
  let ethRAXRate = 75000;
  let decimals = 10 ** 18;
  let minPurchaseAmt = "undefined";
  let RAXrate = 100;
  switch (network) {
    case "development":
      overwrite = true;
      receiver_addr = "0x22d491bde2303f2f43325b2108d26f1eaba1e32b";
      startDate = Math.floor(Date.now() / 1000) + 1600000000000;
      endDate = startDate + 86400 * 7 * 1000;
      minCap = (50 * 1000000) * decimals;
      maxCap = (85 * 1000000) * decimals;
      ethPATRate = 75000;
      ethRAXRate = 75000;
      break;
    default:
      throw new Error ("Unsupported network");
  }

  let registered_user;
  let patToken;
  let raxToken;
  let crowdsale;
  deployer.then(() => {
    return RegisteredUsers.deployed();
  }).then ((inst) => {
    registered_user = inst;
    return RAXToken.deployed();
  }).then ((inst) => {
    raxToken = inst;
    return PATToken.deployed();
  }).then((inst) => {
    patToken = inst;
    return deployer.deploy(PATSale, registered_user.address, raxToken.address, patToken.address, startDate, endDate, receiver_addr, minCap, maxCap, ethPATRate, ethRAXRate, { overwrite: overwrite});
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
