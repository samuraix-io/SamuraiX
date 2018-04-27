pragma solidity ^0.4.11;

import 'zeppelin-solidity/contracts/crowdsale/distribution/FinalizableCrowdsale.sol';
import 'zeppelin-solidity/contracts/ownership/HasNoTokens.sol';
import 'zeppelin-solidity/contracts/ownership/HasNoContracts.sol';
import 'zeppelin-solidity/contracts/ownership/Contactable.sol';
import 'zeppelin-solidity/contracts/lifecycle/Pausable.sol';
import './RAXToken.sol';


/*
 * @title RAXCrowdsale is the base class for RAXSale.
 * @dev It is a Crowdsale that is:
 *  - time capped by start and end dates.
 *  - value capped by number of tokens sold (and not ether raised).
 *  - supports a variable exchange rate by allowing sub-classes to override _applyExchangeRate().
 *  - pause() and unpause() to control token purchases.
 *  - finalize() transfers token ownership to this.owner.
 *  - attempts to reject ERC20 token transfers to itself and allows token transfer out.
 *  - allows child contract ownership to be transferred to this.owner.
 *  - allows wallet which receives sales proceeds to be updated.
 */
contract RAXCrowdsale is Contactable, Pausable, HasNoContracts, HasNoTokens, FinalizableCrowdsale {
    using SafeMath for uint256;

    uint256 public tokensSold = 0;
    RegisteredUsers public regUsers;

    /**
     * @param _regUsers A contract to check whether an account is registered or not.
     * @param _token RAX token contract address.
     * @param _startTime Start date.
     * @param _endTime End data.
     * @param _ethWallet A wallet address to receive sales proceeds if crowdsale is successful.
     */
    function RAXCrowdsale(RegisteredUsers _regUsers, MintableToken _token, uint256 _startTime, uint256 _endTime, address _ethWallet)
    Ownable()
    Pausable()
    Contactable()
    HasNoTokens()
    HasNoContracts()
    Crowdsale(1, _ethWallet, _token)
    FinalizableCrowdsale()
    TimedCrowdsale(_startTime, _endTime)
    {
      // deployment must set token.owner = RAXCrowdsale.address to allow minting
      token = _token;
      regUsers = _regUsers;
      contactInformation = 'https://token.samuraix.io/';
    }

    /**
     * @dev Changes a wallet address to receive sales proceeds if crowdsale is successful.
     * @param _wallet A new wallet address.
     */
    function setWallet(address _wallet) onlyOwner public {
        require(_wallet != 0x0);
        wallet = _wallet;
    }

    /**
     * @dev Mints tokens to a buyer and adds him to the token holders list.
     * @param _beneficiary Who got the tokens.
     */
    function buyTokens(address _beneficiary) public payable whenNotPaused {
        require(_beneficiary != 0x0);
        require(regUsers.isUserRegistered(_beneficiary));

        uint256 weiAmount = msg.value;
        _preValidatePurchase(_beneficiary, weiAmount);

        // calculate token amount to be created
        uint256 tokens = _applyExchangeRate(weiAmount);

        // update state
        weiRaised = weiRaised.add(weiAmount);
        tokensSold = tokensSold.add(tokens);

        RAXToken(token).mint(_beneficiary, tokens);
        TokenPurchase(msg.sender, _beneficiary, weiAmount, tokens);
        RAXToken(token).addHolder(_beneficiary);
        _forwardFunds();
    }

    /**
     * @dev Transfers ownership of the token when the crowdsale has ended.
     * @param _newOwner New owner address.
     */
    function tokenTransferOwnership(address _newOwner) public onlyOwner {
        require(hasEnded());
        RAXToken(token).transferOwnership(_newOwner);
    }

    /**
     * @dev Allows the current owner to transfer control of the contract to a new owner.
     * @param _newOwner The address to transfer ownership to.
     */
    function transferOwnership(address _newOwner) onlyOwner public {
        // do not allow self ownership
        require(_newOwner != address(this));
        super.transferOwnership(_newOwner);
    }

    /**
     * @dev Checks whether the crowdsale has ended or not.
     * Overriding Crowdsale.hasEnded to add cap logic.
     * @return True if crowdsale event has ended, otherwise false.
     */
    function hasEnded() public constant returns(bool) {
        bool capReached = tokensRemaining() == 0;
        return super.hasClosed() || capReached;
    }

    /**
     * @dev Gets the number of remaining tokens.
     * Sub-classes must override to control tokens sales cap.
     * @return The number of remaining tokens.
     */
    function tokensRemaining() constant public returns(uint256);


    /*
     * internal functions
     */

    /**
     * @dev Gets the token contract.
     * @return The token contract.
     */
    function _getTokenContract() internal view returns(MintableToken) {
        return RAXToken(token);
    }

    /**
     * @dev Exchanges from Wei to RAX token.
     * Sub-classes must override to customize exchange rate.
     * @param _wei Amount of Wei to exchange.
     * @return The number of token units exchanged.
     */
    function _applyExchangeRate(uint256 _wei) constant internal returns(uint256);

    /*
     * @dev Can be overridden to add finalization logic. The overriding function
     * should call super.finalization() to ensure the chain of finalization is
     * executed entirely.
     */
    function finalization() internal {
        // if we own the token, pass ownership to our owner when finalized
        if(address(token) != address(0) && Ownable(token).owner() == address(this) && owner != address(0)) {
            Ownable(token).transferOwnership(owner);
        }
        super.finalization();
    }
}
