// SPDX-License-Identifier: MIT
// Mostly copyed from https://github.com/kleros/tcr/blob/master/contracts/GeneralizedTCR.sol
pragma solidity 0.6.12;

contract CentralizedCurate {

    /**
     *  @dev Emitted when a party makes a request, raises a dispute or when a request is resolved.
     *  @param _itemID The ID of the affected item.
     *  @param _requestIndex The index of the request. Always 0.
     *  @param _roundIndex The index of the round. Always 0.
     *  @param _disputed Whether the request is disputed. Always false
     *  @param _resolved Whether the request is executed. Always false
     */
    event ItemStatusChange(
      bytes32 indexed _itemID,
      uint indexed _requestIndex,
      uint indexed _roundIndex,
      bool _disputed,
      bool _resolved
    );

     enum Status {
        Absent, // The item is not in the registry.
        Registered, // The item is in the registry.
        RegistrationRequested, // The item has a request to be added to the registry.
        ClearingRequested // The item has a request to be removed from the registry.
    }

    struct Item {
        bytes data; // The data describing the item.
        Status status; // The current status of the item.
    }
    
    mapping(bytes32 => Item) public items; // Maps the item ID to its data in the form items[_itemID].

    constructor() public {}

    function addItem(bytes calldata _item) external payable {
        bytes32 itemID = keccak256(_item);
        require(items[itemID].status == Status.Absent, "Item must be absent to be added.");
        Item storage item = items[itemID];
        item.status =  Status.RegistrationRequested;
        item.data = _item;
        emit ItemStatusChange(itemID, 0, 0, false, false);
    }

    /** @dev Submit a request to remove an item from the list. Accepts enough ETH to cover the deposit, reimburses the rest.
     *  @param _itemID The ID of the item to remove.
     *  @param _evidence A link to an evidence using its URI. Ignored if not provided.
     */
    function removeItem(bytes32 _itemID,  string calldata _evidence) external payable {
        require(items[_itemID].status == Status.Registered, "Item must be registered to be removed.");
        Item storage item = items[_itemID];
        item.status = Status.Absent;
        emit ItemStatusChange(_itemID, 3, 0, false, false);
    }

    function registerItem(bytes32 _itemID) external {
        require(items[_itemID].status == Status.RegistrationRequested, "Item must be in registration Requested status");
        Item storage item = items[_itemID];
        item.status = Status.Registered;
        emit ItemStatusChange(_itemID, 1, 0, false, false);
    }
}