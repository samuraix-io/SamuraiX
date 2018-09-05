pragma solidity ^0.4.24;

import "./Registry.sol";
import "./Attribute.sol";


// Interface for logic governing write access to a Registry.
contract RegistryAccessManager {
  // Called when _admin attempts to write _value for _who's _attribute.
  // Returns true if the write is allowed to proceed.
  function confirmWrite(
    address _who,
    Attribute.AttributeType _attribute,
    address _admin
  )
    public returns (bool);
}
