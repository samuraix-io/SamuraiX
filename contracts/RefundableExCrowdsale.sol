pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/crowdsale/distribution/RefundableCrowdsale.sol";
import "./RefundableExVault.sol";


/*
 * @title Refundable extended crowdsale.
 * @dev Extension of RefundableCrowdsale contract that adds
 * the possibility of using RAX tokens.
 * Uses a RefundableExVault as the crowdsale's vault.
 */
contract RefundableExCrowdsale is RefundableCrowdsale {
  // refund vault used to hold funds while crowdsale is running
  RefundableExVault public exVault;

  /*
   * @dev Constructor, creates RefundableExVault.
   * @param _token Address of RAX token contract.
   * @param _goal Funding goal.
   */
  function RefundableExCrowdsale(RAXToken _token, uint256 _goal)
  RefundableCrowdsale(_goal)
  public {
    exVault = new RefundableExVault(_token, wallet);
  }

  /*
   * @dev Gets address of the vault.
   * @return Vault address.
   */
  function getVaultAddress() public view returns(address) {
    return address(exVault);
  }

  /*
   * @dev Forwards RAX tokens from the investor to the vault.
   * @param _investor Investor address.
   * @param _amount Amount of tokens to forward.
   */
  function _forwardFundsRAX(uint256 _amount) internal {
    exVault.depositRAX(msg.sender, _amount);
  }

  /*
   * @dev Forwards Ether from the investor to the vault.
   */
  function _forwardFundsEther() internal {
    exVault.deposit.value(msg.value)(msg.sender);
  }
}
