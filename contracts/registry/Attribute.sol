pragma solidity ^0.4.24;

library Attribute {
  enum AttributeType {
    ROLE_MANAGER,                   // 0
    ROLE_OPERATOR,                  // 1
    IS_BLACKLISTED,                 // 2
    HAS_PASSED_KYC_AML,             // 3
    NO_FEES,                        // 4
    /* Additional user-defined later */
    USER_DEFINED
  }

  function toUint256(AttributeType _type) internal pure returns (uint256) {
    return uint256(_type);
  }
}
