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
 * PATCrowdsale is the base class for both the PreSale and MainSale.
 * It is a Crowdsale that is:
 *  - time capped by start and end dates
 *  - value capped by number of tokens sold (and not ether raised)
 *  - supports a variable exchange rate by allowing sub-classes to override applyExchangeRate()
 *  - pause() and unpause() to control token purchases
 *  - finalize() transfers token ownership to this.owner
 *  - attempts to reject ERC20 token transfers to itself and allows token transfer out
 *  - allows child contract ownership to be transferred to this.owner
 *  - allows wallet which receives sales proceeds to be updated
 */
contract PATCrowdsaleBase is Contactable, Pausable, HasNoContracts, RefundableExCrowdsale {
  using SafeMath for uint256;
  using CoinExchange for uint256;

  uint256 public tokensSold = 0;
  RegisteredUsers public regUsers;

  // ignore the Crowdsale.rate and dynamically compute rate based on other factors (e.g. purchase amount, time, etc)
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

  function setWallet(address _wallet) external {
    require(_wallet != 0x0);
    require(getTokenContract().isManager(msg.sender));

    wallet = _wallet;
  }

  function setEndTime(uint256 _endTime) external {
    require(_endTime > block.timestamp);
    require(getTokenContract().isManager(msg.sender));

    closingTime = _endTime;
  }

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

  // overriding Crowdsale#hasEnded to add cap logic
  // @return true if crowdsale event has ended
  function hasEnded() public view returns(bool) {
    bool capReached = tokensRemaining() == 0;
    return super.hasClosed() || capReached;
  }

  function tokenTransferOwnership(address newOwner) public onlyOwner {
    require(hasEnded() == true);
    Ownable(token).transferOwnership(newOwner);
  }

  /*
  * @dev Allows the current owner to transfer control of the contract to a newOwner.
  * @param newOwner The address to transfer ownership to.
  */
  function transferOwnership(address newOwner) onlyOwner public {
    // do not allow self ownership
    require(newOwner != address(this));
    super.transferOwnership(newOwner);
  }

  // sub-classes must override to control tokens sales cap
  function tokensRemaining() view public returns (uint256);

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

  function getTokenContract() internal view returns(PATToken) {
    return PATToken(token);
  }

  // sub-classes must override to customize token-per-wei exchange rate
  function _weiToPAT(uint256 _wei) view internal returns(uint256);

  function _raxToWei(uint256 _amount) view internal returns(uint256);
}
