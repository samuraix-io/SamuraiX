pragma solidity ^0.4.24;

import './access/Manageable.sol';
import './base-token/MintableToken.sol';
import './utils/AddressSet.sol';


/**
 * @title Traceable token.
 * @dev This contract allows a sub-class token contract to run a loop through its all holders.
 **/
contract TraceableToken is Manageable, MintableToken {
  AddressSet private holderSet;

  constructor() public {
    holderSet = new AddressSet();
  }

  /**
   * @dev Throws if called by any account that is neither a manager nor the owner.
   */
  modifier canTrace() {
    require(isManager(msg.sender) || msg.sender == owner);
    _;
  }

  /**
   * @dev Mints tokens to a beneficiary address. The target address should be
   * added to the token holders list if needed.
   * @param _to Who got the tokens.
   * @param _amount Amount of tokens.
   */
  function mint(
    address _to,
    uint256 _amount
  )
    public
    hasMintPermission
    canMint
    returns (bool)
  {
    bool suc = super.mint(_to, _amount);
    if (suc) holderSet.add(_to);

    return suc;
  }

  function transfer(address _to, uint256 _value) public returns (bool) {
    _checkTransferTarget(_to);

    super.transfer(_to, _value);
    return true;
  }

  function transferFrom(
    address _from,
    address _to,
    uint256 _value
  )
    public
    returns (bool)
  {
    _checkTransferTarget(_to);

    super.transferFrom(_from, _to, _value);
    return true;
  }

  function getTheNumberOfHolders() public canTrace view returns (uint256) {
    return holderSet.getTheNumberOfElements();
  }

  function getHolder(uint256 _index) public canTrace view returns (address) {
    return holderSet.elementAt(_index);
  }

  function _checkTransferTarget(address _to) internal {
    if (!holderSet.contains(_to)) {
      holderSet.add(_to);
    }
  }
}
