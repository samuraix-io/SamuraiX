import ether from './helpers/ether.js';

const BigNumber = web3.BigNumber;

const should = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

const PATToken = artifacts.require("./PATToken.sol")
const RegisteredUsers = artifacts.require("./RegisteredUsers.sol")
contract ('PATToken', function ([owner, manager, investor, purchaser, network, RAXcompany, partner]) {
  let token;
  let registered_user;
  before(async function () {

      // console.log(owner);
      // console.log(manager);
      // console.log(investor);
      // console.log(purchaser);
      // console.log(network);
      // console.log(RAXcompany);
      // console.log(partner);
      registered_user = await RegisteredUsers.new();
      let id = 2;
      let name = 'pat_2';
      let symbol = "pat";
      let fixed_linkDoc = 'pat_doc_1';
      let fixed_hashDoc = 'pat_hash_1';
      let var_linkDoc = 'var_patDoc1';
      let var_hashDoc = 'var_hashDoc1';
      let listingFeeRate = 5;
      let reserveFundRate = 10;
      let managers = ['0xffcf8fdee72ac11b5c542428b35eef5769c409f0'];
      let samuraiXWallet = "0x1df62f291b2e969fb0849d99d9ce41e2f137006e";
      token = await PATToken.new(registered_user.address, id, managers, name, symbol, fixed_linkDoc, fixed_hashDoc, var_linkDoc, var_hashDoc, samuraiXWallet, listingFeeRate, reserveFundRate);
  });

  //holder test
  describe ('Holder', function () {
    it('should begin with 0 holder', async () => {
      (await token.getTheNumberOfHolders()).should.be.bignumber.equal (0);
    });

    it ('owner can update holder', async() => {
      await token.addHolder(partner).should.not.be.rejected;
    });

    it ('only owner can update holder', async () => {
      await token.addHolder(investor, {from: investor}).should.be.rejected;
    });

    it ('add holder update holder', async () => {
      const numb_holder = await token.getTheNumberOfHolders();
      await token.addHolder(investor);
      numb_holder.should.be.bignumber.equal (await token.getTheNumberOfHolders() - 1);

      await token.addHolder(purchaser);
      numb_holder.should.be.bignumber.equal (await token.getTheNumberOfHolders() - 2);
    })

    it ('add existed holder should be rejected', async () => {
      var numberHolderBefore = await token.getTheNumberOfHolders();
      (await token.addHolder(investor));
      (await token.addHolder(purchaser));
      var numberHolderAfter = await token.getTheNumberOfHolders();
      numberHolderAfter.should.be.bignumber.equal(numberHolderBefore);
      (await token.isHolder(investor)).should.be.equal(true);
      (await token.isHolder(purchaser)).should.be.equal(true);
    })

    it('check holder', async () => {
      (await token.isHolder(owner)).should.be.equal(false);

      (await token.isHolder(investor)).should.be.equal(true);
      (await token.isHolder(purchaser)).should.be.equal(true);
    });
  });

  //AssetInfo test
  describe ('AssetInfo', function() {
    let managers = ['0xffcf8fdee72ac11b5c542428b35eef5769c409f0'];
    it ('begins with manager address', async() => {
      (await token.getManager(0)).should.be.equal(managers[0]);
    });

    it ('manager can update asset info', async() => {
      await token.changeRunningDocuments("link", "hash", {from: managers[0]}).should.not.be.rejected;
    });

    it ('only manager can update asset info', async() => {
      await token.changeRunningDocuments("link", "hash", {from: investor}).should.be.rejected;
    });

    it ('update asset info should emit events', async() => {
      let link_str = "link_event";
      let hash_str = "hash_event";

      const {logs} = await token.changeRunningDocuments(link_str, hash_str, {from: manager});

      const add_asset_event = logs.find(e => e.event === 'UpdateRunningDocuments');
      add_asset_event.should.exist;
      (add_asset_event.args._linkDoc).should.equal(link_str);
      (add_asset_event.args._hashDoc).should.equal(hash_str);
    });

    it ('update asset info should update asset info state', async() => {
      let link_str = "test_link_1234";
      let hash_str = "test_hash_1234";
      await token.changeRunningDocuments(link_str, hash_str, {from: manager});

      let current_link;
      let current_hash;

      let return_val = await token.getRunningDocuments();

      current_link = return_val[0];
      current_hash = return_val[1];
      current_link.should.be.equal (link_str);
      current_hash.should.be.equal (hash_str);
    });


  });


// PAT token test ---------------------------------------------------
  describe("Token", function() {
    it("begins with totalSupply", async function () {
        const totalSupply = await token.totalSupply();
        totalSupply.should.be.bignumber.equal(0);
        owner.should.be.equal(await token.owner());
    });

    it("mint() updates balanceOf and totalSupply", async function () {
        const amount = ether(1);

        const starting_balance = await token.balanceOf(investor);
        const starting_supply = await token.totalSupply();
        await token.mint(investor, amount);

        (await token.balanceOf(investor)).minus(starting_balance).should.be.bignumber.equal(amount);
        (await token.totalSupply()).minus(starting_supply).should.be.bignumber.equal(amount);
    });

    it("mint() logs events", async function () {
        const from = '0x0000000000000000000000000000000000000000';
        const amount = ether(1);

        /*const beforeBalances = await.token.getBalances();
        console.log("balances before minting = " + beforeBalances);*/

        const {logs} = await token.mint(investor, amount);

        const mint_event = logs.find(e => e.event === 'Mint');
        mint_event.should.exist;
        (mint_event.args.to).should.equal(investor);
        (mint_event.args.amount).should.be.bignumber.equal(amount);

        const xfer_event = logs.find(e => e.event === 'Transfer');
        xfer_event.should.exist;
        (xfer_event.args.from).should.equal(from);
        (xfer_event.args.to).should.equal(investor);
        (xfer_event.args.value).should.be.bignumber.equal(amount);

    });

    it('should not mint more than TOTAL_TOKENS', async function () {
        await token.mint(investor, new BigNumber(11).times(10 ** 7).times(10 ** 18)).should.be.rejected;
    });

    describe('Ownable', function() {
       it('should not be self-ownable', async function() {
           await token.transferOwnership(token.address).should.be.rejected;
       });
    });

    describe('Pausable', function() {
        it('should allow approval when not paused', async function() {
            await token.mint(purchaser, 10);
            await token.approve(investor,2, {from: purchaser});
        });
        it('should allow transferFrom when not paused', async function() {
            await token.transferFrom(purchaser, investor,1, {from: investor});
        });
        it('should support pause()', async function() {
            await token.pause();
            (await token.paused()).should.be.equal(true);
        });
        it('should allow minting when paused', async function() {
            await token.mint(investor,1).should.be.fulfilled;
        });
        it('should reject approve when paused', async function() {
            await token.approve(investor,1, {from: RAXcompany}).should.be.rejected;
        });
        it('should reject transferFrom when paused', async function() {
            await token.transferFrom(purchaser, investor,1, {from: investor}).should.be.rejected;
        });
        it('should reject transfer when paused', async function() {
            await token.transfer(investor,1, {from: RAXcompany}).should.be.rejected;
        });
        it('should support unpause()', async function() {
            await token.unpause();
            (await token.paused()).should.be.equal(false);
        });
        it('should allow transferFrom when unpaused', async function() {
            await token.transferFrom(purchaser, investor,1, {from: investor});
        });
    });
  });
});
