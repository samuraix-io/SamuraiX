pragma solidity ^0.4.11;

import './PATCrowdsaleBase.sol';

/**
 * @title PAT token RAX crowdsale.
 * @dev PATCrowdsaleRAX is a crowdsale that accepts RAX to buy PAT tokens.
 **/
contract PATCrowdsaleRAX is PATCrowdsaleBase {
  event TokenPurchaseRAX(address indexed _purchaser, address indexed _beneficiary, uint256 _value, uint256 _amount);

  /**
   * @dev Using RAX to buy tokens.
   * Investor must call raxToken.approve() to allow this contract
   * has privilege to forward a specified amount of RAX tokens to
   * the crowdsale's vault.
   * @param _beneficiary Who got the tokens.
   */
  function buyTokensUsingRaxApprove(address _beneficiary) external whenNotPaused {
    uint256 _raxAmount = raxToken.allowance(msg.sender, this);
    uint256 _weiAmount = _raxToWei(_raxAmount);
    uint256 _tokens = _buyTokens(_beneficiary, _weiAmount);
    _forwardFundsRAX(_raxAmount);
    emit TokenPurchaseRAX(msg.sender, _beneficiary, _raxAmount, _tokens);
  }

  /**
   * @dev Using RAX to buy tokens.
   * Investor must transfer a specified amount of RAX tokens to
   * this contract before. The SamuraiX server will observe
   * transfer events to detect automatically then it calls this function
   * to mint PAT tokens to the investor and transfer received
   * RAX tokens to the crowdsale's vault.
   * @param _beneficiary Who got the tokens.
   * @param _raxAmount Amount of RAX tokens to exchange.
   */
  function buyTokensUsingRaxTransfer(address _beneficiary, uint256 _raxAmount) onlyOwner external whenNotPaused {
    uint256 _weiAmount = _raxToWei(_raxAmount);
    uint256 _tokens = _buyTokens(_beneficiary, _weiAmount);
    this._transferFundsRAX(_beneficiary, _raxAmount);
    emit TokenPurchaseRAX(_beneficiary, _beneficiary, _raxAmount, _tokens);
  }
}
