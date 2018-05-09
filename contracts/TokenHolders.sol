pragma solidity ^0.4.20;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title Token holders.
 * @dev This contract allows a sub-class token contract to store
 * and run a loop through its all holders.
 **/
contract TokenHolders is Ownable {
  mapping(address => bool) normalHolderCheck;
  mapping(address => bool) specialHolderCheck;
  address[] normalHolders;  // who can be distributed profit from real asset management
  address[] specialHolders;  // who can not earn profit from real asset management

  /**
   * @dev Adds a new account to the token normal holders list.
   * This account later can be distributed profit from real asset management.
   * @param _holder Holder address.
   * @return True if succeed, otherwise false.
   */
  function addNormalHolder(address _holder) public returns(bool) {
    require(msg.sender == address(this) || msg.sender == owner);

    if (isHolder(_holder)) {
      return false;
    }

    normalHolderCheck[_holder] = true;
    normalHolders.push(_holder);
    return true;
  }

  /**
   * @dev Adds a new account to the token special holders list.
   * This account can not earn profit from real asset management.
   * @param _holder Holder address.
   * @return True if succeed, otherwise false.
   */
  function addSpecialHolder(address _holder) public returns(bool) {
    require(msg.sender == address(this) || msg.sender == owner);

    if (isHolder(_holder)) {
      return false;
    }

    specialHolderCheck[_holder] = true;
    specialHolders.push(_holder);
    return true;
  }

  /**
   * @dev Checks whether an account is in the token holders list or not.
   * @param _addr Address to check.
   * @return True if the account is a token holder, otherwise false.
   */
  function isHolder(address _addr) public view returns(bool) {
    return specialHolderCheck[_addr] || normalHolderCheck[_addr];
  }

  /**
   * @dev Checks whether an account is in the token normal holders list or not.
   * @param _addr Address to check.
   * @return True if the account is a token normal holder, otherwise false.
   */
  function isNormalHolder(address _addr) public view returns(bool) {
    return normalHolderCheck[_addr];
  }

  /**
   * @dev Checks whether an account is in the token special holders list or not.
   * @param _addr Address to check.
   * @return True if the account is a token special holder, otherwise false.
   */
  function isSpecialHolder(address _addr) public view returns(bool) {
    return specialHolderCheck[_addr];
  }

  /**
   * @dev Gets a holder address at a specified index in the normal holders list.
   * @param _index Index.
   * @return A relevant holder address.
   */
  function getNormalHolderAddress(uint256 _index) public view returns(address) {
    require(_index < normalHolders.length);

    return normalHolders[_index];
  }

  /**
   * @dev Gets the number of token normal holders.
   * @return The number of token normal holders.
   */
  function getTheNumberOfNormalHolders() public view returns(uint256) {
    return normalHolders.length;
  }

  /**
   * @dev Gets a holder address at a specified index in the special holders list.
   * @param _index Index.
   * @return A relevant holder address.
   */
  function getSpecialHolderAddress(uint256 _index) public view returns(address) {
    require(_index < specialHolders.length);

    return specialHolders[_index];
  }

  /**
   * @dev Gets the number of token special holders.
   * @return The number of token special holders.
   */
  function getTheNumberOfSpecialHolders() public view returns(uint256) {
    return specialHolders.length;
  }
}
