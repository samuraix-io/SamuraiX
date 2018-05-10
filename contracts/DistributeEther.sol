pragma solidity ^0.4.20;

import "./DistributeBase.sol";


contract DistributeEther is DistributeBase {
  mapping(address => uint256) incomes;

  /**
   * @param _regUsers A contract to check whether an account is registered or not.
   */
  function DistributeEther(RegisteredUsers _regUsers)
  DistributeBase(_regUsers) {
  }

  function distributeProfit(DistributableToken _token) external payable {
    uint256 _totalProfit = msg.value;
    super._distributeProfit(_token, _totalProfit);
  }

  function doTransfer(address _beneficiary) public onlyOwner {
    require(incomes[_beneficiary] > 0);

    uint256 _value = incomes[_beneficiary];
    incomes[_beneficiary] = 0;
    _beneficiary.transfer(_value);
  }

  function withdraw(uint256 _value) external {
    require(_value > 0);
    require(incomes[msg.sender] >= _value);

    incomes[msg.sender] -= _value;
    msg.sender.transfer(_value);
  }

  function getIncome(address _holder) public view returns(uint256) {
    return incomes[_holder];
  }

  function _approveIncomes(DistributableToken _token, address[] _holders, uint256[] _profits) internal {
    require(_holders.length > 0 && _holders.length == _profits.length);

    uint256 _count = _holders.length;
    for(uint256 i = 0; i < _count; ++i) {
      if (_profits[i] == 0) continue;
      incomes[_holders[i]] = incomes[_holders[i]].add(_profits[i]);
    }

    emit ProfitDistributed(0, _token, _holders, _profits);
  }

  function _sendRemainder(uint256 _amount) internal {
    require(_amount > 0);

    msg.sender.transfer(_amount);
  }
}
