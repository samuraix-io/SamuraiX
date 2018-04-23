pragma solidity ^0.4.11;

import '../../contracts/PreSale.sol';

contract PreSaleMock is PreSale {

    function PreSaleMock(MintableToken _token, uint256 _startTime, uint256 _endTime, address _ethWallet)
    PreSale(_token, _startTime, _endTime, _ethWallet, rate)
    {
    }

    function setTokensRemaining(uint256 _num) public {
        // totalSupply should not matter for PreSale as the presale cap is much lower than TOTAL_TOKENS
        require(_num <= PRESALE_TOKEN_CAP);
        tokensSold = PRESALE_TOKEN_CAP - _num;
    }

}
