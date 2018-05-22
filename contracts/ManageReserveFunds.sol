pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './PATToken.sol';
import './ManageFunds.sol';

/**
 * @title Manage reserving funds.
 * @dev This contract allows some asset (PAT token) manager to
 * withdraw reserve funds to a beneficiary wallet.
 **/
contract ManageReserveFunds is ManageFunds {
  using SafeMath for uint256;

  function ManageReserveFunds()
  Ownable()
  {
  }

  /**
   * @dev Distributes tokens to a specified wallet for withdrawing the reserve funds.
   * @param _token Token contract address.
   * @param _beneficiary Who got the tokens.
   * @param _amount Amount of tokens to withdraw.
   */
  function withdrawReserveFunds(PATToken _token, address _beneficiary, uint256 _amount) external {
    require(_token.isManager(msg.sender));
    require(_beneficiary != 0x0);
    require(_amount > 0 && tokens[_token] >= _amount);
    require(!isLocked(_token));

    tokens[_token] = tokens[_token].sub(_amount);
    this._distributeFunds(_token, msg.sender, _beneficiary, _amount);
  }
}
