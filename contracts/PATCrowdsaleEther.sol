pragma solidity ^0.4.11;

import './PATCrowdsaleBase.sol';


contract PATCrowdsaleEther is PATCrowdsaleBase {
  function () external payable {
    buyTokensUsingEther(msg.sender);
  }

  // over-ridden low level token purchase function so that we
  // can control the token-per-wei exchange rate dynamically
  function buyTokensUsingEther(address _beneficiary) public payable whenNotPaused {
    uint256 _weiAmount = msg.value;
    uint256 _tokens = _buyTokens(_beneficiary, _weiAmount);
    _forwardFunds();

    emit TokenPurchase(msg.sender, _beneficiary, _weiAmount, _tokens);
  }
}
