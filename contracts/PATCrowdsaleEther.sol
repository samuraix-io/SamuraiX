pragma solidity ^0.4.18;

import './PATCrowdsaleBase.sol';

/**
 * @title PAT token ether crowdsale.
 * @dev PATCrowdsaleEther is a crowdsale that accepts ether to buy PAT tokens.
 **/
contract PATCrowdsaleEther is PATCrowdsaleBase {
  /**
   * @dev Fallback function to receive ether.
   */
  function () external payable {
    buyTokensUsingEther(msg.sender);
  }

  /**
   * @dev Using ether to buy tokens.
   * @param _beneficiary Who got the tokens.
   */
  function buyTokensUsingEther(address _beneficiary) public payable whenNotPaused {
    uint256 _weiAmount = msg.value;
    uint256 _tokens = _buyTokens(_beneficiary, _weiAmount);
    _forwardFundsEther();

    emit TokenPurchase(msg.sender, _beneficiary, _weiAmount, _tokens);
  }
}
