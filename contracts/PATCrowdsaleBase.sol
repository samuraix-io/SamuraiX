pragma solidity ^0.4.11;

import 'zeppelin-solidity/contracts/ownership/HasNoContracts.sol';
import 'zeppelin-solidity/contracts/ownership/Contactable.sol';
import 'zeppelin-solidity/contracts/lifecycle/Pausable.sol';
import './CoinExchange.sol';
import './PATToken.sol';
import './RAXToken.sol';
import './RegisteredUsers.sol';
import './RefundableExCrowdsale.sol';


/*
 * PATCrowdsaleBase is the base class for both the PATCrowdsaleEther and PATCrowdsaleRAX.
 * It is a Crowdsale that is:
 *  - time capped by start and end dates.
 *  - value capped by number of tokens sold (and not ether raised).
 *  - supports a variable exchange rate by allowing sub-classes to override _weiToPAT() and _raxToWei().
 *  - pause() and unpause() to control token purchases.
 *  - finalize() transfers token ownership to this.owner.
 *  - accepts RAX token transfers to itself and allows token transfer out.
 *  - allows child contract ownership to be transferred to this.owner.
 *  - allows wallet which receives sales proceeds to be updated.
 *  - allows end date to be updated.
 *  - any unregistered users can not buy tokens.
 *  - refundable.
 */
contract PATCrowdsaleBase is Contactable, Pausable, HasNoContracts, RefundableExCrowdsale {
  using SafeMath for uint256;
  using CoinExchange for uint256;

  uint256 public tokensSold = 0;
  RegisteredUsers public regUsers;

  /**
   * @param _regUsers A contract to check whether an account is registered or not.
   * @param _raxToken RAX token contract address.
   * @param _token PAT token contract address.
   * @param _startTime Start date.
   * @param _endTime End data.
   * @param _ethWallet A wallet address to receive sales proceeds if crowdsale is successful.
   * @param _weiAmountGoal Minimum wei amount to raise.
   */
  function PATCrowdsaleBase(
    RegisteredUsers _regUsers,
    RAXToken _raxToken,
    MintableToken _token,
    uint256 _startTime,
    uint256 _endTime,
    address _ethWallet,
    uint256 _weiAmountGoal
  )
  Ownable()
  Pausable()
  Contactable()
  HasNoContracts()
  Crowdsale(1, _ethWallet, _token)
  TimedCrowdsale(_startTime, _endTime)
  RefundableExCrowdsale(_raxToken, _weiAmountGoal)
  {
    // deployment must set token.owner = PATCrowdsale.address to allow minting
    regUsers = _regUsers;
    contactInformation = 'https://token.samuraix.io/';
  }

  /**
   * @dev Changes a wallet address to receive sales proceeds if crowdsale is successful.
   * @param _wallet A new wallet address.
   */
  function setWallet(address _wallet) external {
    require(_wallet != 0x0);
    require(getTokenContract().isManager(msg.sender));

    wallet = _wallet;
  }

  /**
   * @dev Changes end date of the crowdsale.
   * @param _endTime A new end date.
   */
  function setEndTime(uint256 _endTime) external {
    require(_endTime > block.timestamp);
    require(getTokenContract().isManager(msg.sender));

    closingTime = _endTime;
  }

  /**
   * @dev Mints tokens to a buyer and adds him to the token holders list.
   * @param _beneficiary Who got the tokens.
   * @param _weiAmount Wei amount to exchange.
   * @return The number of minted tokens.
   */
  function _buyTokens(address _beneficiary, uint256 _weiAmount) internal returns(uint256) {
    require(_beneficiary != 0x0);
    require(_weiAmount > 0);
    require(regUsers.isUserRegistered(_beneficiary));

    _preValidatePurchase(_beneficiary, _weiAmount);

    // calculate token amount to be created
    uint256 _tokens = _weiToPAT(_weiAmount);
    require(_tokens > 0);

    // update state
    weiRaised = weiRaised.add(_weiAmount);
    tokensSold = tokensSold.add(_tokens);

    getTokenContract().mint(_beneficiary, _tokens);
    getTokenContract().addHolder(_beneficiary);
    return _tokens;
  }

  /**
   * @dev Checks whether the crowdsale has ended or not.
   * Overriding Crowdsale.hasEnded to add cap logic.
   * @return True if crowdsale event has ended, otherwise false.
   */
  function hasEnded() public view returns(bool) {
    bool capReached = tokensRemaining() == 0;
    return super.hasClosed() || capReached;
  }

  /**
   * @dev Transfers ownership of the token when the crowdsale has ended.
   * @param _newOwner New owner address.
   */
  function tokenTransferOwnership(address _newOwner) public onlyOwner {
    require(hasEnded() == true);
    Ownable(token).transferOwnership(_newOwner);
  }

  /*
  * @dev Allows the current owner to transfer control of the contract to a new owner.
  * @param _newOwner The address to transfer ownership to.
  */
  function transferOwnership(address _newOwner) onlyOwner public {
    // do not allow self ownership
    require(_newOwner != address(this));
    super.transferOwnership(_newOwner);
  }

  /**
   * @dev Gets the number of remaining tokens.
   * Sub-classes must override to control tokens sales cap.
   * @return The number of remaining tokens.
   */
  function tokensRemaining() view public returns(uint256);

  /*
   * internal functions
   */

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

  /**
   * @dev Gets the token contract.
   * @return The token contract.
   */
  function getTokenContract() internal view returns(PATToken) {
    return PATToken(token);
  }

  /**
  * @dev Exchanges from Wei to PAT token.
  * Sub-classes must override to customize exchange rate.
  * @param _wei Amount of Wei to exchange.
  * @return The number of PAT token units exchanged.
  */
  function _weiToPAT(uint256 _wei) view internal returns(uint256);

  /**
  * @dev Exchanges from RAT token to Wei.
  * Sub-classes must override to customize exchange rate.
  * @param _amount Amount of RAT token units.
  * @return Amount of Wei exchanged.
  */
  function _raxToWei(uint256 _amount) view internal returns(uint256);
}
