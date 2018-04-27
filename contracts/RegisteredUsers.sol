pragma solidity ^0.4.20;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

/**
 * @title Registered users.
 * @dev This contract allows to check whether a specified user is registered or not.
 **/
contract RegisteredUsers is Ownable {
  mapping(address => bool) users;

  function RegisteredUsers() {}

  /**
   * @dev Adds a new registered user.
   * @param _user User address.
   */
  function addRegisteredUser(address _user) public onlyOwner {
    users[_user] = true;
  }

  /**
   * @dev Checks whether a specified user is registered or not.
   * @param _user User address to check.
   * @return True if the user is registered, otherwise false.
   */
  function isUserRegistered(address _user) public view returns(bool) {
    return users[_user];
  }
}
