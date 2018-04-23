const RegisteredUsers = artifacts.require ("./RegisteredUsers.sol");
const PATToken = artifacts.require("./PATToken.sol");

module.exports = function(deployer, network) {
  let overwrite = true;
  let name = "pat_1";
  let symbol = "pat";
  let fixedDocsLink;
  let fixedDocsHash;
  let varDocsLink;
  let varDocsHash;
  let listingFeeRate = 5;
  let reserveFundRate = 10;
  let owner = '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1';
  let manager_addr = ['0xffcf8fdee72ac11b5c542428b35eef5769c409f0'];
  let samuraiXWallet = "0x1df62f291b2e969fb0849d99d9ce41e2f137006e";
  let id = 2;
  switch (network) {
    case 'development':
      overwrite = true;
      manager_addr = ['0xffcf8fdee72ac11b5c542428b35eef5769c409f0'];
      owner = '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1';
      let name = "pat_2";
      let symbol = "pat";
      fixedDocsLink = "doc_2";
      fixedDocsHash = "hash_2";
      varDocsLink = "varLinkDoc_2";
      varDocsHash = "varDocHash_2";
      let id = 2;
      break;
    default:
        throw new Error ("Unsupported network");
  }

  let registered_user;

  deployer.then (() => {
      return RegisteredUsers.deployed();
  }).then ((inst) => {
      registered_user = inst;
      return deployer.deploy(PATToken, registered_user.address, id, manager_addr, name, symbol, fixedDocsLink, fixedDocsHash, varDocsLink, varDocsHash, samuraiXWallet, listingFeeRate, reserveFundRate, {from : owner, overwrite: overwrite});
  }).then(() => {
      return PATToken.deployed();
  }).catch((err) => {
      console.error(err);
      process.exit(1);
  });
};
