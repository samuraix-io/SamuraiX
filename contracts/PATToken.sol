pragma solidity ^0.4.24;

import './zeppelin/contracts/ownership/Contactable.sol';
import "./zeppelin/contracts/ownership/NoOwner.sol";

import './base-token/BurnableToken.sol';
import './base-token/PausableToken.sol';
import './TraceableToken.sol';


/**
 * @title PAT token.
 * @dev PAT is a ERC20 token that:
 *  - caps total number at 100 million tokens.
 *  - can pause and unpause token transfer (and authorization) actions.
 *  - mints new tokens when purchased.
 *  - token holders can be distributed profit from asset manager.
 *  - contains real asset information.
 *  - attempts to reject ERC20 token transfers to itself and allows token transfer out.
 *  - attempts to reject ether sent and allows any ether held to be transferred out.
 *  - allows the new owner to accept the ownership transfer, the owner can cancel the transfer if needed.
 **/
contract PATToken is Contactable, NoOwner, BurnableToken, TraceableToken, PausableToken {
  string public name = "PATToken";
  string public symbol = "PAT";

  uint8 public constant decimals = 18;
  uint256 public constant TOTAL_TOKENS = 100 * (10**6) * (10 ** uint256(decimals));

  event ChangeTokenName(string newName, string newSymbol);

  /**
   * @param _name Name of this token.
   * @param _symbol Symbol of this token.
   */
  constructor(string _name, string _symbol) public {
    name = _name;
    symbol = _symbol;
    contactInformation = 'https://token.samuraix.io/';
  }

  function changeTokenName(string _name, string _symbol) public onlyOwner {
    name = _name;
    symbol = _symbol;
    emit ChangeTokenName(_name, _symbol);
  }

  /**
   * @dev Mints tokens to a beneficiary address.
   * Cap minting so that totalSupply <= TOTAL_TOKENS.
   * @param _to Who got the tokens.
   * @param _amount Amount of tokens.
   */
  function mint(
    address _to,
    uint256 _amount
  )
    public
    hasMintPermission
    canMint
    returns(bool)
  {
    require(totalSupply().add(_amount) <= TOTAL_TOKENS);

    return super.mint(_to, _amount);
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
   * @dev Calculates profit to distribute to a specified token normal holder.
   * @param _totalProfit Total profit.
   * @param _totalBalance Total tokens of normal holders.
   * @param _holder Token normal holder address.
   * @return Profit value relevant to the token holder.
   */
  function calculateProfit(
    uint256 _totalProfit,
    uint256 _totalBalance,
    address _holder
  )
    public
    view
    returns (uint256)
  {
    require(_totalProfit > 0);
    require(_totalBalance > 0);
    uint256 _balance = balanceOf(_holder);
    require(_balance > 0);

    uint256 _profit = (_balance.mul(_totalProfit)).div(_totalBalance);
    return _profit;
  }

  // Alternatives to the normal NoOwner functions in case this contract's owner
  // can't own ether or tokens.
  // Note that we *do* inherit reclaimContract from NoOwner: This contract
  // does have to own contracts, but it also has to be able to relinquish them.
  function reclaimEther(address _to) external onlyOwner {
    _to.transfer(address(this).balance);
  }

  function reclaimToken(ERC20Basic token, address _to) external onlyOwner {
    uint256 balance = token.balanceOf(this);
    token.safeTransfer(_to, balance);
  }
}
