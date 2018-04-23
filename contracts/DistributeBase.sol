pragma solidity ^0.4.20;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./DistributableToken.sol";
import "./PATToken.sol";


contract DistributeBase is Ownable {
  using SafeMath for uint256;

  event ProfitDistributed(uint256 _coinId, DistributableToken _token, address[] _holders, uint256[] _profits);

  function distributeProfit(DistributableToken _token, uint256 _totalProfit) {
    require(_totalProfit > 0);

    uint256 _holdersCount = _token.getTheNumberOfHolders();
    address[] memory _holders = new address[](_holdersCount);
    uint256[] memory _profits = new uint256[](_holdersCount);

    for (uint256 i = 0; i < _holdersCount; ++i) {
      address _holder = _token.getHolderAddress(i);
      uint256 _profit = _token.calculateProfit(_totalProfit, _holder);
      _profits[i] = _profit;
      _holders[i] = _holder;
    }

    _approveIncomes(_token, _holders, _profits);
  }

  function _approveIncomes(DistributableToken _token, address[] _holders, uint256[] _profits) internal;
}
