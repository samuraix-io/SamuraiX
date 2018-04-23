pragma solidity ^0.4.20;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";


contract Manageable is Ownable {
  address[] managers;

  function Manageable(address[] _managers) {
    uint256 _len = _managers.length;
    for (uint256 i = 0; i < _len; ++i) {
      managers.push(_managers[i]);
    }
  }

  modifier onlyManager() {
    require(isManager(msg.sender));
    _;
  }

  function isManager(address _sender) public view returns(bool) {
    bool _isManager = false;
    uint256 _len = managers.length;
    for (uint256 i = 0; i < _len; ++i) {
      if (_sender == managers[i]) {
        _isManager = true;
        break;
      }
    }

    return _isManager;
  }

  function addManager(address _manager) internal onlyOwner {
    require(_manager != 0x0);

    managers.push(_manager);
  }

  function getManager(uint256 _index) public view returns(address) {
    require(_index < managers.length);

    return managers[_index];
  }

  function getTheNumberOfManagers() public view returns(uint256) {
    return managers.length;
  }
}
