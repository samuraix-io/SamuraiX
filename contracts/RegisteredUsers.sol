pragma solidity ^0.4.20;

import 'zeppelin-solidity/contracts/ownership/HasNoEther.sol';
import 'zeppelin-solidity/contracts/ownership/HasNoTokens.sol';

import './ClaimableEx.sol';

/**
 * @title Registered users.
 * @dev This contract allows to check whether a specified user is registered or not.
 *  - allows the new owner to accept the ownership transfer, the owner can cancel the transfer if needed.
 *  - attempts to reject ERC20 token transfers to itself and allows token transfer out.
 *  - attempts to reject ether sent and allows any ether held to be transferred out.
 **/
contract RegisteredUsers is ClaimableEx, HasNoEther, HasNoTokens {
  mapping(address => bool) normalUsers;
  mapping(address => bool) specialUsers;

  function RegisteredUsers() {}

  /**
   * @dev Adds a new registered user.
   * @param _user User address.
   * @param _isSpecial Whether this user is special or not.
   * A special user is the one who can not earn profit from a real asset management.
   */
  function addRegisteredUser(address _user, bool _isSpecial) public onlyOwner {
    require(!isUserRegistered(_user));

    if (_isSpecial) {
      specialUsers[_user] = true;
    } else {
      normalUsers[_user] = true;
    }
  }

  /**
   * @dev Checks whether a specified user is registered or not.
   * @param _user User address to check.
   * @return True if the user is registered, otherwise false.
   */
  function isUserRegistered(address _user) public view returns(bool) {
    return normalUsers[_user] || specialUsers[_user];
  }

  /**
   * @dev Checks whether a specified user is special or not.
   * @param _user User address to check.
   * @return True if the user is special, otherwise false.
   */
  function isSpecialUser(address _user) public view returns(bool) {
    return specialUsers[_user];
  }

  /**
   * @dev Checks whether a specified user is normal or not.
   * @param _user User address to check.
   * @return True if the user is normal, otherwise false.
   */
  function isNormalUser(address _user) public view returns(bool) {
    return normalUsers[_user];
  }
}
