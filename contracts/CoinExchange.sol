pragma solidity ^0.4.20;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';

/**
 * @title Coin exchanges.
 * @dev Exchanges a specified token to Wei and vice versa.
 */
library CoinExchange {
  using SafeMath for uint256;

  /**
  * @dev Exchanges from Wei to Token.
  * @param _wei Amount of Wei to exchange.
  * @param _ethToTokenRate Number of token units a buyer gets per Ether.
  * @return The number of token units exchanged.
  */
  function weiToToken(uint256 _wei, uint256 _ethToTokenRate) internal pure returns(uint256) {
    return _wei.mul(_ethToTokenRate);
  }

  /**
  * @dev Exchanges from Token to Wei.
  * @param _tokens Number of token units to exchange.
  * @param _ethToTokenRate Number of token units a buyer gets per Ether.
  * @return Amount of Wei exchanged.
  */
  function tokenToWei(uint256 _tokens, uint256 _ethToTokenRate) internal pure returns(uint256) {
    return _tokens.div(_ethToTokenRate);
  }
}
