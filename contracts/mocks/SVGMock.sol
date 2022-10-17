// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

contract SVGMock {
    string private svg;

    constructor() {}

    function setSVG(string memory _svg) external {
        require(bytes(svg).length == 0, "SVG already set");
        require(bytes(_svg).length > 0, "SVG must not be empty");
        svg = _svg;
    }

    function getSVG(address _market, uint256 _tokenID) external view returns (string memory) {
        return svg;
    }
}
