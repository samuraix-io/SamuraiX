pragma solidity ^0.4.11;

import '../../contracts/RAXToken.sol';

contract RAXTokenMock is RAXToken {

    function setTokensRemaining(uint256 _num) public {
        require(_num <= TOTAL_TOKENS);
        totalSupply_ = TOTAL_TOKENS.sub(_num);
    }

}
