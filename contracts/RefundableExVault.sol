pragma solidity ^0.4.20;


import "zeppelin-solidity/contracts/crowdsale/distribution/utils/RefundVault.sol";
import "./RAXToken.sol";

/**
 * @title Refundable extended vault.
 * @dev RefundVault added with supporting RAX tokens in action.
 * This contract is used for storing funds while a crowdsale
 * is in progress. Supports refunding the money if crowdsale fails,
 * and forwarding it if crowdsale is successful.
 */
contract RefundableExVault is RefundVault {
  mapping (address => uint256) public depositedRAX;

  RAXToken raxToken;

  /*
   * @param _token Address of RAX token contract.
   * @param _wallet Address for forwarding the money if the crowdsale is successful.
   */
  function RefundableExVault(RAXToken _token, address _wallet)
  RefundVault(_wallet) {
    raxToken = _token;
  }

  /**
   * @dev Stores RAX tokens while the crowdsale is in progress.
   * @param _investor Investor address.
   */
  function depositRAX(address _sender, uint256 _amount) onlyOwner public {
    require(state == State.Active);

    depositedRAX[_sender] = depositedRAX[_sender].add(_amount);
    raxToken.transferFrom(_sender, this, _amount);
  }

  /**
   * @dev Closes this vault and forwards the money if crowdsale is successful.
   */
  function close() onlyOwner public {
    super.close();

    uint256 _amount = raxToken.balanceOf(this);
    raxToken.transfer(wallet, _amount);
  }

  /**
   * @dev Refunds the money if crowdsale fails.
   * @param _investor Investor address.
   */
  function refund(address _investor) public {
    super.refund(_investor);

    uint256 _value = depositedRAX[_investor];
    depositedRAX[_investor] = 0;
    if (_value > 0) {
      raxToken.transfer(_investor, _value);
    }
  }
}
