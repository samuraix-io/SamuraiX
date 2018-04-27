pragma solidity ^0.4.11;

import './PATCrowdsaleRAX.sol';
import './PATCrowdsaleEther.sol';
import './PATToken.sol';
import './ManageListingFee.sol';
import './ManageReserveFunds.sol';


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
    uint8 listingFeeRate;
    uint8 reserveFundRate;
    ManageListingFee manageListingFee;
    ManageReserveFunds manageReserveFunds;
    bool managedTokensMinted = false;

    function PATSale(
      RegisteredUsers _regUsers,
      RAXToken _raxToken,
      MintableToken _token,
      ManageListingFee _manageListingFee,
      ManageReserveFunds _manageReserveFunds,
      uint256 _startTime,
      uint256 _endTime,
      address _ethWallet,
      uint256 _minCap,
      uint256 _maxCap,
      uint256 _ethPATRate,
      uint256 _ethRAXRate,
      uint8 _listingFeeRate,
      uint8 _reserveFundRate
    )
    PATCrowdsaleBase(
      _regUsers,
      _raxToken,
      _token,
      _startTime,
      _endTime,
      _ethWallet,
      _minCap.tokenToWei(_ethPATRate))
    {
      require(_minCap <= _maxCap);

      maxCap = _maxCap;
      minCap = _minCap;
      listingFeeRate = _listingFeeRate;
      reserveFundRate = _reserveFundRate;
      ethPATRate = _ethPATRate;
      ethRAXRate = _ethRAXRate;

      manageListingFee = _manageListingFee;
      manageReserveFunds = _manageReserveFunds;

      _checkRates();
    }

    function mintManagedTokens() onlyOwner external {
      require(!managedTokensMinted);
      managedTokensMinted = true;

      uint256 _totalTokens = getTokenContract().getTotalTokens();
      uint256 _listingFeeTokens = _totalTokens.mul(listingFeeRate).div(100);
      uint256 _reserveFundTokens = _totalTokens.mul(reserveFundRate).div(100);

      getTokenContract().mint(manageListingFee, _listingFeeTokens);
      manageListingFee.setTokens(getTokenContract(), _listingFeeTokens);

      getTokenContract().mint(manageReserveFunds, _reserveFundTokens);
      manageReserveFunds.setTokens(getTokenContract(), _reserveFundTokens);
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

    function _checkRates() view internal {
      uint256 _totalTokens = getTokenContract().getTotalTokens();
      uint256 _saleRate = (maxCap.mul(100)).div(_totalTokens);
      uint8 _totalPer = uint8(_saleRate) + listingFeeRate + reserveFundRate;
      require(uint8(100) == _totalPer);
    }

    function _weiToPAT(uint256 _wei) view internal returns(uint256) {
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

    function _raxToWei(uint256 _amount) view internal returns(uint256) {
      require(_amount > 0);

      return _amount.tokenToWei(ethRAXRate);
    }
}
