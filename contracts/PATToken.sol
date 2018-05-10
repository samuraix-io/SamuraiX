pragma solidity ^0.4.20;

import 'zeppelin-solidity/contracts/token/ERC20/PausableToken.sol';
import 'zeppelin-solidity/contracts/ownership/HasNoTokens.sol';
import 'zeppelin-solidity/contracts/ownership/HasNoEther.sol';
import 'zeppelin-solidity/contracts/ownership/Contactable.sol';
import './ManageableToken.sol';


/**
 * @title PAT token.
 * @dev PAT is a ERC20 token that:
 *  - caps total number at 100 million tokens.
 *  - can pause and unpause token transfer (and authorization) actions.
 *  - can be disabled/enabled.
 *  - mints new tokens when purchased.
 *  - token holders can be distributed profit from asset manager.
 *  - contains real asset information.
 *  - attempts to reject token transfer to any unregistered users.
 *  - attempts to reject ERC20 token transfers to itself and allows token transfer out.
 *  - attempts to reject ether sent and allows any ether held to be transferred out.
 **/
contract PATToken is Contactable, HasNoTokens, HasNoEther, PausableToken, ManageableToken {
  string public name;
  string public symbol;

  uint8 public constant decimals = 18;
  uint256 public constant ONE_TOKENS = (10 ** uint256(decimals));
  uint256 public constant MILLION_TOKENS = (10**6) * ONE_TOKENS;
  uint256 public constant TOTAL_TOKENS = 100 * MILLION_TOKENS;

  /**
   * @param _regUsers A contract to check whether an account is registered or not.
   * @param _id Unique ID of this token. _id must be greater than 1.
   * @param _managers Managers of a real asset associated with this token.
   * @param _name Name of this token.
   * @param _symbol Symbol of this token.
   * @param _fixedDocsLink A link to a zip file containing fixed legal documents of the asset.
   * @param _fixedDocsHash Hash value of the zip file containing fixed legal documents of the asset.
   * @param _varDocsLink A link to a zip file containing running documents of the asset.
   * @param _varDocsHash Hash value of the zip file containing running documents of the asset.
   */
  function PATToken(
    RegisteredUsers _regUsers,
    uint256 _id,
    address[] _managers,
    string _name,
    string _symbol,
    string _fixedDocsLink,
    string _fixedDocsHash,
    string _varDocsLink,
    string _varDocsHash
  )
  Ownable()
  Contactable()
  HasNoTokens()
  HasNoEther()
  MintableToken()
  PausableToken()
  DistributableToken(_regUsers, _id)
  AssetInfo(_managers, _fixedDocsLink, _fixedDocsHash, _varDocsLink, _varDocsHash)
  {
    require(_id > 1);

    name = _name;
    symbol = _symbol;
    contactInformation = 'https://token.samuraix.io/';
  }

  /**
   * @dev Mints tokens to a beneficiary address.
   * Cap minting so that totalSupply <= TOTAL_TOKENS.
   * @param _to Who got the tokens.
   * @param _amount Amount of tokens.
   */
  function mint(address _to, uint256 _amount) onlyOwner canMint public returns(bool) {
    require(totalSupply_.add(_amount) <= TOTAL_TOKENS);
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
   * @dev Gets total tokens.
   * @return Total tokens.
   */
  function getTotalTokens() public view returns(uint256) {
      return TOTAL_TOKENS;
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
     address _holder)
   public view returns(uint256) {
     require(_totalProfit > 0);
     require(_totalBalance > 0);
     require(isHolder(_holder));

     uint256 _balance = balanceOf(_holder);
     uint256 _profit = (_balance.mul(_totalProfit)).div(_totalBalance);
     return _profit;
   }
}
