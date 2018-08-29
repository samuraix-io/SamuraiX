pragma solidity ^0.4.24;

import "./StandardToken.sol";


/**
 * @title Burnable Token
 * @dev Token that can be irreversibly burned (destroyed).
 **/
contract BurnableToken is StandardToken {
  event Burn(address indexed burner, uint256 value, string note);

  /**
   * @dev Burns a specific amount of tokens.
   * @param _value The amount of token to be burned.
   * @param _note a note that burner can attach.
   */
  function burn(uint256 _value, string _note) public returns (bool) {
    _burn(msg.sender, _value);

    emit Burn(msg.sender, _value, _note);
    return true;
  }
}
