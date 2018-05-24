pragma solidity ^0.4.18;

import './PATCrowdsaleRAX.sol';
import './PATCrowdsaleEther.sol';
import './PATToken.sol';
import './ManageListingFee.sol';
import './ManageReserveFunds.sol';


/**
 * @title PAT token sale.
 * @dev PATSale is:
 *   - minCap and maxCap are specified as parameters.
 *   - refundable.
 *   - reserves a specified amount of tokens for paying asset listing fee.
 *   - reserves a specified amount of tokens for reserving funds.
 *   - reserve tokens are pre-minted to two relevant contracts.
 *   - any unregistered users can not buy tokens.
 *   - 0.1 ether minimum purchase amount.
 *   - supports using RAX to buy tokens.
 **/
contract PATSale is PATCrowdsaleEther, PATCrowdsaleRAX {
    using SafeMath for uint256;
    using CoinExchange for uint256;

    uint256 public constant TOTAL_CAP = 100 * (10**6) * (10 ** uint256(18)); // 100 million tokens
    uint256 public maxCap;
    uint256 public minCap;
    uint256 public minPurchaseAmt = 100 finney;
    uint256 public ethPATRate;
    uint256 public ethRAXRate;
    uint8 public listingFeeRate;
    uint8 public reserveFundRate;
    ManageListingFee manageListingFee;
    ManageReserveFunds manageReserveFunds;
    bool public managedTokensMinted = false;

    /**
     * @param _regUsers A contract to check whether an account is registered or not.
     * @param _raxToken RAX token contract address.
     * @param _token PAT token contract address.
     * @param _manageListingFee A contract to receive pre-mint tokens for paying asset listing fee.
     * @param _manageReserveFunds A contract to receive pre-mint tokens for reserving funds.
     * @param _startTime Start date.
     * @param _endTime End data.
     * @param _ethWallet A wallet address to receive sales proceeds if crowdsale is successful.
     * @param _minCap Minimum cap.
     * @param _maxCap Maximum cap.
     * @param _ethPATRate Number of token units a buyer gets per Ether.
     * @param _ethRAXRate Number of RAX token units a buyer gets per Ether.
     * @param _listingFeeRate Percentage of tokens for paying asset listing fee.
     * @param _reserveFundRate Percentage of tokens for reserving funds.
     */
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

    /**
     * @dev Pre-mints tokens for managing purpose. This amount of tokens
     * will be used by a token manager to pay asset listing fee or to withdraw
     * reserving funds to a beneficiary address.
     */
    function mintManagedTokens() onlyOwner external {
      require(!managedTokensMinted);
      managedTokensMinted = true;

      uint256 _totalTokens = _getTokenContract().getTotalTokens();
      uint256 _listingFeeTokens = _totalTokens.mul(listingFeeRate).div(100);
      uint256 _reserveFundTokens = _totalTokens.mul(reserveFundRate).div(100);

      _getTokenContract().mint(manageListingFee, _listingFeeTokens);
      manageListingFee.setTokens(_getTokenContract(), _listingFeeTokens);

      _getTokenContract().mint(manageReserveFunds, _reserveFundTokens);
      manageReserveFunds.setTokens(_getTokenContract(), _reserveFundTokens);
    }

    /**
     * @dev Sets minimum purchase amount.
     * @param _wei Wei amount.
     */
    function setMinPurchaseAmt(uint256 _wei) onlyOwner public {
      require(_wei >= 0);
      minPurchaseAmt = _wei;
    }

    /**
     * @dev Gets the number of remaining tokens.
     * @return The number of remaining tokens.
     */
    function tokensRemaining() view public returns(uint256) {
      return maxCap.sub(tokensSold);
    }

    /*
     * internal functions
     */

    /*
     * @dev Unlocks manageable funds when crowdsale ends.
     */
    function finalization() internal {
      manageListingFee.unlock(_getTokenContract());
      manageReserveFunds.unlock(_getTokenContract());

      super.finalization();
    }

     /**
      * @dev Checks whether sale rate and reserve rate are valid.
      */
    function _checkRates() view internal {
      uint256 _totalTokens = _getTokenContract().getTotalTokens();
      require(maxCap < _totalTokens);
      require(listingFeeRate > 0 && reserveFundRate > 0);

      uint256 _saleRate = (maxCap.mul(100)).div(_totalTokens);
      uint8 _totalPer = uint8(_saleRate) + listingFeeRate + reserveFundRate;
      require(uint8(100) == _totalPer);
    }

    /**
    * @dev Exchanges from Wei to PAT token.
    * @param _wei Amount of Wei to exchange.
    * @return The number of PAT token units exchanged.
    */
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

    /**
    * @dev Exchanges from RAT token to Wei.
    * @param _amount Amount of RAT token units.
    * @return Amount of Wei exchanged.
    */
    function _raxToWei(uint256 _amount) view internal returns(uint256) {
      require(_amount > 0);

      return _amount.tokenToWei(ethRAXRate);
    }
}
