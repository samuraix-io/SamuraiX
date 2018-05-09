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
    _checkTransferTarget(_to, false);

    super.transfer(_to, _value);
    return true;
  }

  function transferSpecial(address _to, uint256 _value) public returns(bool) {
    _checkTransferTarget(_to, true);

    super.transfer(_to, _value);
    return true;
  }

  function transferFrom(address _from, address _to, uint256 _value) public returns(bool) {
    _checkTransferTarget(_to, false);

    super.transferFrom(_from, _to, _value);
    return true;
  }

  function transferFromSpecial(address _from, address _to, uint256 _value) public returns(bool) {
    _checkTransferTarget(_to, true);

    super.transferFrom(_from, _to, _value);
    return true;
  }

  function _checkTransferTarget(address _to, bool _isSpecial) internal {
    require(regUsers.isUserRegistered(_to));

    if (!isHolder(_to)) {
      if (_isSpecial) {
        this.addSpecialHolder(_to);
      } else {
        this.addNormalHolder(_to);
      }
    }
  }

  function calculateProfit(uint256 _totalProfit, address _holder) public view returns(uint256);

  function getID() public view returns(uint256) {
    return id;
  }
}
