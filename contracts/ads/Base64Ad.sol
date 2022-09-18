// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./Base64AdFactory.sol";

interface ICurate {
    function addItem(bytes calldata _item) external payable;
}

interface ICurateProxy {
    function registerAd(bytes32 _contentItemID, bytes32 _technicalItemID) external;
}

contract Base64Ad {
    string private svg;
    address public creator;
    bytes32 public proxyItemID;

    constructor() {}

    function initialize(
        address _creator,
        string memory _ipfsLink,
        string memory _svg
    ) external payable {
        require(bytes(svg).length == 0, "SVG already set");
        require(bytes(_svg).length > 0, "SVG must not be empty");
        svg = _svg;
        creator = _creator;

        // TODO: calculate item calldata
        bytes memory itemData = "";

        ICurate techincalCurate = ICurate(Base64AdFactory(msg.sender).technicalCurate());
        techincalCurate.addItem{value: msg.value}(itemData); // surplus is reimbursed

        ICurate contentCurate = ICurate(Base64AdFactory(msg.sender).contentCurate());
        contentCurate.addItem{value: msg.value}(itemData); // surplus is reimbursed

        bytes32 itemID = keccak256(itemData);
        ICurateProxy curateProxy = ICurateProxy(Base64AdFactory(msg.sender).curateProxy());
        curateProxy.registerAd(itemID, itemID);

        proxyItemID = keccak256(abi.encode(itemID, itemID));
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
