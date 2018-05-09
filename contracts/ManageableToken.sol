pragma solidity ^0.4.20;

import "./DistributableToken.sol";
import "./AssetInfo.sol";

/**
 * @title Manageable token.
 * @dev DistributableToken added with manageable transactions and real asset information.
 **/
contract ManageableToken is AssetInfo, DistributableToken {
  bool enable = true;

  /**
   * @dev Throws if called when this token is disabled.
   */
  modifier whenEnable {
    require(enable == true);
    _;
  }

  /**
   * @dev Disable this token.
   */
  function disableToken() public onlyManager {
    enable = false;
  }

  /**
   * @dev Enable this token.
   */
  function enableToken() public onlyManager {
    enable = true;
  }

  function transfer(address _to, uint256 _value) public whenEnable returns(bool) {
    return super.transfer(_to, _value);
  }

  function transferSpecial(address _to, uint256 _value) public whenEnable returns(bool) {
    return super.transferSpecial(_to, _value);
  }

  function mint(address _to, uint256 _amount) onlyOwner canMint public whenEnable returns(bool) {
    return super.mint(_to, _amount);
  }

  function finishMinting() onlyOwner canMint public whenEnable returns(bool) {
    return super.finishMinting();
  }

  function transferFrom(address _from, address _to, uint256 _value) public whenEnable returns(bool) {
    return super.transferFrom(_from, _to, _value);
  }

  function transferFromSpecial(address _from, address _to, uint256 _value) public whenEnable returns(bool) {
    return super.transferFromSpecial(_from, _to, _value);
  }

  function approve(address _spender, uint256 _value) public whenEnable returns(bool) {
    return super.approve(_spender, _value);
  }

  function increaseApproval(address _spender, uint _addedValue) public whenEnable returns(bool) {
    return super.increaseApproval(_spender, _addedValue);
  }

  function decreaseApproval(address _spender, uint _subtractedValue) public whenEnable returns(bool) {
    return super.decreaseApproval(_spender, _subtractedValue);
  }
}
