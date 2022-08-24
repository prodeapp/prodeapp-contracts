// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "solidity-rlp/contracts/RLPReader.sol";
import "./IGeneralizedTCR.sol";

contract CurateProxy {
    using RLPReader for RLPReader.RLPItem;
    using RLPReader for bytes;

    uint256 private constant HEX_OFFSET = 2;

    address public immutable gtcrClassic;

    struct Item {
        bool isInitialized;
        bool isRegistered;
    }

    struct HashData {
        bool isRegistered;
        uint248 startTimestamp;
        string title;
    }

    mapping(bytes32 => HashData) public hashData; // hashData[questionsHash]
    mapping(bytes32 => Item) public items; // items[itemID]
    mapping(bytes32 => bytes32[]) public itemsWithHash; // items[questionsHash]

    /**
     *  @dev Constructor.
     *  @param _gtcrClassic Address of the arbitrator that is going to resolve Realitio disputes.
     */
    constructor(address _gtcrClassic) public {
        gtcrClassic = _gtcrClassic;
    }

    function registerMarket(bytes32 _itemID) external {
        (
            bytes memory itemData,
            IGeneralizedTCR.Status status,
            uint256 numberOfRequests
        ) = IGeneralizedTCR(gtcrClassic).getItemInfo(_itemID);

        RLPReader.RLPItem[] memory rlpData = itemData.toRlpItem().toList();
        bytes32 questionsHash = decodeHash(rlpData[1]);

        if (
            status == IGeneralizedTCR.Status.Registered ||
            status == IGeneralizedTCR.Status.ClearingRequested
        ) {
            HashData storage data = hashData[questionsHash];
            data.title = decodeTitle(rlpData[0]);
            data.startTimestamp = uint248(decodeTimestamp(rlpData[2]));
            data.isRegistered = true;
            items[_itemID].isRegistered = true;
            if (!items[_itemID].isInitialized) {
                items[_itemID].isInitialized = true;
                itemsWithHash[questionsHash].push(_itemID);
            }
        } else {
            // Check if last successful request was for clearing
            // Request 0 is always the first registration attempt. We can skip it.
            for (
                uint256 requestID = numberOfRequests - 1;
                requestID > 0;
                requestID--
            ) {
                (
                    bool disputed,
                    ,
                    ,
                    bool resolved,
                    ,
                    ,
                    IGeneralizedTCR.Party ruling,
                    ,
                    ,
                    uint256 metaEvidenceID
                ) = IGeneralizedTCR(gtcrClassic).getRequestInfo(
                        _itemID,
                        requestID
                    );

                if (metaEvidenceID % 2 == 1) {
                    // Clearing request
                    if (
                        (!disputed && resolved) ||
                        (disputed &&
                            resolved &&
                            ruling == IGeneralizedTCR.Party.Requester)
                    ) {
                        // Clearing request was successful
                        items[_itemID].isRegistered = false;
                        for (
                            uint256 j = 0;
                            j < itemsWithHash[questionsHash].length;
                            j++
                        ) {
                            bytes32 id_j = itemsWithHash[questionsHash][j];
                            if (items[id_j].isRegistered) return;
                        }
                        hashData[questionsHash].isRegistered = false;
                        return;
                    }
                }
            }
        }
    }

    function decodeTitle(RLPReader.RLPItem memory rawTitle)
        internal
        pure
        returns (string memory)
    {
        return string(rawTitle.toBytes());
    }

    function decodeTimestamp(RLPReader.RLPItem memory rawTimestamp)
        internal
        pure
        returns (uint256)
    {
        return rawTimestamp.toUint();
    }

    function decodeHash(RLPReader.RLPItem memory rawHash)
        internal
        pure
        returns (bytes32 hash)
    {
        bytes memory bytesHash = rawHash.toBytes();
        require(bytesHash.length == 66, "Not bytes32");
        for (uint256 i = HEX_OFFSET; i < bytesHash.length; i++) {
            uint256 char = uint256(uint8(bytes1(bytesHash[i])));
            uint256 shift = 252 - (i - HEX_OFFSET) * 4;
            if (char >= 48 && char <= 57) {
                hash ^= bytes32((char - 48) << shift);
            } else if (char >= 65 && char <= 70) {
                hash ^= bytes32((char - 55) << shift);
            } else if (char >= 97 && char <= 102) {
                hash ^= bytes32((char - 87) << shift);
            } else {
                revert();
            }
        }
    }

    function isRegistered(bytes32 _questionsHash) external view returns (bool) {
        return hashData[_questionsHash].isRegistered;
    }

    function getTitle(bytes32 _questionsHash)
        external
        view
        returns (string memory)
    {
        return hashData[_questionsHash].title;
    }

    function getTimestamp(bytes32 _questionsHash)
        external
        view
        returns (uint256)
    {
        return uint256(hashData[_questionsHash].startTimestamp);
    }
}
