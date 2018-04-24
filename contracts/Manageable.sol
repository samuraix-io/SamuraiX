pragma solidity ^0.4.20;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title Manageable.
 * @dev This contract has an array of manager addresses, and provides basic authorization control
 * functions, this simplifies the implementation of "manager permissions".
 */
contract Manageable is Ownable {
  address[] managers;

  /**
   * @param _managers Managers of this contract.
   */
  function Manageable(address[] _managers) {
    uint256 _len = _managers.length;
    for (uint256 i = 0; i < _len; ++i) {
      managers.push(_managers[i]);
    }
  }

  /**
   * @dev Throws if called by any account who is not in the managers list.
   */
  modifier onlyManager() {
    require(isManager(msg.sender));
    _;
  }

  /**
   * @dev Checks whether a specified account is in the managers list or not.
   * @param _sender Account to check.
   * @return true if the account is a manager, otherwise false.
   */
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

  /**
   * @dev Adds a specified account into the managers list.
   * @param _manager Address of the new manager.
   */
  function addManager(address _manager) internal onlyOwner {
    require(_manager != 0x0);

    managers.push(_manager);
  }

  /**
   * @dev Gets address of a manager at a specified index in the managers list.
   * @param _index Index of the manager to retrieve.
   * @return Address of the relevant manager.
   */
  function getManager(uint256 _index) public view returns(address) {
    require(_index < managers.length);

    return managers[_index];
  }

  /**
   * @dev Gets the number of managers of this contract.
   * @return The number of managers.
   */
  function getTheNumberOfManagers() public view returns(uint256) {
    return managers.length;
  }
}
