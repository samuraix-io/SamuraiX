pragma solidity ^0.4.24;

import './access/Manageable.sol';
import './base-token/BurnableToken.sol';
import './TraceableToken.sol';


/**
 * @title BurnableExToken.
 * @dev Extension for the BurnableToken contract, to support
 * some manager to enforce burning all tokens of all holders.
 **/
contract BurnableExToken is Manageable, BurnableToken, TraceableToken {

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
}
