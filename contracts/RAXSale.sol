pragma solidity ^0.4.11;

import './RAXCrowdsale.sol';
import './RAXToken.sol';


/*
 * RAXSale is
 *  - capped at 2 billion tokens
 *  - 0.1 ether minimum purchase amount
 *  - exchange rate varies with purchase amount
 */
contract RAXSale is RAXCrowdsale {
    using SafeMath for uint256;

    uint256 public constant PRESALE_TOKEN_CAP = 2 * (10**9) * (10 ** uint256(18)); // 2 billion tokens
    uint256 public minPurchaseAmt = 100 finney;

    function RAXSale(MintableToken _token, uint256 _startTime, uint256 _endTime, address _ethWallet, uint256 _rate)
    RAXCrowdsale(_token, _startTime, _endTime, _ethWallet, _rate)
    {
    }

    function setMinPurchaseAmt(uint256 _wei) onlyOwner public {
        require(_wei >= 0);
        minPurchaseAmt = _wei;
    }

    function tokensRemaining() constant public returns (uint256) {
        return PRESALE_TOKEN_CAP.sub(tokensSold);
    }

    /*
     * internal functions
     */
    function applyExchangeRate(uint256 _wei) constant internal returns (uint256) {
        // 1 ETH = 75,000 RAX
        require(_wei >= minPurchaseAmt);

        uint256 tokens;
        tokens = _wei.mul(75000);

        // check token cap
        uint256 remaining = tokensRemaining();
        require(remaining >= tokens);

        // if remaining tokens cannot be purchased (at min rate) then gift to current buyer ... it's a sellout!
        uint256 min_tokens_purchasable = minPurchaseAmt.mul(75000);
        remaining = remaining.sub(tokens);
        if(remaining < min_tokens_purchasable) {
            tokens = tokens.add(remaining);
        }
        return tokens;
    }

}
