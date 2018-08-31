pragma solidity ^0.4.24;

import "../registry/HasRegistry.sol";


/**
 * @title Operatable
 * @dev The Operatable contract provides basic authorization control functions
 * for operators. This simplifies the implementation of "operators permissions".
 */
contract Operatable is HasRegistry {
  string public constant ROLE_OPERATOR = "isOperator";

  /**
   * @dev Throws if called by any account that is not in the operators list.
   */
  modifier onlyOperator() {
    require(registry.hasAttribute(msg.sender, ROLE_OPERATOR));
    _;
  }

  /**
   * @dev Getter to determine if address is an operator
   */
  function isOperator(address _operator) public view returns (bool) {
    return registry.hasAttribute(_operator, ROLE_OPERATOR);
  }
}
