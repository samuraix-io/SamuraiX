pragma solidity ^0.4.20;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./DistributableToken.sol";
import "./PATToken.sol";
import './RegisteredUsers.sol';

/**
 * @title DistributeBase.
 * @dev This is a base contract for distributing profits earned from managing a real asset
 * to its all holders.
 */
contract DistributeBase is Ownable {
  using SafeMath for uint256;

  RegisteredUsers public regUsers;

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
   * @param _regUsers A contract to check whether an account is registered or not.
   */
  function DistributeBase(RegisteredUsers _regUsers) {
    regUsers = _regUsers;
  }

  /**
   * @dev A base function for distribute profit to all normal holders of the real asset.
   * This function will call _approveIncomes in Sub-classes for
   * actually forwarding the money. If total shares of the holders is less
   * than the total profit, the remainder will be send back to the msg.sender.
   * @param _token Address of token contract which its token normal holders will be distribute profits.
   * @param _totalProfit Total profit to distribute.
   */
  function _distributeProfit(DistributableToken _token, uint256 _totalProfit) internal {
    require(_totalProfit > 0);

    var _holdersCount = _token.getTheNumberOfHolders();
    var (_normalCount, _totalBalance) = _token.totalBalanceOfNormalHolders();
    address[] memory _holders = new address[](_normalCount);
    uint256[] memory _profits = new uint256[](_normalCount);
    uint256 _totalShare = 0;

    for (uint256 _i = 0; _i < _holdersCount; ++_i) {
      address _holder = _token.getHolderAddress(_i);
      if (!_token.isNormalHolder(_holder)) continue;

      uint256 _profit = _token.calculateProfit(_totalProfit, _totalBalance, _holder);
      _holders[_i] = _holder;
      _profits[_i] = _profit;
      _totalShare = _totalShare.add(_profit);
    }

    require(_totalShare <= _totalProfit);

    _approveIncomes(_token, _holders, _profits);

    uint256 _remain = _totalProfit.sub(_totalShare);
    if (_remain > 0) {
      _sendRemainder(_remain);
    }
  }

  /**
   * @dev Sub-classes must override to actually forward the money to all token holders.
   * @param _token Address of token contract which its token holders will be distribute profits.
   * @param _holders Holders' addresses.
   * @param _profits Relevant profits to distribute to holders.
   */
  function _approveIncomes(DistributableToken _token, address[] _holders, uint256[] _profits) internal;

  /**
   * @dev Sub-classes must override to actually send the remainder
   * back to the msg.sender of distributeProfit function.
   * @param _amount Amount of the remainder.
   */
  function _sendRemainder(uint256 _amount) internal;
}
