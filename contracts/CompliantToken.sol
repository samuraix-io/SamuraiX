pragma solidity ^0.4.24;

import "./base-token/StandardToken.sol";
import "./registry/HasRegistry.sol";


contract CompliantToken is HasRegistry, StandardToken {
  // Addresses can also be blacklisted, preventing them from sending or receiving
  // PAT tokens. This can be used to prevent the use of PAT by bad actors in
  // accordance with law enforcement.

  modifier onlyIfNotBlacklisted(address _addr) {
    require(
      !registry.hasAttribute(
        _addr,
        Attribute.AttributeType.IS_BLACKLISTED
      )
    );
    _;
  }

  modifier onlyIfBlacklisted(address _addr) {
    require(
      registry.hasAttribute(
        _addr,
        Attribute.AttributeType.IS_BLACKLISTED
      )
    );
    _;
  }

  modifier onlyIfPassedKYC_AML(address _addr) {
    require(
      registry.hasAttribute(
        _addr,
        Attribute.AttributeType.HAS_PASSED_KYC_AML
      )
    );
    _;
  }

  function _mint(
    address _to,
    uint256 _value
  )
    internal
    onlyIfPassedKYC_AML(_to)
    onlyIfNotBlacklisted(_to)
  {
    super._mint(_to, _value);
  }

  // transfer and transferFrom both call this function, so check blacklist here.
  function _transfer(
    address _from,
    address _to,
    uint256 _value
  )
    internal
    onlyIfNotBlacklisted(_from)
    onlyIfNotBlacklisted(_to)
    onlyIfPassedKYC_AML(_to)
  {
    super._transfer(_from, _to, _value);
  }
}
