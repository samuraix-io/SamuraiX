pragma solidity ^0.4.24;

import "../registry/HasRegistry.sol";


/**
 * @title Manageable
 * @dev The Manageable contract provides basic authorization control functions
 * for managers. This simplifies the implementation of "manager permissions".
 */
contract Manageable is HasRegistry {
  /**
   * @dev Throws if called by any account that is not in the managers list.
   */
  modifier onlyManager() {
    require(
      registry.hasAttribute(
        msg.sender,
        Attribute.AttributeType.ROLE_MANAGER
      )
    );
    _;
  }

  /**
   * @dev Getter to determine if address is a manager
   */
  function isManager(address _operator) public view returns (bool) {
    return registry.hasAttribute(
      _operator,
      Attribute.AttributeType.ROLE_MANAGER
    );
  }
}
