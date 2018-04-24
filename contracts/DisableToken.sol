pragma solidity ^0.4.20;

import './ManageableToken.sol';

/**
 * @title Disable token.
 * @dev ManageableToken modified with disable transactions.
 **/
contract DisableToken is ManageableToken {
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

  function distributeListingFee() public whenEnable {
    super.distributeListingFee();
  }

  function withdrawReserveFund(address _beneficiary) public whenEnable {
    super.withdrawReserveFund(_beneficiary);
  }

  function transfer(address _to, uint256 _value) public whenEnable returns(bool) {
    return super.transfer(_to, _value);
  }

  function calculateProfit(uint256 _totalProfit, address _holder) public view whenEnable returns(uint256) {
    return super.calculateProfit(_totalProfit, _holder);
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
