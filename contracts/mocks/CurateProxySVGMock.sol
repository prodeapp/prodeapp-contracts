// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

contract CurateProxySVGMock {
    mapping(bytes32 => address) private items;
    mapping(bytes32 => bool) private status;

    event newItemMapped(
        address indexed _svgAddress,
        bytes32 indexed _itemID,
        bytes32 _contentItemID,
        bytes32 _technicalItemID
    );

    constructor() public {}

    function setItem(
        bytes32 _itemID,
        address _address,
        bool _status
    ) external {
        if (items[_itemID] == address(0x0)) {
            // new item
            emit newItemMapped(
                _address,
                _itemID,
                keccak256(abi.encodePacked(address(0x0))),
                keccak256(abi.encodePacked(address(0x0)))
            );
        }
        items[_itemID] = _address;
        status[_itemID] = _status;
    }

    function registerAd(bytes32 _contentItemID, bytes32 _technicalItemID) external {
        bytes32 itemID = keccak256(abi.encode(_contentItemID, _technicalItemID));
        this.setItem(itemID, msg.sender, true);
    }

    function isRegistered(bytes32 _itemID) public view returns (bool) {
        return status[_itemID];
    }

    function getAddress(bytes32 _itemID) external view returns (address) {
        if (isRegistered(_itemID)) {
            return items[_itemID];
        } else {
            return address(0x0);
        }
    }
}
