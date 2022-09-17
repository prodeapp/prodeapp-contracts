// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "solidity-rlp/contracts/RLPReader.sol";
import "./IGeneralizedTCR.sol";

contract CurateProxySVG {
    using RLPReader for RLPReader.RLPItem;
    using RLPReader for bytes;

    struct Item {
        bytes32 contentItemID;
        bytes32 technicalItemID;
        address svgAddress;
    }

    IGeneralizedTCR public immutable gtcrContent;
    IGeneralizedTCR public immutable gtcrTechnical;

    mapping(bytes32 => Item) public hashToCurateIDs; // hashToCurateIDs[ID]

    event newItemMapped(
        address indexed _svgAddress,
        bytes32 indexed _itemID,
        bytes32 _contentItemID,
        bytes32 _technicalItemID
    );

    /**
     *  @dev Constructor.
     *  @param _gtcrContent Address of the Curate registry that holds ads compliant with the content moderation policy.
     *  @param _gtcrTechnical Address of the Curate registry that holds ads compliant with the technical policy.
     */
    constructor(IGeneralizedTCR _gtcrContent, IGeneralizedTCR _gtcrTechnical) public {
        gtcrContent = _gtcrContent;
        gtcrTechnical = _gtcrTechnical;
    }

    function decodeAddress(RLPReader.RLPItem memory rawAddress) internal pure returns (address) {
        return rawAddress.toAddress();
    }

    function registerAd(bytes32 _contentItemID, bytes32 _technicalItemID) external returns (bool) {
        bytes32 itemID = keccak256(abi.encode(_contentItemID, _technicalItemID));
        Item storage item = hashToCurateIDs[itemID];
        item.contentItemID = _contentItemID;
        item.technicalItemID = _technicalItemID;

        (bytes memory contentData, , ) = gtcrContent.getItemInfo(_contentItemID);
        (bytes memory technicalData, , ) = gtcrTechnical.getItemInfo(_technicalItemID);

        RLPReader.RLPItem[] memory contentRlpData = contentData.toRlpItem().toList();
        RLPReader.RLPItem[] memory technicalRlpData = technicalData.toRlpItem().toList();
        address contentAdr = decodeAddress(contentRlpData[0]);
        address technicalAdr = decodeAddress(technicalRlpData[0]);
        require(contentAdr == technicalAdr, "Addresses don't match");
        require(contentAdr != address(0x0), "Addresses not found");

        item.svgAddress = contentAdr;
        emit newItemMapped(contentAdr, itemID, _contentItemID, _technicalItemID);
    }

    function isRegistered(bytes32 _itemID) public view returns (bool) {
        Item storage item = hashToCurateIDs[_itemID];
        (, IGeneralizedTCR.Status contentStatus, ) = gtcrContent.getItemInfo(item.contentItemID);
        (, IGeneralizedTCR.Status technicalStatus, ) = gtcrTechnical.getItemInfo(
            item.technicalItemID
        );

        if (
            (contentStatus == IGeneralizedTCR.Status.Registered ||
                contentStatus == IGeneralizedTCR.Status.ClearingRequested) &&
            (technicalStatus == IGeneralizedTCR.Status.Registered ||
                technicalStatus == IGeneralizedTCR.Status.ClearingRequested)
        ) {
            return true;
        } else {
            return false;
        }
    }

    function getAddress(bytes32 _itemID) external view returns (address) {
        Item storage item = hashToCurateIDs[_itemID];
        if (isRegistered(_itemID)) {
            return item.svgAddress;
        } else {
            return address(0x0);
        }
    }
}
