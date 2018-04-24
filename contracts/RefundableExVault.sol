pragma solidity ^0.4.20;


import "zeppelin-solidity/contracts/crowdsale/distribution/utils/RefundVault.sol";
import "./RAXToken.sol";


contract RefundableExVault is RefundVault {
  mapping (address => uint256) public depositedRAX;

  RAXToken raxToken;

  /*
   * @param _token RAXToken
   * @param _wallet Vault address
   */
  function RefundableExVault(RAXToken _token, address _wallet)
  RefundVault(_wallet) {
    raxToken = _token;
  }

  /*
   * @param investor Investor address
   */
  function depositRAX(address _sender, uint256 _amount) onlyOwner public {
    require(state == State.Active);

    depositedRAX[_sender] = depositedRAX[_sender].add(_amount);
    raxToken.transferFrom(_sender, this, _amount);
  }

  function close() onlyOwner public {
    super.close();

    uint256 _amount = raxToken.balanceOf(this);
    raxToken.transfer(wallet, _amount);
  }

  /*
   * @param investor Investor address
   */
  function refund(address _investor) public {
    super.refund(_investor);

    uint256 _value = depositedRAX[_investor];
    depositedRAX[_investor] = 0;
    if (_value > 0) {
      raxToken.transfer(_investor, _value);
    }
  }
}
