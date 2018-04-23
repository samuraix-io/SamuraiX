pragma solidity ^0.4.20;

import "./DistributableToken.sol";
import "./AssetInfo.sol";


contract ManageableToken is AssetInfo, DistributableToken {
  address samuraiXWallet;
  uint8 listingFeeRate;
  bool listingFeeWithdrawn = false;
  uint8 reserveFundRate;
  bool reserveFundWithdrawn = false;

  event DistributedToken(DistributableToken _token, address _beneficiary, uint256 _amount);

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

  function distributeListingFee() public onlyManager {
    require(!listingFeeWithdrawn);

    listingFeeWithdrawn = true;
    _distributeTokens(listingFeeRate, samuraiXWallet);
  }

  function withdrawReserveFund(address _beneficiary) public onlyManager {
    require(!reserveFundWithdrawn);

    reserveFundWithdrawn = true;
    _distributeTokens(reserveFundRate, _beneficiary);
  }

  function getListingFeeRate() public view returns(uint8) {
    return listingFeeRate;
  }

  function getReserveFundRate() public view returns(uint8) {
    return reserveFundRate;
  }

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

  function getTotalTokens() public view returns(uint256);
}
