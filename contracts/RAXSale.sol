pragma solidity ^0.4.11;

import './RAXCrowdsale.sol';
import './RAXToken.sol';


/**
 * @title RAX token sale.
 * @dev RAXSale is:
 *  - capped at 5 billion tokens.
 *  - 0.1 ether minimum purchase amount.
 *  - any unregistered users can not buy tokens.
 **/
contract RAXSale is RAXCrowdsale {
    using SafeMath for uint256;

    uint256 public constant MAX_CAP = 5 * (10**9) * (10 ** uint256(18)); // 50% of total tokens
    uint256 public minPurchaseAmt = 100 finney;
    uint256 public ethRAXRate;

    /**
     * @param _regUsers A contract to check whether an account is registered or not.
     * @param _token RAX token contract address.
     * @param _startTime Start date.
     * @param _endTime End data.
     * @param _ethWallet A wallet address to receive sales proceeds if crowdsale is successful.
     * @param _ethRAXRate Number of RAX token units a buyer gets per Ether.
     */
    function RAXSale(RegisteredUsers _regUsers, MintableToken _token, uint256 _startTime, uint256 _endTime, address _ethWallet, uint256 _ethRAXRate)
    RAXCrowdsale(_regUsers, _token, _startTime, _endTime, _ethWallet)
    {
        ethRAXRate = _ethRAXRate;
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
    function tokensRemaining() constant public returns (uint256) {
        return MAX_CAP.sub(tokensSold);
    }

    /*
     * internal functions
     */

    /**
     * @dev Exchanges from Wei to RAX token.
     * @param _wei Amount of Wei to exchange.
     * @return The number of token units exchanged.
     */
    function _applyExchangeRate(uint256 _wei) constant internal returns(uint256) {
        require(_wei >= minPurchaseAmt);

        uint256 tokens;
        tokens = _wei.mul(ethRAXRate);

        // check token cap
        uint256 remaining = tokensRemaining();
        require(remaining >= tokens);

        // if remaining tokens cannot be purchased (at min rate) then gift to current buyer ... it's a sellout!
        uint256 min_tokens_purchasable = minPurchaseAmt.mul(ethRAXRate);
        remaining = remaining.sub(tokens);
        if(remaining < min_tokens_purchasable) {
            tokens = tokens.add(remaining);
        }
        return tokens;
    }

}
