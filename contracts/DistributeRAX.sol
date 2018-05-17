pragma solidity ^0.4.20;

import "./DistributeBase.sol";
import "./RAXToken.sol";


contract DistributeRAX is DistributeBase {
  RAXToken raxToken;

  /**
   * @param _regUsers A contract to check whether an account is registered or not.
   */
  function DistributeRAX(RegisteredUsers _regUsers, RAXToken _raxToken)
  DistributeBase(_regUsers) {
    raxToken = _raxToken;
  }

  function distributeProfit(DistributableToken _token) external {
    uint256 _totalProfit = raxToken.allowance(msg.sender, this);
    super._distributeProfit(_token, _totalProfit);
  }

  function _approveIncomes(DistributableToken _token, address[] _holders, uint256[] _profits) internal {
    require(_holders.length > 0 && _holders.length == _profits.length);

    uint256 _count = _holders.length;
    address _sender = msg.sender;
    for (uint256 i = 0; i < _count; ++i) {
      raxToken.transferFrom(_sender, _holders[i], _profits[i]);
    }

    uint256 _coinId = raxToken.getID();
    emit ProfitDistributed(_coinId, _token, _holders, _profits);
  }
}
