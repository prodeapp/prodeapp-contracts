// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;


contract CurateProxySVGMock {

	mapping(bytes32 => address) private items;
	mapping(bytes32 => bool) private status;

    constructor() public { }

	function setItem(bytes32 _itemID, address _address, bool _status) external {
		items[_itemID] = _address;
		status[_itemID] = _status;
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
