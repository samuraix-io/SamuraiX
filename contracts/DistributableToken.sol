pragma solidity ^0.4.20;

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
    require(regUsers.isUserRegistered(_to));

    if (!isHolder(_to)) {
      this.addHolder(_to);
    }
  }

  function calculateProfit(
    uint256 _totalProfit,
    uint256 _totalBalance,
    address _holder)
  public view returns(uint256);

  function totalBalanceOfNormalHolders() public view returns(uint256) {
    uint256 _total = 0;
    uint256 _count = getTheNumberOfHolders();

    for (uint256 _i = 0; _i < _count; ++_i) {
      address _holder = getHolderAddress(_i);
      if (regUsers.isSpecialUser(_holder)) continue;

      uint256 _balance = balanceOf(_holder);
      _total = _total.add(_balance);
    }

    return _total;
  }

  function getID() public view returns(uint256) {
    return id;
  }
}
