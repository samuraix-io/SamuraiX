pragma solidity ^0.4.20;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";


contract TokenHolders is Ownable {
  mapping(address => bool) holderCheck;
  address[] holders;

  function addHolder(address _holder) public returns(bool) {
    require(msg.sender == address(this) || msg.sender == owner);

    if (isHolder(_holder)) {
      return false;
    }

    holderCheck[_holder] = true;
    holders.push(_holder);
    return true;
  }

  function isHolder(address _addr) public view returns(bool) {
    return holderCheck[_addr];
  }

  function getHolderAddress(uint256 _index) public view returns(address) {
    require(_index < holders.length);

    return holders[_index];
  }

  function getTheNumberOfHolders() public view returns(uint256) {
    return holders.length;
  }
}
