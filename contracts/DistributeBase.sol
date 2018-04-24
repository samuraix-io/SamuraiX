pragma solidity ^0.4.20;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./DistributableToken.sol";
import "./PATToken.sol";

/**
 * @title DistributeBase.
 * @dev This is a base contract for distributing profits earned from managing a real asset
 * to its all holders.
 */
contract DistributeBase is Ownable {
  using SafeMath for uint256;

  /**
   * Event for profit distributed logging.
   * @param _coinId Unique ID of coin which is used to forward income to token holders.
   *        ETH = 0, RAX = 1, PAT > 1.
   * @param _token Address of token contract which its token holders will be distribute profits.
   * @param _holders Holders' addresses.
   * @param _profits Relevant profits to distribute to holders.
   */
  event ProfitDistributed(uint256 _coinId, DistributableToken _token, address[] _holders, uint256[] _profits);

  /**
   * @dev A base function for distribute profit to all holders of the real asset.
   * This function will call _approveIncomes in Sub-classes for actually forwarding the money.
   * @param _token Address of token contract which its token holders will be distribute profits.
   * @param _totalProfit Total profit to distribute to all holders.
   */
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

  /**
   * @dev Sub-classes must override to actually forward the money to all token holders.
   * @param _token Address of token contract which its token holders will be distribute profits.
   * @param _holders Holders' addresses.
   * @param _profits Relevant profits to distribute to holders.
   */
  function _approveIncomes(DistributableToken _token, address[] _holders, uint256[] _profits) internal;
}
