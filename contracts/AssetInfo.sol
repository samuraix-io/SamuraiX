pragma solidity ^0.4.18;

import "./Manageable.sol";

/**
 * @title Asset information.
 * @dev Stores information about a specified real asset.
 */
contract AssetInfo is Manageable {
  string fixedDocsLink;
  string fixedDocsHash;
  string varDocsLink;
  string varDocsHash;

  /**
   * Event for updated running documents logging.
   * @param _token Token associated with this asset.
   * @param _linkDoc A new link of the newly updated file.
   * @param _hashDoc A new hash value corresponding to the newly updated file.
   */
  event UpdateRunningDocuments(address _token, string _linkDoc, string _hashDoc);

  /**
   * @param _managers Managers of this asset.
   * @param _fixedDocsLink A link to a zip file containing fixed legal documents of the asset.
   * @param _fixedDocsHash Hash value of the zip file containing fixed legal documents of the asset.
   * @param _varDocsLink A link to a zip file containing running documents of the asset.
   * @param _varDocsHash Hash value of the zip file containing running documents of the asset.
   */
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

  /**
   * @dev Gets information about where to find fixed legal documents of this asset.
   * @return _link A link to a zip file containing fixed legal documents of the asset.
   * @return _hash Hash value of the zip file.
   */
  function getFixedDocuments() public view returns(string _link, string _hash) {
    return(fixedDocsLink, fixedDocsHash);
  }

  /**
   * @dev Updates information about where to find new running documents of this asset.
   * @param _link A link to a zip file containing running documents of the asset.
   * @param _hash Hash value of the zip file.
   */
  function changeRunningDocuments(string _link, string _hash) public onlyManager {
    varDocsLink = _link;
    varDocsHash = _hash;

    emit UpdateRunningDocuments(this, _link, _hash);
  }

  /**
   * @dev Gets information about where to find running documents of this asset.
   * @return _link A link to a zip file containing running documents of the asset.
   * @return _hash Hash value of the zip file.
   */
  function getRunningDocuments() public view returns(string _link, string _hash) {
    return(varDocsLink, varDocsHash);
  }
}
