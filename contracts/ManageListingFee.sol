pragma solidity ^0.4.20;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './PATToken.sol';
import './ManageFunds.sol';

/**
 * @title Manage listing fee.
 * @dev This contract allows some asset (PAT token) manager to distribute
 * listing fee to the SamuraiX platform.
 **/
contract ManageListingFee is ManageFunds {
  using SafeMath for uint256;

  address public samuraiXWallet;

  /**
   * @param _samuraiXWallet Wallet address of the SamuraiX platform.
   */
  function ManageListingFee(address _samuraiXWallet)
  Ownable()
  {
    samuraiXWallet = _samuraiXWallet;
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
   * @param _token Token contract address.
   */
  function distributeListingFee(PATToken _token) external {
    require(_token.isManager(msg.sender));
    require(tokens[_token] > 0);
    require(!isLocked(_token));

    uint256 _amount = tokens[_token];
    tokens[_token] = 0;
    this._distributeFunds(_token, msg.sender, samuraiXWallet, _amount);
  }
}
