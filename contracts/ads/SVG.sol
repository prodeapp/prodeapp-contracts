// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

contract SVG {
    string private svg;
    bytes32 public itemID;
    bytes32 public proxyItemID;

    constructor() {}

    function initialize(
        bytes32 _itemID,
        bytes32 _proxyItemID,
        string memory _svg
    ) external {
        require(bytes(svg).length == 0, "SVG already set");
        require(bytes(_svg).length > 0, "SVG must not be empty");
        svg = _svg;
        itemID = _itemID;
        proxyItemID = _proxyItemID;
    }

    function getSVG(address _market, uint256 _tokenID) external view returns (string memory) {
        return svg;
    }
}
