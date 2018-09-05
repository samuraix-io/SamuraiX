pragma solidity ^0.4.24;

import "./access/Manageable.sol";
import "./base-token/StandardToken.sol";


/**
 * @title TokenWithFees.
 * @dev This contract allows for transaction fees to be assessed on transfer.
 **/
contract TokenWithFees is Manageable, StandardToken {
  uint256 public transferFeeNumerator = 0;
  uint256 public transferFeeDenominator = 10000;
  // All transaction fees are paid to this address.
  address public beneficiary;

  event ChangeWallet(address indexed addr);
  event ChangeFees(uint256 transferFeeNumerator,
                   uint256 transferFeeDenominator);

  constructor(address _wallet) public {
    beneficiary = _wallet;
  }

  // transfer and transferFrom both call this function, so pay fee here.
  // E.g. if A transfers 1000 tokens to B, B will receive 999 tokens,
  // and the system wallet will receive 1 token.
  function _transfer(address _from, address _to, uint256 _value) internal {
    uint256 _fee = _payFee(_from, _value, _to);
    uint256 _remaining = _value.sub(_fee);
    super._transfer(_from, _to, _remaining);
  }

  function _payFee(
    address _payer,
    uint256 _value,
    address _otherParticipant
  )
    internal
    returns (uint256)
  {
    // This check allows accounts to be whitelisted and not have to pay transaction fees.
    bool _shouldBeFree = (
      registry.hasAttribute(_payer, Attribute.AttributeType.NO_FEES) ||
      registry.hasAttribute(_otherParticipant, Attribute.AttributeType.NO_FEES)
    );
    if (_shouldBeFree) {
      return 0;
    }

    uint256 _fee = _value.mul(transferFeeNumerator).div(transferFeeDenominator);
    if (_fee > 0) {
      super._transfer(_payer, beneficiary, _fee);
    }
    return _fee;
  }

  function checkTransferFee(uint256 _value) public view returns (uint256) {
    return _value.mul(transferFeeNumerator).div(transferFeeDenominator);
  }

  function changeFees(
    uint256 _transferFeeNumerator,
    uint256 _transferFeeDenominator
  )
    public
    onlyManager
  {
    require(_transferFeeNumerator < _transferFeeDenominator);
    transferFeeNumerator = _transferFeeNumerator;
    transferFeeDenominator = _transferFeeDenominator;

    emit ChangeFees(transferFeeNumerator, transferFeeDenominator);
  }

  /**
   * @dev Change address of the wallet where the fees will be sent to.
   * @param _beneficiary The new wallet address.
   */
  function changeWallet(address _beneficiary) public onlyManager {
    require(_beneficiary != address(0), "new wallet cannot be 0x0");
    beneficiary = _beneficiary;

    emit ChangeWallet(_beneficiary);
  }
}
