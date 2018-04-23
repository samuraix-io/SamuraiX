pragma solidity ^0.4.20;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';


library CoinExchange {
  using SafeMath for uint256;

  function weiToToken(uint256 _wei, uint256 _ethToTokenRate) internal pure returns(uint256) {
    return(_wei.mul(_ethToTokenRate)).div(10**18);
  }

  function tokenToWei(uint256 _tokens, uint256 _ethToTokenRate) internal pure returns(uint256) {
    return(_tokens.mul(10**18)).div(_ethToTokenRate);
  }

  function ethPATRateToWei(uint256 _ethPATRate) internal pure returns(uint256) {
    return(_ethPATRate.mul(10**18));
  }
}
