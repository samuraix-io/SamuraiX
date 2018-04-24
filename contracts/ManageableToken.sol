pragma solidity ^0.4.20;

import "./DistributableToken.sol";
import "./AssetInfo.sol";

/**
 * @title Manageable token.
 * @dev DistributableToken added with manageable transactions and real asset information.
 **/
contract ManageableToken is AssetInfo, DistributableToken {
  address samuraiXWallet;
  uint8 listingFeeRate;
  bool listingFeeWithdrawn = false;
  uint8 reserveFundRate;
  bool reserveFundWithdrawn = false;

  /**
   * Event for token distributed logging.
   * @param _token Token to be distributed.
   * @param _beneficiary Who got the tokens.
   * @param _amount Amount of tokens distributed.
   */
  event DistributedToken(DistributableToken _token, address _beneficiary, uint256 _amount);

  /**
   * @param _regUsers Address of contract which will check whether some user is registered or not.
   * @param _id An unique identifier of this token.
   * @param _samuraiXWallet Wallet address of the SamuraiX platform.
   * @param _managers Managers of this token.
   * @param _fixedDocsLink A link to a zip file containing fixed legal documents of a real asset associated with this token.
   * @param _fixedDocsHash Hash value of the zip file containing fixed legal documents of the asset.
   * @param _varDocsLink A link to a zip file containing running documents of the asset.
   * @param _varDocsHash Hash value of the zip file containing running documents of the asset.
   * @param _listingFeeRate Percentage of tokens for paying asset listing fee.
   * @param _reserveFundRate Percentage of tokens for reserving funds.
   */
  function ManageableToken(
    RegisteredUsers _regUsers,
    uint256 _id,
    address _samuraiXWallet,
    address[] _managers,
    string _fixedDocsLink,
    string _fixedDocsHash,
    string _varDocsLink,
    string _varDocsHash,
    uint8 _listingFeeRate,
    uint8 _reserveFundRate
  )
  AssetInfo(_managers, _fixedDocsLink, _fixedDocsHash, _varDocsLink, _varDocsHash)
  DistributableToken(_regUsers, _id) {
    require(_reserveFundRate > 0);
    require(_listingFeeRate > 0);

    samuraiXWallet = _samuraiXWallet;
    listingFeeRate = _listingFeeRate;
    reserveFundRate = _reserveFundRate;
  }

  /**
   * @dev Distributes tokens to the SamuraiX platform for paying the asset listing fee.
   */
  function distributeListingFee() public onlyManager {
    require(!listingFeeWithdrawn);

    listingFeeWithdrawn = true;
    _distributeTokens(listingFeeRate, samuraiXWallet);
  }

  /**
   * @dev Distributes tokens to a specified wallet as withdrawing the reserving funds.
   * @param _beneficiary Who got the tokens.
   */
  function withdrawReserveFund(address _beneficiary) public onlyManager {
    require(!reserveFundWithdrawn);

    reserveFundWithdrawn = true;
    _distributeTokens(reserveFundRate, _beneficiary);
  }

  /**
   * @dev Gets percentage of tokens for paying asset listing fee.
   * @return percentage of tokens for paying asset listing fee.
   */
  function getListingFeeRate() public view returns(uint8) {
    return listingFeeRate;
  }

  /**
   * @dev Gets percentage of tokens for reserving funds.
   * @return percentage of tokens for reserving funds.
   */
  function getReserveFundRate() public view returns(uint8) {
    return reserveFundRate;
  }

  /**
   * @dev Executed when a paying for asset listing fee or a withdrawing reserving funds has been validated.
   * @param _rate Percentage of tokens to be distributed.
   * @param _beneficiary Who got the tokens.
   */
  function _distributeTokens(uint8 _rate, address _beneficiary) internal {
    require(_beneficiary != 0x0);
    require(_rate > 0);

    uint256 _totalTokens = getTotalTokens();
    uint256 _amount = (uint256(_rate).mul(_totalTokens)).div(100);
    require(totalSupply_.add(_amount) <= _totalTokens);

    mint(_beneficiary, _amount);
    if (!isHolder(_beneficiary)) {
      addHolder(_beneficiary);
    }

    emit DistributedToken(this, _beneficiary, _amount);
  }

  /**
   * @dev Sub-classes must override to supply an ability to get the total amount of this token.
   * @return Total amount of this token.
   */
  function getTotalTokens() public view returns(uint256);
}
