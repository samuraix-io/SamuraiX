pragma solidity ^0.4.24;

import "./StandardToken.sol";


/**
 * @title Mintable token
 * @dev Simple ERC20 Token example, with mintable token creation
 **/
contract MintableToken is StandardToken {
  event Mint(address indexed to, uint256 value);
  event MintFinished();

  bool public mintingFinished = false;

  modifier canMint() {
    require(!mintingFinished);
    _;
  }

  modifier hasMintPermission() {
    require(msg.sender == owner);
    _;
  }

  /**
   * @dev Function to mint tokens
   * @param _to The address that will receive the minted tokens.
   * @param _value The amount of tokens to mint.
   * @return A boolean that indicates if the operation was successful.
   */
  function mint(
    address _to,
    uint256 _value
  )
    public
    hasMintPermission
    canMint
    returns (bool)
  {
    _mint(_to, _value);

    emit Mint(_to, _value);
    return true;
  }

  /**
   * @dev Function to stop minting new tokens.
   * @return True if the operation was successful.
   */
  function finishMinting() public onlyOwner canMint returns (bool) {
    mintingFinished = true;
    emit MintFinished();
    return true;
  }
}
