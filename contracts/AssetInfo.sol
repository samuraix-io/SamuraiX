pragma solidity ^0.4.20;

import "./Manageable.sol";


contract AssetInfo is Manageable {
  string fixedDocsLink;
  string fixedDocsHash;
  string varDocsLink;
  string varDocsHash;

  event UpdateRunningDocuments(address _token, string _linkDoc, string _hashDoc);

  function AssetInfo (
    address[] _managers,
    string _fixedDocsLink,
    string _fixedDocsHash,
    string _varDocsLink,
    string _varDocsHash
  )
  Manageable(_managers)
  {
    fixedDocsLink = _fixedDocsLink;
    fixedDocsHash = _fixedDocsHash;
    varDocsLink = _varDocsLink;
    varDocsHash = _varDocsHash;
  }

  function getFixedDocuments() public view returns(string _link, string _hash) {
    return(fixedDocsLink, fixedDocsHash);
  }

  function changeRunningDocuments(string _link, string _hash) public onlyManager {
    varDocsLink = _link;
    varDocsHash = _hash;

    emit UpdateRunningDocuments(this, _link, _hash);
  }

  function getRunningDocuments() public view returns(string _link, string _hash) {
    return(varDocsLink, varDocsHash);
  }
}
