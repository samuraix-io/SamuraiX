pragma solidity ^0.4.20;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';


library CoinExchange {
  using SafeMath for uint256;

  function weiToToken(uint256 _wei, uint256 _ethToTokenRate) internal pure returns(uint256) {
    return _wei.mul(_ethToTokenRate);
  }

  function tokenToWei(uint256 _tokens, uint256 _ethToTokenRate) internal pure returns(uint256) {
    return _tokens.div(_ethToTokenRate);
  }
}
