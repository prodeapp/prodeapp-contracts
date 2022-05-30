// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "solidity-rlp/contracts/RLPReader.sol";

interface IGeneralizedTCR {
	/// @dev see https://github.com/kleros/tcr/blob/059372068ae3ed380e74d653b713f2a33a3e9551/contracts/GeneralizedTCR.sol
	enum Status {
        Absent, // The item is not in the registry.
        Registered, // The item is in the registry.
        RegistrationRequested, // The item has a request to be added to the registry.
        ClearingRequested // The item has a request to be removed from the registry.
    }

	enum Party {
        None, // Party per default when there is no challenger or requester. Also used for unconclusive ruling.
        Requester, // Party that made the request to change a status.
        Challenger // Party that challenges the request to change a status.
    }

	/** @dev Returns item's information. Includes length of requests array.
     *  @param _itemID The ID of the queried item.
     *  @return data The data describing the item.
     *  @return status The current status of the item.
     *  @return numberOfRequests Length of list of status change requests made for the item.
     */
    function getItemInfo(bytes32 _itemID)
        external view returns (
            bytes memory data,
            Status status,
            uint256 numberOfRequests
        );

	function getRequestInfo(bytes32 _itemID, uint256 _request)
        external
        view
        returns (
            bool disputed,
            uint256 disputeID,
            uint256 submissionTime,
            bool resolved,
            address payable[3] memory parties,
            uint256 numberOfRounds,
            Party ruling,
            address arbitrator,
            bytes memory arbitratorExtraData,
            uint256 metaEvidenceID
        );
}

contract CurateProxy {
	using RLPReader for RLPReader.RLPItem;
    using RLPReader for bytes;

	uint256 private constant HEX_OFFSET = 2;

    address public immutable gtcrClassic;

	struct Item {
		bool isInitialized;
		bool isRegistered;
	}

    mapping(bytes32 => bool) public isHashRegistered; // isRegistered[questionsHash]
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
            bytes memory data,
            IGeneralizedTCR.Status status,
			uint256 numberOfRequests
        ) = IGeneralizedTCR(gtcrClassic).getItemInfo(_itemID);

		bytes32 questionsHash = getHash(data);

		if (
			status == IGeneralizedTCR.Status.Registered ||
			status == IGeneralizedTCR.Status.ClearingRequested
		) {
			isHashRegistered[questionsHash] = true;
			items[_itemID].isRegistered = true;
			if (!items[_itemID].isInitialized) {
				items[_itemID].isInitialized = true;
				itemsWithHash[questionsHash].push(_itemID);
			}
		} else {
			// Check if last successful request was for clearing
			// Request 0 is always the first registration attempt. We can skip it.
			for (uint256 requestID = numberOfRequests - 1; requestID > 0; requestID--) {
				(
					bool disputed,,,
					bool resolved,,,
					IGeneralizedTCR.Party ruling,,,
					uint256 metaEvidenceID
				) = IGeneralizedTCR(gtcrClassic).getRequestInfo(_itemID, requestID);

				if (metaEvidenceID % 2 == 1) {
					// Clearing request
					if (
						!disputed && resolved ||
						disputed && resolved && ruling == IGeneralizedTCR.Party.Requester
					) {
						// Clearing request was successful
						items[_itemID].isRegistered = false;
						for (uint256 j = 0; j < itemsWithHash[questionsHash].length; j++) {
							bytes32 id_j = itemsWithHash[questionsHash][j];
							if (items[id_j].isRegistered) return;
						}
						isHashRegistered[questionsHash] = false;
						return;
					}
				}
			}
		}
	}

	function isRegistered(bytes32 _questionsHash) external view returns(bool) {
		return isHashRegistered[_questionsHash];
	}

	function getHash(bytes memory data) internal pure returns(bytes32 hash) {
		RLPReader.RLPItem memory rawHash = data.toRlpItem().toList()[0]; // the encoding of hash.
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
}