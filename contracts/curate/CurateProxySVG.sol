// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "solidity-rlp/contracts/RLPReader.sol";
import './IGeneralizedTCR.sol';

contract CurateProxySVG {
	using RLPReader for RLPReader.RLPItem;
    using RLPReader for bytes;

    address public immutable gtcrClassic;

    /**
     *  @dev Constructor.
     *  @param _gtcrClassic Address of the arbitrator that is going to resolve Realitio disputes.
     */
    constructor(address _gtcrClassic) public {
        gtcrClassic = _gtcrClassic;
    }
	
	function decodeAddress(RLPReader.RLPItem memory rawAddress) internal pure returns(address) {
		return rawAddress.toAddress();
	}

	function isRegistered(bytes32 _itemID) external view returns(bool) {
		(
            bytes memory data,
            IGeneralizedTCR.Status status,
			uint256 numberOfRequests
        ) = IGeneralizedTCR(gtcrClassic).getItemInfo(_itemID);

		if (
			status == IGeneralizedTCR.Status.Registered ||
			status == IGeneralizedTCR.Status.ClearingRequested
		) {
			return true;
		} else {
			return false;
		}
	}

	function getAddress(bytes32 _itemID) external view returns(address) {
		(
            bytes memory data,
            IGeneralizedTCR.Status status,
			uint256 numberOfRequests
        ) = IGeneralizedTCR(gtcrClassic).getItemInfo(_itemID);

		if (
			status == IGeneralizedTCR.Status.Registered ||
			status == IGeneralizedTCR.Status.ClearingRequested
		) {
			RLPReader.RLPItem[] memory rlpData = data.toRlpItem().toList();
			return decodeAddress(rlpData[0]);
		} else {
			return address(0x0);
		}
	}
}