pragma solidity ^0.4.24;

import "../zeppelin/contracts/math/SafeMath.sol";

import "../ClaimableEx.sol";


// A wrapper around the allowed mapping.
contract AllowanceSheet is ClaimableEx {
  using SafeMath for uint256;

  mapping (address => mapping (address => uint256)) private allowed;

  function addAllowance(
    address _holder,
    address _spender,
    uint256 _value
  )
    public
    onlyOwner
  {
    allowed[_holder][_spender] = allowed[_holder][_spender].add(_value);
  }

  function subAllowance(
    address _holder,
    address _spender,
    uint256 _value
  )
    public
    onlyOwner
  {
    allowed[_holder][_spender] = allowed[_holder][_spender].sub(_value);
  }

  function setAllowance(
    address _holder,
    address _spender,
    uint256 _value
  )
    public
    onlyOwner
  {
    allowed[_holder][_spender] = _value;
  }
}
