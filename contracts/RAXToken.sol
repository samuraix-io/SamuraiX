pragma solidity ^0.4.11;

import 'zeppelin-solidity/contracts/token/ERC20/PausableToken.sol';
import 'zeppelin-solidity/contracts/ownership/HasNoTokens.sol';
import 'zeppelin-solidity/contracts/ownership/HasNoEther.sol';
import 'zeppelin-solidity/contracts/ownership/Contactable.sol';
import './DistributableToken.sol';


/**
 * @title RAX token.
 * @dev RAX is a ERC20 token that:
 *  - caps total number at 10 billion tokens.
 *  - can pause and unpause token transfer (and authorization) actions.
 *  - mints new tokens when purchased (rather than transferring tokens pre-granted to a holding account).
 *  - token holders can be distributed profit from asset manager.
 *  - attempts to reject ERC20 token transfers to itself and allows token transfer out.
 *  - attempts to reject ether sent and allows any ether held to be transferred out.
 **/
contract RAXToken is Contactable, HasNoTokens, HasNoEther, PausableToken, DistributableToken {
    string public constant name = "RAXToken";
    string public constant symbol = "RAX";

    uint8 public constant decimals = 18;
    uint256 public constant ONE_TOKENS = (10 ** uint256(decimals));
    uint256 public constant BILLION_TOKENS = (10**9) * ONE_TOKENS;
    uint256 public constant TOTAL_TOKENS = 10 * BILLION_TOKENS;

    /**
     * @param _regUsers A contract to check whether an account is registered or not.
     */
    function RAXToken(RegisteredUsers _regUsers)
    Contactable()
    HasNoTokens()
    HasNoEther()
    PausableToken()
    TokenHolders()
    DistributableToken(_regUsers, 1)
    {
        contactInformation = 'https://token.samuraix.io/';
    }

    /**
     * @dev Mints tokens to a beneficiary address. Capped by TOTAL_TOKENS.
     * @param _to Who got the tokens.
     * @param _amount Amount of tokens.
     */
    function mint(address _to, uint256 _amount) onlyOwner canMint public returns(bool) {
        require(totalSupply_.add(_amount) <= TOTAL_TOKENS);
        return super.mint(_to, _amount);
    }

    /**
     * @dev Allows the current owner to transfer control of the contract to a new owner.
     * @param _newOwner The address to transfer ownership to.
     */
    function transferOwnership(address _newOwner) onlyOwner public {
        // do not allow self ownership
        require(_newOwner != address(this));
        super.transferOwnership(_newOwner);
    }

    /**
     * @dev Calculates profit to distribute to a specified token normal holder.
     * @param _totalProfit Total profit.
     * @param _totalBalance Total tokens of normal holders.
     * @param _holder Token normal holder address.
     * @return Profit value relevant to the token holder.
     */
     function calculateProfit(
       uint256 _totalProfit,
       uint256 _totalBalance,
       address _holder)
     public view returns(uint256) {
       require(_totalProfit > 0);
       require(_totalBalance > 0);
       require(isHolder(_holder));

       uint256 _balance = balanceOf(_holder);
       uint256 _profit = (_balance.mul(_totalProfit)).div(_totalBalance);
       return _profit;
     }
}
