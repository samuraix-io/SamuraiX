pragma solidity ^0.4.11;

import './PATCrowdsaleBase.sol';


contract PATCrowdsaleRAX is PATCrowdsaleBase {
  event TokenPurchaseRAX(address indexed _purchaser, address indexed _beneficiary, uint256 _value, uint256 _amount);

  function buyTokensUsingRAX(address _beneficiary) external whenNotPaused onlyWhileOpen {
    uint256 _raxAmount = raxToken.allowance(msg.sender, this);
    uint256 _weiAmount = raxToWei(_raxAmount);
    uint256 _tokens = _buyTokens(_beneficiary, _weiAmount);
    _forwardFundsRAX(_raxAmount);
    emit TokenPurchaseRAX(msg.sender, _beneficiary, _raxAmount, _tokens);
  }
}
