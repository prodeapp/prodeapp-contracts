// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IMarket is IERC721 {
    function marketInfo()
        external
        view
        returns (
            uint16,
            uint16,
            address payable,
            string memory,
            string memory
        );

    function name() external view returns (string memory);

    function questionsHash() external view returns (bytes32);

    function resultSubmissionPeriodStart() external view returns (uint256);

    function closingTime() external view returns (uint256);

    function submissionTimeout() external view returns (uint256);

    function nextTokenID() external view returns (uint256);

    function totalPrize() external view returns (uint256);

    function totalAttributions() external view returns (uint256);

    function attributionBalance(address _attribution)
        external
        view
        returns (uint256);

    function managementReward() external view returns (uint256);

    function tokenIDtoTokenHash(uint256 _tokenID)
        external
        view
        returns (bytes32);

    function bets(bytes32 _tokenHash) external view returns (uint256);
}
