// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./Base64AdFactory.sol";

interface ICurate {
    function addItem(bytes calldata _item) external payable;
}

interface ICurateProxy {
    function registerAd(bytes32 _contentItemID, bytes32 _technicalItemID)
        external
        returns (bytes32);
}

contract Base64Ad {
    string private svg;
    address public creator;
    bytes32 public itemID;
    bytes32 public proxyItemID;

    constructor() {}

    function initialize(address _creator, string memory _svg) external payable {
        require(bytes(svg).length == 0, "SVG already set");
        require(bytes(_svg).length > 0, "SVG must not be empty");
        svg = _svg;
        creator = _creator;

        bytes memory itemData = abi.encodePacked(bytes2(0xd694), address(this), bytes1(0x80));

        ICurate techincalCurate = ICurate(Base64AdFactory(msg.sender).technicalCurate());
        techincalCurate.addItem{value: msg.value}(itemData); // surplus is reimbursed

        ICurate contentCurate = ICurate(Base64AdFactory(msg.sender).contentCurate());
        contentCurate.addItem{value: msg.value}(itemData); // surplus is reimbursed

        itemID = keccak256(itemData);
        ICurateProxy curateProxy = ICurateProxy(Base64AdFactory(msg.sender).curateProxy());
        proxyItemID = curateProxy.registerAd(itemID, itemID);
    }

    function getSVG(address _market, uint256 _tokenID) external view returns (string memory) {
        return svg;
    }

    function withdraw() external {
        (bool success, ) = creator.call{value: address(this).balance}(new bytes(0));
        require(success, "Send XDAI failed");
    }

    receive() external payable {}
}
