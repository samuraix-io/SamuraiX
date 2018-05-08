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

  /**
   * Event for RAX refunded logging.
   * @param _beneficiary Who got the tokens.
   * @param _amount Amount of tokens.
   */
  event RAXRefunded(address indexed _beneficiary, uint256 _amount);

  /*
   * @param _token Address of RAX token contract.
   * @param _wallet Address for forwarding the money if the crowdsale is successful.
   */
  function RefundableExVault(RAXToken _token, address _wallet)
  RefundVault(_wallet) {
    raxToken = _token;
  }

  /*
   * @dev Changes a wallet address to receive sales proceeds if crowdsale is successful.
   * @param _wallet A new wallet address.
   */
  function setWallet(address _wallet) onlyOwner public {
    require(_wallet != 0x0);

    wallet = _wallet;
  }

  /**
   * @dev Stores RAX tokens while the crowdsale is in progress.
   * @param _investor Investor address.
   */
  function depositRAX(address _investor, uint256 _amount) onlyOwner public {
    require(state == State.Active);

    depositedRAX[_investor] = depositedRAX[_investor].add(_amount);
  }

  /**
   * @dev Gets balance of a specified investor.
   * @param _investor Investor address.
   * @return _wei Wei amount.
   * @return _rax RAX amount.
   */
  function getBalance(address _investor) onlyOwner view public returns(uint256 _wei, uint256 _rax) {
    return (deposited[_investor], depositedRAX[_investor]);
  }

  /**
   * @dev Closes this vault and forwards the money if crowdsale is successful.
   */
  function close() onlyOwner public {
    super.close();

    uint256 _amount = raxToken.balanceOf(this);
    if (_amount > 0) {
      raxToken.transfer(wallet, _amount);
    }
  }

  /**
   * @dev Refunds RAX tokens if crowdsale fails.
   * @param _investor Investor address.
   */
  function refundRAX(address _investor) public {
    require(state == State.Refunding);

    uint256 _value = depositedRAX[_investor];
    depositedRAX[_investor] = 0;
    if (_value > 0) {
      raxToken.transfer(_investor, _value);
      RAXRefunded(_investor, _value);
    }
  }
}
