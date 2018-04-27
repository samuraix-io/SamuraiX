pragma solidity ^0.4.11;

import './PATCrowdsaleBase.sol';


contract PATCrowdsaleRAX is PATCrowdsaleBase {
  event TokenPurchaseRAX(address indexed _purchaser, address indexed _beneficiary, uint256 _value, uint256 _amount);

  function buyTokensUsingRaxApprove(address _beneficiary) external whenNotPaused {
    uint256 _raxAmount = raxToken.allowance(msg.sender, this);
    uint256 _weiAmount = _raxToWei(_raxAmount);
    uint256 _tokens = _buyTokens(_beneficiary, _weiAmount);
    _forwardFundsRAX(_raxAmount);
    emit TokenPurchaseRAX(msg.sender, _beneficiary, _raxAmount, _tokens);
  }

  function buyTokensUsingRaxTransfer(address _beneficiary, uint256 _raxAmount) onlyOwner external whenNotPaused {
    uint256 _weiAmount = _raxToWei(_raxAmount);
    uint256 _tokens = _buyTokens(_beneficiary, _weiAmount);
    _transferFundsRAX(_beneficiary, _raxAmount);
    emit TokenPurchaseRAX(_beneficiary, _beneficiary, _raxAmount, _tokens);
  }
}
