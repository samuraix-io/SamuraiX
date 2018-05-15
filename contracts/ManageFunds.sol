pragma solidity ^0.4.20;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './PATToken.sol';

/**
 * @title Manage funds.
 * @dev This contract allows some asset (PAT token) manager to distribute
 * pre-mint tokens to a beneficiary wallet.
 **/
contract ManageFunds is Ownable {
  using SafeMath for uint256;

  mapping(address => uint256) tokens;

  mapping(address => bool) unlocked;

  /**
   * Event for funds distributed logging.
   * @param _token Token contract address.
   * @param _manager Manager address (who distributed the funds).
   * @param _beneficiary Who got the tokens.
   * @param _amount Amount of tokens.
   */
  event FundsDistributed(PATToken _token, address _manager, address _beneficiary, uint256 _amount);

  /**
   * @dev Sets amount of tokens which some token manager can use to distribute later.
   * @param _token Token contract address.
   * @param _amount Amount of tokens.
   */
  function setTokens(PATToken _token, uint256 _amount) public {
    require(msg.sender == _token.owner());
    require(tx.origin == owner);
    require(_amount > 0);

    unlocked[_token] = false;
    tokens[_token] = _amount;
  }

  /**
   * @dev Checks whether manageable funds related to a specified token is locked or not.
   * @return True if manageable funds related to the token is locked, otherwise false.
   */
  function isLocked(PATToken _token) public view returns(bool) {
    return !unlocked[_token];
  }

  /**
   * @dev Unlocks manageable funds related to a specified token.
   * This function is called when a crowdsale ends so some token manager can distribute funds later.
   * @param _token Token contract address.
   */
  function unlock(PATToken _token) public {
    require(msg.sender == _token.owner());
    require(tx.origin == owner);

    unlocked[_token] = true;
  }

  /**
   * @dev Executed when a funds distributing has been validated.
   * @param _token Token contract address.
   * @param _manager Manager address (who distributed the funds).
   * @param _beneficiary Who got the tokens.
   * @param _amount Amount of tokens to be distributed.
   */
  function _distributeFunds(PATToken _token, address _manager, address _beneficiary, uint256 _amount) {
    require(msg.sender == address(this));
    require(_beneficiary != 0x0);
    require(_amount > 0);

    _token.transfer(_beneficiary, _amount);

    emit FundsDistributed(_token, _manager, _beneficiary, _amount);
  }
}
