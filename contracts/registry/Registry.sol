pragma solidity ^0.4.24;

import "../ownership/ClaimableEx.sol";
import "../utils/BitManipulation.sol";
import "./Attribute.sol";
import "./DefaultRegistryAccessManager.sol";
import "./RegistryAccessManager.sol";


contract Registry is ClaimableEx {
  using BitManipulation for uint256;

  struct AttributeData {
    uint256 value;
  }

  // Stores arbitrary attributes for users. An example use case is an ERC20
  // token that requires its users to go through a KYC/AML check - in this case
  // a validator can set an account's "hasPassedKYC/AML" attribute to 1 to indicate
  // that account can use the token. This mapping stores that value (1, in the
  // example) as well as which validator last set the value and at what time,
  // so that e.g. the check can be renewed at appropriate intervals.
  mapping(address => AttributeData) private attributes;

  // The logic governing who is allowed to set what attributes is abstracted as
  // this accessManager, so that it may be replaced by the owner as needed.
  RegistryAccessManager public accessManager;

  event SetAttribute(
    address indexed who,
    Attribute.AttributeType attribute,
    bool enable,
    string notes,
    address indexed adminAddr
  );

  event SetManager(
    address indexed oldManager,
    address indexed newManager
  );

  constructor() public {
    accessManager = new DefaultRegistryAccessManager();
  }

  // Writes are allowed only if the accessManager approves
  function setAttribute(
    address _who,
    Attribute.AttributeType _attribute,
    string _notes
  )
    public
  {
    bool _canWrite = accessManager.confirmWrite(
      _who,
      _attribute,
      msg.sender
    );
    require(_canWrite);

    // Get value of previous attribute before setting new attribute
    uint256 _tempVal = attributes[_who].value;

    attributes[_who] = AttributeData(
      _tempVal.setBit(Attribute.toUint256(_attribute))
    );

    emit SetAttribute(_who, _attribute, true, _notes, msg.sender);
  }

  function clearAttribute(
    address _who,
    Attribute.AttributeType _attribute,
    string _notes
  )
    public
  {
    bool _canWrite = accessManager.confirmWrite(
      _who,
      _attribute,
      msg.sender
    );
    require(_canWrite);

    // Get value of previous attribute before setting new attribute
    uint256 _tempVal = attributes[_who].value;

    attributes[_who] = AttributeData(
      _tempVal.clearBit(Attribute.toUint256(_attribute))
    );

    emit SetAttribute(_who, _attribute, false, _notes, msg.sender);
  }

  // Returns true if the uint256 value stored for this attribute is non-zero
  function hasAttribute(
    address _who,
    Attribute.AttributeType _attribute
  )
    public
    view
    returns (bool)
  {
    return attributes[_who].value.checkBit(Attribute.toUint256(_attribute));
  }

  // Returns the exact value of the attribute, as well as its metadata
  function getAttributes(
    address _who
  )
    public
    view
    returns (uint256)
  {
    AttributeData memory _data = attributes[_who];
    return _data.value;
  }

  function setManager(RegistryAccessManager _accessManager) public onlyOwner {
    emit SetManager(accessManager, _accessManager);
    accessManager = _accessManager;
  }
}
