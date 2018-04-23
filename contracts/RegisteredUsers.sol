pragma solidity ^0.4.20;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';


contract RegisteredUsers is Ownable {
  mapping(address => bool) users;

  function RegisteredUsers() {}

  function addRegisteredUser(address _user) public onlyOwner {
    users[_user] = true;
  }

  function isUserRegistered(address _user) public view returns(bool) {
    return users[_user];
  }
}
