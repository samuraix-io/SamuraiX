pragma solidity ^0.4.24;

import "./base-token/StandardToken.sol";
import "./registry/HasRegistry.sol";


contract CompliantToken is Manageable, StandardToken {
  string constant HAS_PASSED_KYC_AML = "hasPassedKYC/AML";
  // Addresses can also be blacklisted, preventing them from sending or receiving
  // PAT tokens. This can be used to prevent the use of PAT by bad actors in
  // accordance with law enforcement.
  string constant IS_BLACKLISTED = "isBlacklisted";

  event WipeBlacklistedAccount(address indexed account, uint256 balance);

  modifier onlyIfNotBlacklisted(address _addr) {
    require(!registry.hasAttribute(_addr, IS_BLACKLISTED));
    _;
  }

  modifier onlyIfBlacklisted(address _addr) {
    require(registry.hasAttribute(_addr, IS_BLACKLISTED));
    _;
  }

  modifier onlyIfPassedKYC_AML(address _addr) {
    require(registry.hasAttribute(_addr, HAS_PASSED_KYC_AML));
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
    onlyIfPassedKYC_AML(_from)
    onlyIfPassedKYC_AML(_to)
  {
    super._transfer(_from, _to, _value);
  }

  // Destroy the tokens owned by a blacklisted account
  function wipeBlacklistedAccount(
    address _account
  )
    public
    onlyManager
    onlyIfBlacklisted(_account)
  {
    uint256 _oldValue = balanceOf(_account);
    balances.setBalance(_account, 0);
    totalSupply_ = totalSupply_.sub(_oldValue);
    emit WipeBlacklistedAccount(_account, _oldValue);
  }
}
