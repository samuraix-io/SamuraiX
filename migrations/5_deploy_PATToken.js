const RegisteredUsers = artifacts.require ("./RegisteredUsers.sol");
const PATToken = artifacts.require("./PATToken.sol");

module.exports = function(deployer, network, accounts) {
  let overwrite = true;
  let name = "pat_2";
  let symbol = "pat";
  let fixedDocsLink = "doc_2";
  let fixedDocsHash = "hash_2";
  let varDocsLink = "varLinkDoc_2";
  let varDocsHash = "varDocHash_2";
  let listingFeeRate = 5;
  let reserveFundRate = 10;
  let managers = [accounts[1], accounts[6]];
  let id = 2;
  
  switch (network) {
    case 'development':
      overwrite = true;
      break;
    default:
        throw new Error ("Unsupported network");
  }

  let registered_user;

  deployer.then (() => {
      return RegisteredUsers.deployed();
  }).then ((inst) => {
      registered_user = inst;
      return deployer.deploy(PATToken, registered_user.address, id, managers, name, symbol, fixedDocsLink, fixedDocsHash, varDocsLink, varDocsHash, {overwrite: overwrite});
  }).then(() => {
      return PATToken.deployed();
  }).catch((err) => {
      console.error(err);
      process.exit(1);
  });
};
