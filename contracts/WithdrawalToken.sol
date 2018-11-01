pragma solidity ^0.4.24;

import "./base-token/BurnableToken.sol";


// This allows a token to treat transfer(redeemAddress, value) as burn(value).
// This is useful for users of standard wallet programs which have transfer
// functionality built in but not the ability to burn.
contract WithdrawalToken is BurnableToken {
  address public constant redeemAddress = 0xfacecafe01facecafe02facecafe03facecafe04;

  function _transfer(address _from, address _to, uint256 _value) internal {
    if (_to == redeemAddress) {
      burn(_value, '');
    } else {
      super._transfer(_from, _to, _value);
    }
  }

  // StandardToken's transferFrom doesn't have to check for _to != redeemAddress,
  // but we do because we redirect redeemAddress transfers to burns, but
  // we do not redirect transferFrom
  function _transferFrom(
    address _from,
    address _to,
    uint256 _value,
    address _spender
  ) internal {
    require(_to != redeemAddress, "_to is redeem address");

    super._transferFrom(_from, _to, _value, _spender);
  }
}
