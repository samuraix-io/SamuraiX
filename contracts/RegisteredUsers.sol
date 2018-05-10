pragma solidity ^0.4.20;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

/**
 * @title Registered users.
 * @dev This contract allows to check whether a specified user is registered or not.
 **/
contract RegisteredUsers is Ownable {
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
