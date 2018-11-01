pragma solidity ^0.4.24;

import "./access/Manageable.sol";


/**
 * @title Asset information.
 * @dev Stores information about a specified real asset.
 */
contract AssetInfo is Manageable {
  string public publicDocument;

  /**
   * Event for updated running documents logging.
   * @param newLink New link.
   */
  event UpdateDocument(
    string newLink
  );

  /**
   * @param _publicDocument A link to a zip file containing running documents of the asset.
   */
  constructor(string _publicDocument) public {
    publicDocument = _publicDocument;
  }

  /**
   * @dev Updates information about where to find new running documents of this asset.
   * @param _link A link to a zip file containing running documents of the asset.
   */
  function setPublicDocument(string _link) public onlyManager {
    publicDocument = _link;

    emit UpdateDocument(publicDocument);
  }
}
