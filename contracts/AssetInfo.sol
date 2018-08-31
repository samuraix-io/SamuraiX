pragma solidity ^0.4.24;

import "./access/Manageable.sol";


/**
 * @title Asset information.
 * @dev Stores information about a specified real asset.
 */
contract AssetInfo is Manageable {
  string public fixedDocsLink;
  string public varDocsLink;

  /**
   * Event for updated running documents logging.
   * @param token Token associated with this asset.
   * @param oldLink Old link.
   * @param newLink New link.
   */
  event UpdateRunningDocuments(
    address token,
    string oldLink,
    string newLink
  );

  /**
   * @param _fixedDocsLink A link to a zip file containing fixed legal documents of the asset.
   * @param _varDocsLink A link to a zip file containing running documents of the asset.
   */
  constructor(string _fixedDocsLink, string _varDocsLink) public {
    fixedDocsLink = _fixedDocsLink;
    varDocsLink = _varDocsLink;
  }

  /**
   * @dev Updates information about where to find new running documents of this asset.
   * @param _link A link to a zip file containing running documents of the asset.
   */
  function changeRunningDocuments(string _link) public onlyManager {
    string memory _old = varDocsLink;
    varDocsLink = _link;

    emit UpdateRunningDocuments(this, _old, varDocsLink);
  }
}
