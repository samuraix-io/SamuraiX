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
  RAXToken public raxToken;

  /*
   * @dev Constructor, creates RefundableExVault.
   * @param _token Address of RAX token contract.
   * @param _goal Funding goal.
   */
  function RefundableExCrowdsale(RAXToken _token, uint256 _goal)
  RefundableCrowdsale(_goal)
  public {
    exVault = new RefundableExVault(_token, wallet);
    raxToken = _token;
  }

  /*
   * @dev Gets address of the vault.
   * @return Vault address.
   */
  function getVaultAddress() public view returns(address) {
    return address(exVault);
  }

  /**
   * @dev Investors can claim refunds here if crowdsale is unsuccessful.
   */
  function claimRefund() public {
    refund(msg.sender);
  }

  /**
   * @dev Forces refunding to investor if crowdsale is unsuccessful.
   * @param _investor Investor address.
   */
  function refund(address _investor) public {
    require(isFinalized);
    require(!goalReached());

    var (_weiAmount, _raxAmount) = exVault.getBalance(_investor);
    if (_weiAmount > 0) {
      exVault.refund(_investor);
    }
    if (_raxAmount > 0) {
      exVault.refundRAX(_investor);
    }
  }

  /**
   * @dev vault finalization task, called when owner calls finalize()
   */
  function finalization() internal {
    if (goalReached()) {
      exVault.close();
    } else {
      exVault.enableRefunds();
    }
  }

  /*
   * @dev Forwards RAX tokens from the investor to the vault.
   * @param _amount Amount of tokens to forward.
   */
  function _forwardFundsRAX(uint256 _amount) internal {
    address _investor = msg.sender;
    raxToken.transferFrom(_investor, exVault, _amount);
    exVault.depositRAX(_investor, _amount);
  }

  /*
   * @dev Transfers RAX tokens from the crowdsale wallet to the vault.
   * The crowdsale received this amount of tokens from the investor directly.
   * @param _investor Investor address.
   * @param _amount Amount of tokens to transfer.
   */
  function _transferFundsRAX(address _investor, uint256 _amount) internal {
    raxToken.transfer(exVault, _amount);
    exVault.depositRAX(_investor, _amount);
  }

  /*
   * @dev Forwards Ether from the investor to the vault.
   */
  function _forwardFundsEther() internal {
    exVault.deposit.value(msg.value)(msg.sender);
  }
}
