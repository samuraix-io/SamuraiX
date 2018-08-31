pragma solidity ^0.4.24;

import './access/Manageable.sol'
import './base-token/BurnableToken.sol';
import './TraceableToken.sol';


/**
 * @title BurnableExToken.
 * @dev Extension for the BurnableToken contract, to support
 * some manager to enforce burning all tokens of all holders.
 **/
contract BurnableExToken is Manageable, BurnableToken, TraceableToken {

  event Burn(
    address indexed manager,
    address indexed burner,
    uint256 value,
    string note
  );

  /**
   * @dev Burns all remaining tokens of all holders.
   * @param _note a note that the manager can attach.
   */
  function burnAll(string _note) external onlyManager {
    uint256 _holdersCount = getTheNumberOfHolders();
    for (uint256 _i = 0; _i < _holdersCount; ++_i) {
      address _holder = getHolder(_i);
      uint256 _balance = balanceOf(_holder);
      if (_balance == 0) continue;

      _burn(_holder, _balance, _note);
    }
  }

  /**
   * @dev Burns a specific amount of tokens.
   * @param _burner Who has tokens to be burned.
   * @param _value The amount of tokens to be burned.
   * @param _note a note that the manager can attach.
   */
  function _burn(
    address _burner,
    uint256 _value,
    string _note
  )
    internal
    onlyManager
  {
    _burn(_burner, _value);

    emit Burn(msg.sender, _burner, _value, _note);
  }
}
