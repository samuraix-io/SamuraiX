pragma solidity ^0.4.11;

import './PATCrowdsaleRAX.sol';
import './PATCrowdsaleEther.sol';
import './PATToken.sol';
import './RegisteredUsers.sol';


/*
 * PATSale is
 *  - capped at 2 billion tokens
 *  - 0.1 ether minimum purchase amount
 *  - exchange rate varies with purchase amount
 */
contract PATSale is PATCrowdsaleEther, PATCrowdsaleRAX {
    using SafeMath for uint256;
    using CoinExchange for uint256;

    uint256 public constant TOTAL_CAP = 100 * (10**6) * (10 ** uint256(18)); // 100 million tokens
    uint256 public maxCap;
    uint256 public minCap;
    uint256 public minPurchaseAmt = 100 finney;
    uint256 public ethPATRate;
    uint256 public ethRAXRate;

    function PATSale(
      RegisteredUsers _regUsers,
      RAXToken _raxToken,
      MintableToken _token,
      uint256 _startTime,
      uint256 _endTime,
      address _ethWallet,
      uint256 _minCap,
      uint256 _maxCap,
      uint256 _ethPATRate,
      uint256 _ethRAXRate
    )
    PATCrowdsaleBase(
      _regUsers,
      _raxToken,
      _token,
      _startTime,
      _endTime,
      _ethWallet,
      _minCap
    ) public {
      require(_minCap <= _maxCap);

      uint256 _totalTokens = getTokenContract().getTotalTokens();
      uint256 _saleRate = (_maxCap.mul(100)).div(_totalTokens);

      uint256 _totalPer = _saleRate.add(uint256(getTokenContract().getListingFeeRate()));
      _totalPer = _totalPer.add(uint256(getTokenContract().getReserveFundRate()));
      require(100 == _totalPer);

      maxCap = _maxCap;
      minCap = _minCap;
      ethPATRate = _ethPATRate;
      ethRAXRate = _ethRAXRate;
    }

    function setMinPurchaseAmt(uint256 _wei) onlyOwner public {
      require(_wei >= 0);
      minPurchaseAmt = _wei;
    }

    function tokensRemaining() view public returns (uint256) {
      return maxCap.sub(tokensSold);
    }

    /*
     * internal functions
     */
    function weiToPAT(uint256 _wei) view internal returns (uint256) {
      require(_wei >= minPurchaseAmt);

      uint256 _tokens = _wei.weiToToken(ethPATRate);

      // check token cap
      uint256 _remaining = tokensRemaining();
      require(_remaining >= _tokens);

      // if remaining tokens cannot be purchased (at min rate) then gift to current buyer ... it's a sellout!
      uint256 _min_tokens_purchasable = minPurchaseAmt.weiToToken(ethPATRate);
      _remaining = _remaining.sub(_tokens);
      if(_remaining < _min_tokens_purchasable) {
          _tokens = _tokens.add(_remaining);
      }
      return _tokens;
    }

    function raxToWei(uint256 _amount) view internal returns(uint256) {
      require(_amount > 0);

      return _amount.tokenToWei(ethRAXRate);
    }
}
