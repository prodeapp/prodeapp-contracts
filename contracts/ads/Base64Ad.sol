// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

contract Base64Ad {
    string private svg;

    constructor() {}

    function setSVG(string memory _svg) external {
        require(bytes(svg).length > 0, "SVG already set");
        require(bytes(_svg).length > 0, "SVG must not be empty");
        svg = _svg;
    }

    function getSVG() external view returns (string memory) {
        return svg;
    }
}
