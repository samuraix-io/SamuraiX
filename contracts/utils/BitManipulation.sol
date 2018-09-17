pragma solidity ^0.4.24;

library BitManipulation {
  uint256 constant internal ONE = uint256(1);

  function setBit(uint256 _num, uint256 _pos) internal pure returns (uint256) {
    return _num | (ONE << _pos);
  }

  function clearBit(uint256 _num, uint256 _pos) internal pure returns (uint256) {
    return _num & ~(ONE << _pos);
  }

  function toggleBit(uint256 _num, uint256 _pos) internal pure returns (uint256) {
    return _num ^ (ONE << _pos);
  }

  function checkBit(uint256 _num, uint256 _pos) internal pure returns (bool) {
    return (_num >> _pos & ONE == ONE);
  }
}
