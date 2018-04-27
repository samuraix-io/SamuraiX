pragma solidity ^0.4.20;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './PATToken.sol';

/**
 * @title Manage fees.
 * @dev This contract allows some asset (PAT token) manager to distribute listing fee
 * to the SamuraiX platform, or to withdraw reserve funds to a beneficiary wallet.
 **/
contract ManageFees is Ownable {
  using SafeMath for uint256;

  struct TokenFees {
    uint256 listingFeeTokens;
    uint256 reserveFundTokens;
  }
  address public samuraiXWallet;

  mapping(address => TokenFees) tokenFees;

  /**
   * Event for token fees distributed logging.
   * @param _token Token address that has fees to be paid.
   * @param _from This contract address (who hold the used funds).
   * @param _beneficiary Who got the tokens.
   * @param _amount Amount of tokens.
   */
  event DistributedTokenFees(PATToken _token, address _from, address _beneficiary, uint256 _amount);

  /**
   * @param _samuraiXWallet Wallet address of the SamuraiX platform.
   */
  function ManageFees(address _samuraiXWallet)
  Ownable()
  {
    samuraiXWallet = _samuraiXWallet;
  }

  /**
   * @dev Sets amount of tokens which will be used to pay token fees.
   * @param _token Token address that has fees to be paid.
   * @param _listingFeeTokens Amount of tokens to be paid for listing fee.
   * @param _reserveFundTokens Amount of tokens for reserving.
   */
  function setTokenFees(PATToken _token, uint256 _listingFeeTokens, uint256 _reserveFundTokens) public {
    require(msg.sender == _token.owner());
    require(tx.origin == owner);

    TokenFees storage _tokenFees = tokenFees[_token];
    _tokenFees.listingFeeTokens = _listingFeeTokens;
    _tokenFees.reserveFundTokens = _reserveFundTokens;
  }

  /**
   * @dev Changes wallet address of the SamuraiX platform. This address must
   * already be in the registered users list.
   * @param _addr A new wallet address to update.
   */
  function setSammuraiXWallet(address _addr) public onlyOwner {
    require(_addr != 0x0);
    require(_addr != samuraiXWallet);

    samuraiXWallet = _addr;
  }

  /**
   * @dev Distributes tokens to the SamuraiX platform for paying the asset listing fee.
   * @param _token Token address that has fees to be paid.
   */
  function distributeListingFee(PATToken _token) external {
    require(_token.isManager(msg.sender));

    TokenFees storage _tokenFees = tokenFees[_token];
    uint256 _amount = _tokenFees.listingFeeTokens;
    require(_amount > 0);

    _tokenFees.listingFeeTokens = 0;
    this._distributeTokens(_token, samuraiXWallet, _amount);
  }

  /**
   * @dev Distributes tokens to a specified wallet for withdrawing the reserve funds.
   * @param _token Token address that has fees to be paid.
   * @param _beneficiary Who got the tokens.
   * @param _amount Amount of tokens to withdraw.
   */
  function withdrawReserveFund(PATToken _token, address _beneficiary, uint256 _amount) external {
    require(_token.isManager(msg.sender));
    require(_beneficiary != 0x0);
    require(_amount > 0);

    TokenFees storage _tokenFees = tokenFees[_token];
    require(_tokenFees.reserveFundTokens >= _amount);

    _tokenFees.reserveFundTokens = (_tokenFees.reserveFundTokens).sub(_amount);
    this._distributeTokens(_token, _beneficiary, _amount);
  }

  /**
   * @dev Executed when a paying for asset listing fee or a withdrawing reserve funds has been validated.
   * @param _token Token address that has fees to be paid.
   * @param _beneficiary Who got the tokens.
   * @param _amount amount of tokens to be distributed.
   */
  function _distributeTokens(PATToken _token, address _beneficiary, uint256 _amount) {
    require(msg.sender == address(this));
    require(_beneficiary != 0x0);
    require(_amount > 0);

    _token.transfer(_beneficiary, _amount);

    emit DistributedTokenFees(_token, this, _beneficiary, _amount);
  }
}
