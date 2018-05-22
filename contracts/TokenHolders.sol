pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title Token holders.
 * @dev This contract allows a sub-class token contract to store
 * and run a loop through its all holders.
 **/
contract TokenHolders is Ownable {
  mapping(address => bool) holderCheck;
  address[] holders;

  /**
   * @dev Adds a new account to the token holders list.
   * @param _holder Holder address.
   * @return True if succeed, otherwise false.
   */
  function addHolder(address _holder) public returns(bool) {
    require(msg.sender == address(this) || msg.sender == owner);

    if (isHolder(_holder)) {
      return false;
    }

    holderCheck[_holder] = true;
    holders.push(_holder);
    return true;
  }

  /**
   * @dev Checks whether an account is in the token holders list or not.
   * @param _addr Address to check.
   * @return True if the account is a token holder, otherwise false.
   */
  function isHolder(address _addr) public view returns(bool) {
    return holderCheck[_addr];
  }

  /**
   * @dev Gets a holder address at a specified index in the holders list.
   * @param _index Index.
   * @return A relevant holder address.
   */
  function getHolderAddress(uint256 _index) public view returns(address) {
    require(_index < holders.length);

    return holders[_index];
  }

  /**
   * @dev Gets the number of token holders.
   * @return The number of token holders.
   */
  function getTheNumberOfHolders() public view returns(uint256) {
    return holders.length;
  }
}
