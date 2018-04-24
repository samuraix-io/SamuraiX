pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/crowdsale/distribution/RefundableCrowdsale.sol";
import "./RefundableExVault.sol";


/*
 * @title RefundableExCrowdsale
 * @dev Extension of RefundableCrowdsale contract that adds a funding goal, and
 * the possibility of users getting a refund if goal is not met.
 * Uses a RefundVault as the crowdsale's vault.
 */
contract RefundableExCrowdsale is RefundableCrowdsale {
  // refund vault used to hold funds while crowdsale is running
  RefundableExVault public exVault;

  /*
   * @dev Constructor, creates RefundVault.
   * @param _goal Funding goal
   */
  function RefundableExCrowdsale(RAXToken _token, uint256 _goal)
  RefundableCrowdsale(_goal)
  public {
    exVault = new RefundableExVault(_token, wallet);
  }

  function getVaultAddress() public view returns(address) {
    return address(exVault);
  }

  function _forwardFundsRAX(uint256 _amount) internal {
    exVault.depositRAX(msg.sender, _amount);
  }

  function _forwardFundsEther() internal {
    exVault.deposit.value(msg.value)(msg.sender);
  }
}
