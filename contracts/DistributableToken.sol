pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/token/ERC20/MintableToken.sol';
import './TokenHolders.sol';
import './RegisteredUsers.sol';


contract DistributableToken is TokenHolders, MintableToken {
  uint256 id;
  RegisteredUsers public regUsers;

  function DistributableToken(RegisteredUsers _regUsers, uint256 _id) {
    id = _id;
    regUsers = _regUsers;
  }

  function transfer(address _to, uint256 _value) public returns(bool) {
    _checkTransferTarget(_to);

    super.transfer(_to, _value);
    return true;
  }

  function transferFrom(address _from, address _to, uint256 _value) public returns(bool) {
    _checkTransferTarget(_to);

    super.transferFrom(_from, _to, _value);
    return true;
  }

  function _checkTransferTarget(address _to) internal {
    if (!isHolder(_to)) {
      this.addHolder(_to);
    }
  }

  function calculateProfit(
    uint256 _totalProfit,
    uint256 _totalBalance,
    address _holder)
  public view returns(uint256);

  function isNormalHolder(address _addr) public view returns(bool) {
    require(isHolder(_addr));

    bool _isNormalUser = regUsers.isUserRegistered(_addr) && !regUsers.isSpecialUser(_addr);
    return (_isNormalUser && balanceOf(_addr) > 0);
  }

  function totalBalanceOfNormalHolders() public view returns(uint256, uint256) {
    uint256 _holdersCount = getTheNumberOfHolders();
    uint256 _normalCount = 0;
    uint256 _totalBalance = 0;

    for (uint256 _i = 0; _i < _holdersCount; ++_i) {
      address _holder = getHolderAddress(_i);
      if (!isNormalHolder(_holder)) continue;

      uint256 _balance = balanceOf(_holder);
      _normalCount = _normalCount.add(1);
      _totalBalance = _totalBalance.add(_balance);
    }

    return (_normalCount, _totalBalance);
  }

  function getID() public view returns(uint256) {
    return id;
  }
}
