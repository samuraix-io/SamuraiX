pragma solidity ^0.4.24;

import "../zeppelin/contracts/math/SafeMath.sol";

import "./Registry.sol";
import "./RegistryAccessManager.sol";


contract DefaultRegistryAccessManager is RegistryAccessManager {
  function confirmWrite(
    address /*_who*/,
    Attribute.AttributeType _attribute,
    address _operator
  )
    public
    returns (bool)
  {
    Registry _client = Registry(msg.sender);
    if (_operator == _client.owner()) {
      return true;
    } else if (_client.hasAttribute(_operator, Attribute.AttributeType.ROLE_MANAGER)) {
      return (_attribute == Attribute.AttributeType.ROLE_OPERATOR);
    } else if (_client.hasAttribute(_operator, Attribute.AttributeType.ROLE_OPERATOR)) {
      return (_attribute != Attribute.AttributeType.ROLE_OPERATOR &&
              _attribute != Attribute.AttributeType.ROLE_MANAGER);
    }
  }
}
